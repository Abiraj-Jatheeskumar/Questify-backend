const mongoose = require('mongoose');

const assignedQuestionSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  questionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  }],
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  title: {
    type: String,
    default: 'Quiz'
  },
  description: {
    type: String,
    default: ''
  },
  quizNumber: {
    type: Number,
    unique: false,
    sparse: true
  }
});

module.exports = mongoose.model('AssignedQuestion', assignedQuestionSchema);

