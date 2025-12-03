const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// MongoDB connection and model
let isDbConnected = false;
const messageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Connect to MongoDB with fallback
async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/whatsapp-clone', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected successfully');
    isDbConnected = true;
  } catch (error) {
    console.log('⚠️  MongoDB connection failed, using in-memory storage');
    console.log('   Error:', error.message);
    isDbConnected = false;
  }
}

// In-memory storage for fallback
let memoryMessages = [];
let activeUsers = new Map(); // username -> { id, joinedAt }

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/messages', async (req, res) => {
  try {
    if (isDbConnected) {
      const messages = await Message.find()
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();
      res.json({ messages: messages.reverse(), source: 'database' });
    } else {
      res.json({ 
        messages: memoryMessages.slice(-50), 
        source: 'memory' 
      });
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.json({ 
      messages: memoryMessages.slice(-50), 
      source: 'memory-fallback' 
    });
  }
});

app.get('/api/users', (req, res) => {
  const users = Array.from(activeUsers.entries()).map(([username, data]) => ({
    username,
    joinedAt: data.joinedAt
  }));
  res.json({ users });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`👤 User connected: ${socket.id}`);

  // User joins the chat
  socket.on('join', (username) => {
    if (!username || username.trim() === '') {
      socket.emit('error', 'Username is required');
      return;
    }

    socket.username = username.trim();
    activeUsers.set(socket.username, {
      id: socket.id,
      joinedAt: new Date()
    });

    // Notify all users about the new user
    socket.broadcast.emit('user-joined', {
      username: socket.username,
      timestamp: new Date()
    });

    // Send updated user list to all clients
    const userList = Array.from(activeUsers.keys());
    io.emit('users-update', userList);

    console.log(`✅ ${socket.username} joined the chat`);
  });

  // Handle new messages
  socket.on('send-message', async (data) => {
    if (!socket.username) {
      socket.emit('error', 'You must join first');
      return;
    }

    const messageData = {
      username: socket.username,
      message: data.message.trim(),
      timestamp: new Date()
    };

    if (!messageData.message) {
      return; // Don't send empty messages
    }

    // Store in memory
    memoryMessages.push(messageData);
    
    // Keep only last 100 messages in memory
    if (memoryMessages.length > 100) {
      memoryMessages = memoryMessages.slice(-100);
    }

    // Try to save to database if connected
    if (isDbConnected) {
      try {
        const dbMessage = new Message(messageData);
        await dbMessage.save();
      } catch (error) {
        console.error('Error saving to database:', error);
      }
    }

    // Broadcast message to all connected clients
    io.emit('new-message', messageData);
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    if (socket.username) {
      socket.broadcast.emit('user-typing', {
        username: socket.username,
        isTyping: data.isTyping
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.username) {
      activeUsers.delete(socket.username);
      
      // Notify all users about the user leaving
      socket.broadcast.emit('user-left', {
        username: socket.username,
        timestamp: new Date()
      });

      // Send updated user list
      const userList = Array.from(activeUsers.keys());
      io.emit('users-update', userList);

      console.log(`❌ ${socket.username} left the chat`);
    }
  });
});

// Initialize database connection
connectDB();

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
});
