const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const { authenticate } = require('../middleware/auth');

// Get all classes (for student to see their classes)
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'student') {
      const classes = await Class.find({ _id: { $in: req.user.classIds } })
        .populate('students', 'name email');
      res.json(classes);
    } else {
      const classes = await Class.find().populate('students', 'name email');
      res.json(classes);
    }
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

