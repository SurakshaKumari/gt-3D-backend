require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const cors = require('cors');
const projectRoutes = require('./routes/Projects');
const Project = require('./models/Project'); 

const app = express();
const server = http.createServer(app);

// Consistent CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/projects', projectRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'Socket.IO Server',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Socket.IO with production settings
const io = socketIo(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinProject', (projectId) => {
    socket.join(projectId);
    console.log(`User ${socket.id} joined project ${projectId}`);
  });

  socket.on('annotationAdded', async (data) => {
    try {
      console.log('Annotation received:', data);
      const project = await Project.findByIdAndUpdate(
        data.projectId,
        { $push: { annotations: data.annotation } },
        { new: true }
      );
      
      if (project) {
        console.log('Annotation saved to database');
        socket.to(data.projectId).emit('newAnnotation', data.annotation);
      }
    } catch (error) {
      console.error('Error saving annotation:', error);
    }
  });

  socket.on('chatMessage', async (data) => {
    try {
      console.log('Chat message received:', data);
      
      const { projectId, message } = data;
      const project = await Project.findByIdAndUpdate(
        projectId,
        { $push: { chat: message } },
        { new: true }
      );

      if (project) {
        console.log('Chat message saved to database');
        io.to(projectId).emit('newChatMessage', message);
      } else {
        console.error('Project not found for chat message');
      }
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  });

  socket.on('modelTransform', async (data) => {
    try {
      console.log('Model transform received:', data);
      
      const { projectId, modelState } = data;
      const project = await Project.findByIdAndUpdate(
        projectId,
        { modelState: modelState },
        { new: true }
      );

      if (project) {
        console.log('Model state saved to database');
        socket.to(projectId).emit('modelUpdated', modelState);
      }
    } catch (error) {
      console.error('Error saving model transform:', error);
    }
  });

  socket.on('cameraUpdate', async (data) => {
    try {
      const { projectId, cameraState } = data;
      socket.to(projectId).emit('cameraSync', cameraState);
    } catch (error) {
      console.error('Error handling camera update:', error);
    }
  });

  socket.on('userJoined', (data) => {
    const { projectId, user } = data;
    console.log(`User ${user.name} joined project ${projectId}`);
    socket.to(projectId).emit('userJoined', {
      user: user,
      message: `${user.name} joined the project`
    });
  });

  socket.on('userLeft', (data) => {
    const { projectId, user } = data;
    console.log(`User ${user.name} left project ${projectId}`);
    socket.to(projectId).emit('userLeft', {
      user: user,
      message: `${user.name} left the project`
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Health check available at: http://localhost:${PORT}/health`);
});