require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const cors = require('cors');
const projectRoutes = require('./routes/Projects');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "http://localhost:3000" } // frontend URL
});

app.use(cors());
app.use(express.json());
app.use('/api/projects', projectRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Socket.IO logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinProject', (projectId) => {
    socket.join(projectId);
  });

  socket.on('annotationAdded', (data) => {
    io.to(data.projectId).emit('newAnnotation', data.annotation);
  });

  socket.on('chatMessage', (data) => {
    io.to(data.projectId).emit('newChatMessage', data.message);
  });

  socket.on('cameraUpdate', (data) => {
    io.to(data.projectId).emit('cameraSync', data.camera);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));