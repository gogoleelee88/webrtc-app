const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users
const users = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining
  socket.on('join-room', (roomId, userId) => {
    console.log(`User ${userId} joined room ${roomId}`);
    socket.join(roomId);
    users.set(socket.id, { userId, roomId });
    
    // Notify other users in the room
    socket.to(roomId).emit('user-connected', userId);
  });

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    socket.to(data.roomId).emit('offer', {
      offer: data.offer,
      userId: data.userId
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', {
      answer: data.answer,
      userId: data.userId
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.roomId).emit('ice-candidate', {
      candidate: data.candidate,
      userId: data.userId
    });
  });

  // 채팅 메시지 처리
  socket.on('chat-message', (data) => {
    socket.to(data.roomId).emit('chat-message', {
      message: data.message,
      userId: data.userId,
      timestamp: new Date().toISOString()
    });
  });

  // 연결 해제 처리
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`User ${user.userId} disconnected from room ${user.roomId}`);
      socket.to(user.roomId).emit('user-disconnected', user.userId);
      users.delete(socket.id);
    }
  });
});

// 기본 라우트
app.get('/', (req, res) => {
  res.send(`
    <h1>WebRTC 서버가 실행 중입니다</h1>
    <p>포트: ${PORT}</p>
    <p>클라이언트를 연결하려면 public 폴더에 HTML 파일을 추가하세요.</p>
  `);
});

// 서버 시작
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`http://localhost:${PORT} 에서 접속하세요`);
});