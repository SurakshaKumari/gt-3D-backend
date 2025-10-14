const mongoose = require('mongoose');

const AnnotationSchema = new mongoose.Schema({
  position: { x: Number, y: Number, z: Number },
  text: String,
  userId: String,
  createdAt: { type: Date, default: Date.now }
});

const ProjectSchema = new mongoose.Schema({
  title: String,
  ownerId: String,
  annotations: [AnnotationSchema],
  camera: {
    position: { x: Number, y: Number, z: Number },
    target: { x: Number, y: Number, z: Number }
  },
  modelUrl: String, // optional: for uploaded STL/STEP
  chat: [{ user: String, message: String, timestamp: Date }]
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);