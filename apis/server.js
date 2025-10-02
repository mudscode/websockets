const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 New socket connected:", socket.id);

  socket.on("register", (data) => {
    onlineUsers.set(socket.id, {
      username: data.username,
      userId: socket.id,
    });

    console.log(`✅ ${data.username} joined (${socket.id})`);

    const usersList = Array.from(onlineUsers.entries()).map(([id, user]) => ({
      socketId: id,
      username: user.username,
    }));

    socket.emit("users_list", usersList);

    socket.broadcast.emit("user_joined", {
      socketId: socket.id,
      username: data.username,
    });
  });

  socket.on("private_message", (data) => {
    const sender = onlineUsers.get(socket.id);
    console.log(`📨 Message from ${sender.username} to ${data.toSocketId}`);

    io.to(data.toSocketId).emit("receive_message", {
      from: socket.id,
      fromUsername: sender.username,
      message: data.message,
      timestamp: Date.now(),
    });

    socket.emit("message_sent", {
      to: data.toSocketId,
      message: data.message,
      timestamp: Date.now(),
    });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log(`❌ ${user.username} left (${socket.id})`);
      onlineUsers.delete(socket.id);

      socket.broadcast.emit("user_left", {
        socketId: socket.id,
        username: user.username,
      });
    }
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log("🚀 WebSocket server running on http://localhost:4000");
});
