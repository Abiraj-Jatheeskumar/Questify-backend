const express = require('express');
const router = express.Router();
const Response = require('../models/Response');
const { authenticate } = require('../middleware/auth');

// Get responses (for admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const { classId, studentId, questionId } = req.query;
    const filter = {};

    if (classId) filter.classId = classId;
    if (studentId) filter.studentId = studentId;
    if (questionId) filter.questionId = questionId;

    const responses = await Response.find(filter)
      .populate('studentId', 'name email')
      .populate('questionId', 'question options correctAnswer')
      .populate('classId', 'name')
      .sort({ answeredAt: -1 });

    res.json(responses);
  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

