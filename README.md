# WhatsApp Clone - Real-time Chat Application

A simple but fully functional WhatsApp-like chat system built for development purposes. Features real-time messaging, user management, typing indicators, and automatic fallback from MongoDB to in-memory storage.

## Features

- **Real-time messaging** with Socket.IO
- **User join/leave notifications** 
- **Active users list** with live updates
- **Typing indicators** when users are typing
- **MongoDB integration** with automatic in-memory fallback
- **Responsive design** that works on both mobile and desktop
- **WhatsApp-like UI** with Tailwind CSS
- **Message history** persisted in database or memory
- **Connection status** indicator
- **Auto-resizing textarea** for message input

## Tech Stack

### Backend
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **MongoDB** (with Mongoose) - Database (with in-memory fallback)
- **CORS** - Cross-origin resource sharing

### Frontend
- **HTML5** - Structure
- **Tailwind CSS** - Styling and responsiveness  
- **Vanilla JavaScript** - Client-side functionality
- **Font Awesome** - Icons
- **Socket.IO Client** - Real-time communication

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (optional - app works without it)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   Or for production:
   ```bash
   npm start
   ```

3. **Open your browser and visit:**
   ```
   http://localhost:3000
   ```

## Usage

1. **Join the chat:** Enter a username (up to 20 characters) when prompted
2. **Send messages:** Type in the input field and press Enter or click Send
3. **See active users:** View the list of online users in the sidebar
4. **Real-time updates:** See when users join, leave, and are typing
5. **Mobile support:** Works seamlessly on mobile devices

## Database Configuration

The app automatically tries to connect to MongoDB at:
```
mongodb://localhost:27017/whatsapp-clone
```

If MongoDB is not available, the app automatically falls back to in-memory storage. You can:

- **Install MongoDB locally** for persistence
- **Use MongoDB Atlas** by updating the connection string in `server.js`
- **Use in-memory only** - no setup required, data resets on server restart

## Project Structure

```
/
├── public/           # Frontend files
│   ├── index.html   # Main HTML file
│   ├── app.js       # Client-side JavaScript
│   └── style.css    # Custom CSS styles
├── server.js        # Express server with Socket.IO
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

## API Endpoints

- `GET /` - Serves the main chat interface
- `GET /api/messages` - Returns recent chat messages
- `GET /api/users` - Returns list of active users

## Socket Events

### Client to Server
- `join` - User joins the chat
- `send-message` - Send a new message
- `typing` - Typing indicator status

### Server to Client  
- `users-update` - Updated list of active users
- `user-joined` - User joined notification
- `user-left` - User left notification
- `new-message` - New message received
- `user-typing` - Typing indicator update

## Development Notes

- **Development only:** This is built for development/learning purposes
- **No authentication:** Users are identified only by username
- **No persistence:** In-memory messages are lost on server restart (unless MongoDB is connected)
- **No production optimizations:** Missing rate limiting, input validation, etc.
- **Simple error handling:** Basic error display and logging

## Customization

### Changing the MongoDB Connection
Edit the connection string in `server.js`:
```javascript
await mongoose.connect('your-mongodb-connection-string', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
```

### Changing the Port
Set the `PORT` environment variable or modify `server.js`:
```javascript
const PORT = process.env.PORT || 3000;
```

### Styling
- Main styles are in `public/style.css`
- Tailwind classes are used throughout `public/index.html`
- Colors and styling can be customized in the CSS file

## License

This project is for educational/development purposes. Feel free to use and modify as needed.

## Contributing

This is a simple development project. Feel free to fork and enhance with additional features like:
- User authentication
- Private messaging
- File uploads
- Message encryption
- Push notifications
- Better error handling
- Rate limiting
- Message history pagination
