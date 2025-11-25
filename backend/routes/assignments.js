const express = require('express');
const router = express.Router();
const AssignedQuestion = require('../models/AssignedQuestion');
const { authenticate } = require('../middleware/auth');

// Get assignments (for admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const assignments = await AssignedQuestion.find({ isActive: true })
      .populate('classId', 'name')
      .populate('questionIds')
      .populate('assignedBy', 'name email')
      .sort({ assignedAt: -1 });
    res.json(assignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

