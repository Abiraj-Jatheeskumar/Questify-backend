const AssignedQuestion = require('../models/AssignedQuestion');
const Response = require('../models/Response');
const Question = require('../models/Question');
const Class = require('../models/Class');

// Get assigned questions for student (only from their classes)
exports.getAssignedQuestions = async (req, res) => {
  try {
    const student = req.user;
    const classIds = student.classIds;

    if (!classIds || classIds.length === 0) {
      return res.json([]);
    }

    // Get all active assignments for student's classes
    const assignments = await AssignedQuestion.find({
      classId: { $in: classIds },
      isActive: true
    })
      .populate('questionIds')
      .populate('classId', 'name')
      .sort({ assignedAt: -1 });

    // Get all questions from assignments
    const allQuestionIds = [];
    const assignmentMap = {};
    
    assignments.forEach(assignment => {
      assignmentMap[assignment._id.toString()] = assignment;
      assignment.questionIds.forEach(q => {
        if (!allQuestionIds.includes(q._id.toString())) {
          allQuestionIds.push(q._id.toString());
        }
      });
    });

    // Get responses for these questions by this student
    const responses = await Response.find({
      studentId: student._id,
      questionId: { $in: allQuestionIds }
    });

    const answeredQuestionIds = responses.map(r => r.questionId.toString());

    // Format questions with answer status and assignment details
    const questionsWithStatus = [];
    assignments.forEach(assignment => {
      const assignmentId = assignment._id.toString();
      let answeredCount = 0;
      
      assignment.questionIds.forEach(question => {
        const isAnswered = answeredQuestionIds.includes(question._id.toString());
        if (isAnswered) answeredCount++;
        
        // Check if assignment is completed (all questions answered)
        const assignmentCompleted = answeredCount === assignment.questionIds.length;
        
        // Only add non-answered questions
        if (!isAnswered) {
          questionsWithStatus.push({
            questionId: question._id,
            assignmentId: assignment._id,
            question: question.question,
            options: question.options,
            imageUrl: question.imageUrl || '',
            classId: assignment.classId._id,
            className: assignment.classId.name,
            isAnswered: false,
            assignmentTitle: assignment.title || 'Quiz',
            assignmentDescription: assignment.description || '',
            assignmentCompleted: assignmentCompleted
          });
        }
      });
      
      // Add completed flag even for answered questions (to prevent re-opening)
      const allQuestionsAnswered = answeredCount === assignment.questionIds.length;
      if (allQuestionsAnswered && questionsWithStatus.length > 0) {
        // Mark assignment as completed in response
        questionsWithStatus.forEach(q => {
          if (q.assignmentId.toString() === assignmentId) {
            q.assignmentCompleted = true;
          }
        });
      }
    });

    res.json(questionsWithStatus);
  } catch (error) {
    console.error('Get assigned questions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Submit answer with response time calculation in milliseconds
exports.submitAnswer = async (req, res) => {
  try {
    const { questionId, selectedAnswer, classId, startTime, assignmentId } = req.body;
    const studentId = req.user._id;

    if (questionId === undefined || selectedAnswer === undefined || !classId || startTime === undefined) {
      return res.status(400).json({ message: 'Question ID, selected answer, class ID, and start time are required' });
    }

    if (selectedAnswer < 0 || selectedAnswer > 4) {
      return res.status(400).json({ message: 'Selected answer must be between 0 and 4' });
    }

    // Check if student is in the class
    const student = await req.user.constructor.findById(studentId);
    if (!student.classIds.includes(classId)) {
      return res.status(403).json({ message: 'Student is not in this class' });
    }

    // Get question
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if already answered
    const existingResponse = await Response.findOne({
      studentId,
      questionId
    });

    if (existingResponse) {
      return res.status(400).json({ message: 'Question already answered' });
    }

    // Calculate response time in milliseconds
    // startTime is already in milliseconds from frontend (Date.now())
    const startTimeMs = typeof startTime === 'number' ? startTime : new Date(startTime).getTime();
    const endTimeMs = Date.now();
    const responseTimeMs = endTimeMs - startTimeMs;

    // Check if correct
    const isCorrect = question.correctAnswer === selectedAnswer;

    // Create response with calculated time in milliseconds
    const response = new Response({
      studentId,
      questionId,
      classId,
      assignedQuestionId: assignmentId,
      selectedAnswer,
      isCorrect,
      startTime: new Date(),
      responseTime: responseTimeMs, // Store in milliseconds
      status: 'answered'
    });

    await response.save();

    const savedResponse = await Response.findById(response._id)
      .populate('questionId', 'question options correctAnswer')
      .populate('classId', 'name')
      .populate('assignedQuestionId', 'title');

    res.status(201).json({
      response: savedResponse,
      isCorrect,
      correctAnswer: question.correctAnswer,
      responseTimeMs: responseTimeMs // Return in milliseconds
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get student's responses
exports.getMyResponses = async (req, res) => {
  try {
    const responses = await Response.find({ studentId: req.user._id })
      .populate('questionId', 'question options correctAnswer')
      .populate('classId', 'name')
      .populate('assignedQuestionId', 'title')
      .sort({ answeredAt: -1 });

    res.json(responses);
  } catch (error) {
    console.error('Get my responses error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

