const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: "https://websockets-git-main-mudscodes-projects.vercel.app",
  credentials: true,
}));

const server = http.createServer(app);

const io = new Server(server, {
  transports: ["websocket"],
  cors: {
    origin: "https://websockets-git-main-mudscodes-projects.vercel.app",
    credentials: true,
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

  socket.on("disconnect", () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      socket.broadcast.emit("user_left", {
        socketId: socket.id,
        username: user.username,
      });
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log("🚀 WebSocket server running on port", PORT);
});
