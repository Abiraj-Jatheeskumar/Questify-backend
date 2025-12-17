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
  },
  networkMetrics: {
    rtt_ms: {
      type: Number,
      default: null,
      description: 'Round Trip Time in milliseconds'
    },
    jitter_ms: {
      type: Number,
      default: null,
      description: 'Network jitter in milliseconds'
    },
    stability_percent: {
      type: Number,
      default: null,
      description: 'Connection stability percentage (0-100)'
    },
    network_quality: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'Poor', null],
      default: null,
      description: 'Overall network quality classification'
    }
  }
});

// Index for faster queries
// Allow same question to be answered in different assignments, but prevent duplicates within same assignment
responseSchema.index({ studentId: 1, questionId: 1, assignedQuestionId: 1 }, { unique: true });
responseSchema.index({ classId: 1 });
responseSchema.index({ assignedQuestionId: 1 });
responseSchema.index({ answeredAt: -1 }); // For time-based queries
responseSchema.index({ studentId: 1, classId: 1 }); // For leaderboard queries

module.exports = mongoose.model('Response', responseSchema);

