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
  assignedQuestionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssignedQuestion'
  },
  selectedAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 4
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  responseTime: {
    type: Number,
    required: true,
    min: 0,
    description: 'Response time in milliseconds'
  },
  answeredAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['answered', 'skipped'],
    default: 'answered'
  }
});

// Index for faster queries
responseSchema.index({ studentId: 1, questionId: 1 });
responseSchema.index({ classId: 1 });
responseSchema.index({ assignedQuestionId: 1 });

module.exports = mongoose.model('Response', responseSchema);

