// models/Project.js
const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  title: String,
  description: String,
  ownerId: String,
  userId: String,
  status: { type: String, default: 'active' },
  modelUrl:String,
   modelPath: String, 
  modelState: {
    position: { 
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      z: { type: Number, default: 0 }
    },
    rotation: { 
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      z: { type: Number, default: 0 }
    },
    scale: { 
      x: { type: Number, default: 1 },
      y: { type: Number, default: 1 },
      z: { type: Number, default: 1 }
    },
    mode: { type: String, default: 'translate' }
  },
  
  annotations: [{
    id: String,
    position: { 
      x: Number, 
      y: Number, 
      z: Number 
    },
    text: String,
    userId: String,
    userName: String,
    createdAt: { type: Date, default: Date.now }
  }],

 
  chat: [{
    id: String,
    text: String,
    userId: String,
    userName: String,
    timestamp: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


ProjectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Project', ProjectSchema);