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

// Enhanced CORS configuration
const allowedOrigins = [
  'https://gt-3-d-frontend-83gl.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001'
];

// Add any additional origins from environment variable
if (process.env.CLIENT_ORIGIN) {
  const envOrigins = process.env.CLIENT_ORIGIN.split(',');
  allowedOrigins.push(...envOrigins);
}

console.log('🌐 Allowed CORS origins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Powered-By']
};

// Apply CORS middleware FIRST
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json());
app.use('/api/projects', projectRoutes);

// Health check endpoint with CORS headers
app.get('/health', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).json({ 
    status: 'OK', 
    service: 'Socket.IO Server',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    allowedOrigins: allowedOrigins,
    cors: 'enabled'
  });
});

// Socket.IO with STRICT CORS configuration
const io = socketIo(server, {
  cors: {
    origin: function(origin, callback) {
      // Allow requests with no origin
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('❌ Socket.IO CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true, // Allow Engine.IO v3 compatibility
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: {
    name: 'io',
    path: '/',
    httpOnly: true,
    sameSite: 'none',
    secure: true
  }
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

// Add middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id, 'Origin:', socket.handshake.headers.origin);

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

  socket.on('disconnect', (reason) => {
    console.log('User disconnected:', socket.id, 'Reason:', reason);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Health check available at: http://localhost:${PORT}/health`);
  console.log(`🌐 Allowed CORS origins:`, allowedOrigins);
});