// src/App.jsx
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

let socket;

function App() {
  const [currentStep, setCurrentStep] = useState('login'); // 'login', 'users', 'chat'
  const [username, setUsername] = useState('');
  const [mySocketId, setMySocketId] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {

    const socket = io("https://websockets-278v.onrender.com", {
        transports: ["websocket"],
        withCredentials: true,
    });

    socket.on('connect', () => {
      setMySocketId(socket.id);
      console.log('Connected:', socket.id);
    });

    socket.on('users_list', (users) => {
      // Filter out self
      const otherUsers = users.filter(u => u.socketId !== socket.id);
      setOnlineUsers(otherUsers);
    });

    socket.on('user_joined', (user) => {
      setOnlineUsers(prev => [...prev, user]);
    });

    socket.on('user_left', (user) => {
      setOnlineUsers(prev => prev.filter(u => u.socketId !== user.socketId));
      
      // If we were chatting with this user, go back to users list
      if (selectedUser?.socketId === user.socketId) {
        setCurrentStep('users');
        setSelectedUser(null);
        setMessages([]);
      }
    });

    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, {
        from: data.fromUsername,
        message: data.message,
        timestamp: data.timestamp,
        type: 'received'
      }]);
    });

    socket.on('message_sent', (data) => {
      setMessages(prev => [...prev, {
        from: 'You',
        message: data.message,
        timestamp: data.timestamp,
        type: 'sent'
      }]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    // Auto scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      socket.emit('register', { username: username.trim() });
      setCurrentStep('users');
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setMessages([]);
    setCurrentStep('chat');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() && selectedUser) {
      socket.emit('private_message', {
        toSocketId: selectedUser.socketId,
        message: messageInput.trim()
      });
      setMessageInput('');
    }
  };

  const handleBackToUsers = () => {
    setCurrentStep('users');
    setSelectedUser(null);
    setMessages([]);
  };

  // LOGIN SCREEN
  if (currentStep === 'login') {
    return (
      <div className="app">
        <div className="login-container">
          <div className="login-box">
            <h1>💬 WebSocket Chat</h1>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                placeholder="Enter your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
              <button type="submit">Join Chat</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'users') {
    return (
      <div className="app">
        <div className="users-container">
          <div className="users-header">
            <h2>Welcome, {username}!</h2>
            <p className="user-id">Your ID: {mySocketId?.slice(0, 8)}</p>
          </div>
          
          <div className="users-list">
            <h3>Online Users ({onlineUsers.length})</h3>
            {onlineUsers.length === 0 ? (
              <div className="no-users">
                <p>No other users online</p>
                <p className="hint">Open another browser tab to test!</p>
              </div>
            ) : (
              onlineUsers.map(user => (
                <div 
                  key={user.socketId} 
                  className="user-item"
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="user-avatar">{user.username[0].toUpperCase()}</div>
                  <div className="user-info">
                    <div className="user-name">{user.username}</div>
                    <div className="user-status">🟢 Online</div>
                  </div>
                  <div className="chat-arrow">→</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // CHAT SCREEN
  if (currentStep === 'chat') {
    return (
      <div className="app">
        <div className="chat-container">
          <div className="chat-header">
            <button className="back-btn" onClick={handleBackToUsers}>←</button>
            <div className="chat-user-info">
              <div className="chat-avatar">{selectedUser.username[0].toUpperCase()}</div>
              <div>
                <div className="chat-username">{selectedUser.username}</div>
                <div className="chat-status">🟢 Online</div>
              </div>
            </div>
          </div>

          <div className="messages-area">
            {messages.length === 0 ? (
              <div className="no-messages">
                <p>No messages yet</p>
                <p className="hint">Say hello to {selectedUser.username}!</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className={`message ${msg.type}`}>
                  <div className="message-content">
                    <div className="message-text">{msg.message}</div>
                    <div className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="message-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              autoFocus
            />
            <button type="submit">Send</button>
          </form>
        </div>
      </div>
    );
  }
}

export default App;