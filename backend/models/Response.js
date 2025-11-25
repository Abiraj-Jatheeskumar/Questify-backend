const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  selectedAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  responseTime: {
    type: Number,
    required: true,
    min: 0
  },
  answeredAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
responseSchema.index({ studentId: 1, questionId: 1 });
responseSchema.index({ classId: 1 });

module.exports = mongoose.model('Response', responseSchema);

