const AssignedQuestion = require('../models/AssignedQuestion');
const Response = require('../models/Response');
const Question = require('../models/Question');
const Class = require('../models/Class');
const QuizSession = require('../models/QuizSession');

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

    // Format questions with answer status and assignment details
    const questionsWithStatus = [];
    
    // Process each assignment separately to check answers per assignment
    for (const assignment of assignments) {
      const assignmentId = assignment._id.toString();
      
      // Get responses for this specific assignment only
      const assignmentResponses = await Response.find({
        studentId: student._id,
        assignedQuestionId: assignmentId
      });
      
      const answeredQuestionIdsInAssignment = new Set(
        assignmentResponses.map(r => r.questionId.toString())
      );
      
      let answeredCount = 0;
      
      assignment.questionIds.forEach(question => {
        const questionIdStr = question._id.toString();
        const isAnswered = answeredQuestionIdsInAssignment.has(questionIdStr);
        
        if (isAnswered) {
          answeredCount++;
        } else {
          // Only add non-answered questions for this assignment
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
            assignmentCompleted: false // Will be updated below if needed
          });
        }
      });
      
      // Mark assignment as completed if all questions are answered
      const allQuestionsAnswered = answeredCount === assignment.questionIds.length;
      if (allQuestionsAnswered) {
        // Mark all questions in this assignment as completed
        questionsWithStatus.forEach(q => {
          if (q.assignmentId.toString() === assignmentId) {
            q.assignmentCompleted = true;
          }
        });
      }
    }

    res.json(questionsWithStatus);
  } catch (error) {
    console.error('Get assigned questions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Submit answer with response time calculation in milliseconds
exports.submitAnswer = async (req, res) => {
  try {
    const { questionId, selectedAnswer, classId, startTime, assignmentId, currentQuestionIndex, totalQuestions, networkMetrics } = req.body;
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

    // Check if already answered in this specific assignment
    const existingResponse = await Response.findOne({
      studentId,
      questionId,
      assignedQuestionId: assignmentId
    });

    if (existingResponse) {
      return res.status(400).json({ message: 'Question already answered in this quiz' });
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
      status: 'answered',
      // Include network metrics if provided
      // Note: Use !== undefined to preserve 0 values (0 is falsy, but valid)
      networkMetrics: networkMetrics ? {
        rtt_ms: networkMetrics.rtt_ms !== undefined ? networkMetrics.rtt_ms : null,
        jitter_ms: networkMetrics.jitter_ms !== undefined ? networkMetrics.jitter_ms : null,
        stability_percent: networkMetrics.stability_percent !== undefined ? networkMetrics.stability_percent : null,
        network_quality: networkMetrics.network_quality !== undefined ? networkMetrics.network_quality : null
      } : undefined
    });

    await response.save();

    // Update or create quiz session for progress tracking
    if (assignmentId && currentQuestionIndex !== undefined && totalQuestions !== undefined) {
      try {
        const session = await QuizSession.findOne({
          studentId,
          assignmentId
        });

        if (session) {
          // Update existing session
          session.currentQuestionIndex = currentQuestionIndex;
          session.questionsAnswered = (session.questionsAnswered || 0) + 1;
          session.lastActivityAt = new Date();
          session.status = session.questionsAnswered >= totalQuestions ? 'completed' : 'in_progress';
          
          if (session.status === 'completed' && !session.completedAt) {
            session.completedAt = new Date();
          }
          
          await session.save();
        } else {
          // Create new session
          await QuizSession.create({
            studentId,
            assignmentId,
            status: totalQuestions === 1 ? 'completed' : 'in_progress',
            currentQuestionIndex,
            questionsAnswered: 1,
            totalQuestions,
            startedAt: new Date(),
            lastActivityAt: new Date(),
            completedAt: totalQuestions === 1 ? new Date() : null
          });
        }
      } catch (sessionError) {
        // Don't fail the submission if session tracking fails
        console.error('Quiz session tracking error:', sessionError);
      }
    }

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

// Update network metrics for a response (called after request completes to get actual RTT)
exports.updateResponseNetworkMetrics = async (req, res) => {
  try {
    const { responseId } = req.params;
    const { networkMetrics } = req.body;
    const studentId = req.user._id;

    if (!responseId || !networkMetrics) {
      return res.status(400).json({ message: 'Response ID and network metrics are required' });
    }

    // Find the response and verify it belongs to this student
    const response = await Response.findOne({
      _id: responseId,
      studentId: studentId
    });

    if (!response) {
      return res.status(404).json({ message: 'Response not found or access denied' });
    }

    // Update network metrics (preserve 0 values)
    response.networkMetrics = {
      rtt_ms: networkMetrics.rtt_ms !== undefined ? networkMetrics.rtt_ms : response.networkMetrics?.rtt_ms,
      jitter_ms: networkMetrics.jitter_ms !== undefined ? networkMetrics.jitter_ms : response.networkMetrics?.jitter_ms,
      stability_percent: networkMetrics.stability_percent !== undefined ? networkMetrics.stability_percent : response.networkMetrics?.stability_percent,
      network_quality: networkMetrics.network_quality !== undefined ? networkMetrics.network_quality : response.networkMetrics?.network_quality
    };

    await response.save();

    res.json({ 
      message: 'Network metrics updated successfully',
      response: response
    });
  } catch (error) {
    console.error('Update network metrics error:', error);
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

