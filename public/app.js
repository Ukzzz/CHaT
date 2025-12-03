// WhatsApp Clone - Client Side JavaScript
class ChatApp {
    constructor() {
        this.socket = io();
        this.currentUser = null;
        this.isTyping = false;
        this.typingTimer = null;
        this.typingUsers = new Set();
        
        // DOM elements
        this.elements = {
            joinModal: document.getElementById('joinModal'),
            joinForm: document.getElementById('joinForm'),
            usernameInput: document.getElementById('usernameInput'),
            usernameLength: document.getElementById('usernameLength'),
            currentUsername: document.getElementById('currentUsername'),
            usersList: document.getElementById('usersList'),
            userCount: document.getElementById('userCount'),
            messagesContainer: document.getElementById('messagesContainer'),
            messageForm: document.getElementById('messageForm'),
            messageInput: document.getElementById('messageInput'),
            sendButton: document.getElementById('sendButton'),
            welcomeMessage: document.getElementById('welcomeMessage'),
            typingIndicator: document.getElementById('typingIndicator'),
            connectionStatus: document.getElementById('connectionStatus'),
            storageMode: document.getElementById('storageMode')
        };
        
        this.initializeApp();
    }
    
    initializeApp() {
        this.setupEventListeners();
        this.setupSocketListeners();
        this.autoResizeTextarea();
        
        // Show join modal on load
        this.elements.joinModal.classList.remove('hidden');
        this.elements.usernameInput.focus();
    }
    
