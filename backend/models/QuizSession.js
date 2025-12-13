const mongoose = require('mongoose');

const quizSessionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssignedQuestion',
    required: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  questionsAnswered: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  startedAt: {
    type: Date,
    default: null
  },
  lastActivityAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for fast lookups
quizSessionSchema.index({ studentId: 1, assignmentId: 1 });
quizSessionSchema.index({ assignmentId: 1, status: 1 });

module.exports = mongoose.model('QuizSession', quizSessionSchema);

