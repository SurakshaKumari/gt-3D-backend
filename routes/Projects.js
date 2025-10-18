const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const Project = require('../models/Project');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const ensureUploadsDir = async () => {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
};
ensureUploadsDir();

router.get('/', async (req, res) => {
  try {
    const projects = await Project.find();
    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.get('/filter', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      status,
      userId
    } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (userId) filter.userId = userId;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const projects = await Project.find(filter).sort(sort).skip(skip).limit(limitNum);
    const total = await Project.countDocuments(filter);

    res.json({
      success: true,
      data: projects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.post('/', async (req, res) => {
  try {
    const project = new Project(req.body);
    await project.save();
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.put('/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (project.modelPath) {
      try {
        await fs.unlink(path.join(UPLOADS_DIR, project.modelPath));
      } catch (e) {
        console.warn('Failed to delete model file:', e.message);
      }
    }

    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `model-${req.params.id}-${uniqueSuffix}.stl`);
  }
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/octet-stream' || 
        file.originalname.toLowerCase().endsWith('.stl')) {
      cb(null, true);
    } else {
      cb(new Error('Only STL files are allowed'), false);
    }
  }
});

router.post('/:id/model', upload.single('model'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { modelPath: req.file.filename },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ 
      success: true, 
      data: { 
        modelUrl: `/api/projects/${req.params.id}/model`,
        filename: req.file.filename 
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/model', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project || !project.modelPath) {
      return res.status(404).json({ success: false, error: 'Model not found' });
    }

    const filePath = path.join(UPLOADS_DIR, project.modelPath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('File send error:', err);
        res.status(404).json({ success: false, error: 'Model file not found' });
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.post('/:id/annotation', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $push: { annotations: req.body } },
      { new: true }
    );
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id/scene', async (req, res) => {
  try {
    const { modelState, annotations } = req.body;

    const updateFields = {};
    if (modelState) updateFields.modelState = modelState;
    if (annotations) updateFields.annotations = annotations;

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.get('/:id/chat', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ 
      success: true, 
      data: project.chat || [] 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.post('/:id/chat', async (req, res) => {
  try {
    const { text, userId, userName } = req.body;
    
    if (!text || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Text and userId are required' 
      });
    }

    const message = {
      id: Date.now().toString(),
      text,
      userId,
      userName: userName || 'Anonymous',
      timestamp: new Date()
    };

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $push: { chat: message } },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ 
      success: true, 
      data: message 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.delete('/:id/chat', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: { chat: [] } },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ 
      success: true, 
      message: 'Chat cleared successfully' 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id/chat/:messageId', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $pull: { chat: { id: req.params.messageId } } },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ 
      success: true, 
      message: 'Message deleted successfully' 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;