    setupEventListeners() {
        // Join form
        this.elements.joinForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.joinChat();
        });
        
        // Username length counter
        this.elements.usernameInput.addEventListener('input', (e) => {
            this.elements.usernameLength.textContent = e.target.value.length;
        });
        
        // Message form
        this.elements.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // Typing indicators
        this.elements.messageInput.addEventListener('input', () => {
            this.handleTyping();
        });
        
        // Enter key handling for textarea
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Focus message input when clicking on chat area
        this.elements.messagesContainer.addEventListener('click', () => {
            this.elements.messageInput.focus();
        });
    }
    
    setupSocketListeners() {
        // Connection status
        this.socket.on('connect', () => {
            console.log('✅ Connected to server');
            this.updateConnectionStatus(true);
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
            this.updateConnectionStatus(false);
        });
        
        // User events
        this.socket.on('users-update', (users) => {
            this.updateUsersList(users);
        });
        
        this.socket.on('user-joined', (data) => {
            this.addSystemMessage(`${data.username} joined the chat`, data.timestamp);
        });
        
        this.socket.on('user-left', (data) => {
            this.addSystemMessage(`${data.username} left the chat`, data.timestamp);
        });
        
        // Message events
        this.socket.on('new-message', (data) => {
            this.addMessage(data);
            this.hideWelcomeMessage();
        });
        
        // Typing events
        this.socket.on('user-typing', (data) => {
            this.handleUserTyping(data);
        });
        
        // Error handling
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showError(error);
        });
    }
    
    joinChat() {
        const username = this.elements.usernameInput.value.trim();
        
        if (!username) {
            this.showError('Please enter a username');
            return;
        }
        
        if (username.length > 20) {
            this.showError('Username must be 20 characters or less');
            return;
        }
        
        this.currentUser = username;
        this.elements.currentUsername.textContent = username;
        
        // Hide modal and join chat
        this.elements.joinModal.classList.add('hidden');
        this.elements.messageInput.focus();
        
        // Emit join event
        this.socket.emit('join', username);
        
        // Load previous messages
        this.loadMessages();
    }
    
    async loadMessages() {
        try {
            const response = await fetch('/api/messages');
            const data = await response.json();
            
            // Update storage mode indicator
            this.updateStorageMode(data.source);
            
            // Clear existing messages and add loaded ones
            this.clearMessages();
            data.messages.forEach(msg => this.addMessage(msg, false));
            
            if (data.messages.length > 0) {
                this.hideWelcomeMessage();
            }
            
            this.scrollToBottom();
        } catch (error) {
            console.error('Failed to load messages:', error);
            this.showError('Failed to load chat history');
        }
    }
    
    sendMessage() {
        const message = this.elements.messageInput.value.trim();
        
        if (!message) return;
        
        // Clear typing indicator
        this.clearTyping();
        
        // Send message
        this.socket.emit('send-message', { message });
        
        // Clear input
        this.elements.messageInput.value = '';
        this.autoResizeTextarea();
        this.elements.messageInput.focus();
    }
    
    addMessage(data, animate = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message flex ${data.username === this.currentUser ? 'sent justify-end' : 'received justify-start'}`;
        
        if (animate) {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(10px)';
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Message text
        const messageText = document.createElement('div');
        messageText.textContent = data.message;
        messageText.style.wordBreak = 'break-word';
        
        // Timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'message-time';
        timestamp.textContent = this.formatTime(new Date(data.timestamp));
        
        contentDiv.appendChild(messageText);
        contentDiv.appendChild(timestamp);
        messageDiv.appendChild(contentDiv);
        
        this.elements.messagesContainer.appendChild(messageDiv);
        
        if (animate) {
            // Trigger animation
            requestAnimationFrame(() => {
                messageDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                messageDiv.style.opacity = '1';
                messageDiv.style.transform = 'translateY(0)';
            });
        }
        
        this.scrollToBottom();
    }
    
    addSystemMessage(text, timestamp) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = `
            <i class="fas fa-info-circle mr-2"></i>
            ${text}
        `;
        
        messageDiv.appendChild(contentDiv);
        this.elements.messagesContainer.appendChild(messageDiv);
        
        this.hideWelcomeMessage();
        this.scrollToBottom();
    }
    
    updateUsersList(users) {
        this.elements.userCount.textContent = users.length;
        this.elements.usersList.innerHTML = '';
        
        users.forEach(username => {
            if (username === this.currentUser) return;
            
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item flex items-center';
            
            userDiv.innerHTML = `
                <div class="user-avatar">
                    ${username.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1">
                    <div class="font-semibold text-gray-800">${username}</div>
                    <div class="text-xs text-gray-500">Online</div>
                </div>
                <div class="text-whatsapp-green">
                    <i class="fas fa-circle text-xs"></i>
                </div>
            `;
            
            this.elements.usersList.appendChild(userDiv);
        });
        
        if (users.length === 1) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'p-4 text-center text-gray-500 text-sm';
            emptyDiv.textContent = 'No other users online';
            this.elements.usersList.appendChild(emptyDiv);
        }
    }
    
    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.emit('typing', { isTyping: true });
        }
        
        // Clear existing timer
        clearTimeout(this.typingTimer);
        
        // Set new timer to stop typing
        this.typingTimer = setTimeout(() => {
            this.clearTyping();
        }, 1000);
    }
    
    clearTyping() {
        if (this.isTyping) {
            this.isTyping = false;
            this.socket.emit('typing', { isTyping: false });
        }
        
        clearTimeout(this.typingTimer);
    }
    
    handleUserTyping(data) {
        if (data.isTyping) {
            this.typingUsers.add(data.username);
        } else {
            this.typingUsers.delete(data.username);
        }
        
        this.updateTypingIndicator();
    }
    
    updateTypingIndicator() {
        const typingArray = Array.from(this.typingUsers);
        
        if (typingArray.length === 0) {
            this.elements.typingIndicator.classList.add('hidden');
            return;
        }
        
        let text;
        if (typingArray.length === 1) {
            text = `${typingArray[0]} is typing`;
        } else if (typingArray.length === 2) {
            text = `${typingArray[0]} and ${typingArray[1]} are typing`;
        } else {
            text = `${typingArray[0]} and ${typingArray.length - 1} others are typing`;
        }
        
        this.elements.typingIndicator.querySelector('.typing-text').textContent = typingArray[0];
        this.elements.typingIndicator.classList.remove('hidden');
    }
    
    updateConnectionStatus(connected) {
        const icon = this.elements.connectionStatus.querySelector('i');
        
        if (connected) {
            icon.className = 'fas fa-circle text-green-400';
            icon.title = 'Connected';
            icon.classList.remove('disconnected');
        } else {
            icon.className = 'fas fa-circle text-red-400';
            icon.title = 'Disconnected';
            icon.classList.add('disconnected');
        }
    }
    
    updateStorageMode(source) {
        const mode = source === 'database' ? 'Database' : 'Memory';
        this.elements.storageMode.textContent = `${mode} Mode`;
        this.elements.storageMode.className = `text-xs px-2 py-1 rounded-full ${source === 'database' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`;
    }
    
    hideWelcomeMessage() {
        this.elements.welcomeMessage.style.opacity = '0';
        setTimeout(() => {
            this.elements.welcomeMessage.style.display = 'none';
        }, 300);
    }
    
    clearMessages() {
        this.elements.messagesContainer.innerHTML = `
            <div id="welcomeMessage" class="text-center py-8">
                <div class="bg-white rounded-lg p-6 inline-block shadow-sm">
                    <i class="fas fa-comments text-4xl text-whatsapp-green mb-3"></i>
                    <h3 class="font-semibold text-gray-800 mb-2">Welcome to the Chat!</h3>
                    <p class="text-gray-600 text-sm">Start a conversation by typing a message below</p>
                </div>
            </div>
        `;
        this.elements.welcomeMessage = document.getElementById('welcomeMessage');
    }
    
    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }
    
    autoResizeTextarea() {
        const textarea = this.elements.messageInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
    
    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }
    
    showError(message) {
        // Simple error display - could be enhanced with a toast notification
        alert(message);
    }
}

// Mobile sidebar toggle
function toggleSidebar() {
    const sidebar = document.querySelector('.w-full.md\\:w-1\\/3');
    sidebar.classList.toggle('sidebar');
    sidebar.classList.toggle('open');
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
