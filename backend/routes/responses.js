const express = require('express');
const router = express.Router();
const Response = require('../models/Response');
const AssignedQuestion = require('../models/AssignedQuestion');
const { authenticate } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Get responses (for admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const { classId, studentId, questionId, assignmentId } = req.query;
    const filter = {};

    if (classId) filter.classId = classId;
    if (studentId) filter.studentId = studentId;
    if (questionId) filter.questionId = questionId;
    if (assignmentId) filter.assignedQuestionId = assignmentId;

    const responses = await Response.find(filter)
      .populate('studentId', 'name email')
      .populate('questionId', 'question options correctAnswer')
      .populate('classId', 'name')
      .populate('assignedQuestionId', 'title')
      .sort({ answeredAt: -1 });

    res.json(responses);
  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export responses as JSON
router.get('/export/json/:assignmentId', authenticate, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { classId } = req.query;

    let filter = { assignedQuestionId: assignmentId };
    if (classId) filter.classId = classId;

    const responses = await Response.find(filter)
      .populate('studentId', 'name email')
      .populate('questionId', 'question options correctAnswer')
      .populate('classId', 'name')
      .populate('assignedQuestionId', 'title')
      .sort({ answeredAt: -1 });

    const assignment = await AssignedQuestion.findById(assignmentId).populate('classId', 'name');

    const exportData = {
      assignmentTitle: assignment?.title || 'Quiz',
      className: assignment?.classId?.name || 'Unknown',
      exportedAt: new Date().toISOString(),
      totalResponses: responses.length,
      responses: responses.map(r => ({
        studentName: r.studentId?.name || 'Unknown',
        studentEmail: r.studentId?.email || 'Unknown',
        question: r.questionId?.question || 'Unknown',
        selectedAnswer: r.selectedAnswer,
        correctAnswer: r.questionId?.correctAnswer,
        isCorrect: r.isCorrect,
        responseTimeMs: r.responseTime,
        responseTimeSec: (r.responseTime / 1000).toFixed(2),
        answeredAt: r.answeredAt
      }))
    };

    const filename = `quiz_responses_${assignmentId}_${Date.now()}.json`;
    const filepath = path.join(__dirname, '../exports', filename);

    // Create exports directory if it doesn't exist
    const exportsDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));

    res.download(filepath, filename, (err) => {
      if (!err) {
        fs.unlinkSync(filepath); // Delete file after download
      }
    });
  } catch (error) {
    console.error('Export JSON error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export responses in EdNet format (simple CSV for research)
router.get('/export/ednet/:assignmentId', authenticate, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { classId } = req.query;

    let filter = { assignedQuestionId: assignmentId };
    if (classId) filter.classId = classId;

    const responses = await Response.find(filter)
      .populate('studentId', '_id')
      .populate('questionId', '_id')
      .sort({ answeredAt: 1 }); // Sort by time ascending like EdNet

    // EdNet format: timestamp,solving_id,question_id,user_answer,elapsed_time
    const csvHeader = 'timestamp,solving_id,question_id,user_answer,elapsed_time\n';
    
    const csvRows = responses.map((r, index) => {
      const timestamp = new Date(r.answeredAt).getTime(); // Unix timestamp in ms
      const solvingId = index + 1; // Sequential solving ID
      const questionId = r.questionId?._id || 'unknown';
      // Convert 0-4 to a-e for user_answer
      const userAnswer = ['a', 'b', 'c', 'd', 'e'][r.selectedAnswer] || 'a';
      const elapsedTime = Math.round(r.responseTime); // Response time in ms

      return `${timestamp},${solvingId},${questionId},${userAnswer},${elapsedTime}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    const filename = `ednet_format_${assignmentId}_${Date.now()}.csv`;
    const filepath = path.join(__dirname, '../exports', filename);

    const exportsDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    fs.writeFileSync(filepath, csvContent);

    res.download(filepath, filename, (err) => {
      if (!err) {
        fs.unlinkSync(filepath);
      }
    });
  } catch (error) {
    console.error('Export EdNet format error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export responses as CSV with research data
router.get('/export/csv/:assignmentId', authenticate, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { classId } = req.query;

    let filter = { assignedQuestionId: assignmentId };
    if (classId) filter.classId = classId;

    const responses = await Response.find(filter)
      .populate('studentId', 'name email admissionNo')
      .populate('questionId', 'question options correctAnswer')
      .populate('classId', 'name')
      .populate('assignedQuestionId', 'title quizNumber')
      .sort({ answeredAt: -1 });

    const assignment = await AssignedQuestion.findById(assignmentId)
      .populate('classId', 'name')
      .populate('questionIds');

    // Calculate statistics
    const totalResponses = responses.length;
    const correctResponses = responses.filter(r => r.isCorrect).length;
    const accuracy = totalResponses > 0 ? ((correctResponses / totalResponses) * 100).toFixed(2) : 0;
    const avgResponseTimeMs = totalResponses > 0 ? (responses.reduce((sum, r) => sum + (r.responseTime || 0), 0) / totalResponses) : 0;
    const avgResponseTime = (avgResponseTimeMs / 1000).toFixed(2); // Convert to seconds

    // Create CSV header with research fields
    const csvHeader = 'Quiz#,Student Name,Admission No,Email,Class,Question,Selected Answer,Correct Answer,Is Correct,Response Time (ms),Response Time (sec),Engagement Level,Attempt Status,Answered At,Timestamp\n';

    // Create CSV rows with enhanced data
    const csvRows = responses.map((r, index) => {
      const quizNumber = r.assignedQuestionId?.quizNumber || 'N/A';
      const studentName = r.studentId?.name || 'Unknown';
      const admissionNo = r.studentId?.admissionNo || 'N/A';
      const studentEmail = r.studentId?.email || 'Unknown';
      const className = r.classId?.name || 'Unknown';
      const question = `"${(r.questionId?.question || 'Unknown').replace(/"/g, '""')}"`;
      const selectedAnswer = r.selectedAnswer || 'N/A';
      const correctAnswer = r.questionId?.correctAnswer || 'N/A';
      const isCorrect = r.isCorrect ? 'Yes' : 'No';
      const responseTimeMs = r.responseTime || 0; // Already in milliseconds
      const responseTimeSec = r.responseTime ? (r.responseTime / 1000).toFixed(2) : 0;
      
      // Engagement level based on response time in seconds (faster = higher engagement)
      let engagementLevel = 'Low';
      if (responseTimeMs > 0) {
        if (responseTimeMs < 5000) engagementLevel = 'Very High'; // < 5 seconds
        else if (responseTimeMs < 10000) engagementLevel = 'High'; // 5-10 seconds
        else if (responseTimeMs < 20000) engagementLevel = 'Medium'; // 10-20 seconds
        else if (responseTimeMs < 30000) engagementLevel = 'Low-Medium'; // 20-30 seconds
        else engagementLevel = 'Low'; // > 30 seconds
      }
      
      const attemptStatus = 'Completed';
      const answeredAt = new Date(r.answeredAt).toISOString();
      const timestamp = new Date(r.answeredAt).getTime();

      return `${quizNumber},"${studentName}","${admissionNo}","${studentEmail}","${className}",${question},${selectedAnswer},${correctAnswer},${isCorrect},${responseTimeMs},${responseTimeSec},${engagementLevel},${attemptStatus},${answeredAt},${timestamp}`;
    }).join('\n');

    // Summary section
    const summarySection = `\n\n=== QUIZ SUMMARY ===\nQuiz Number,${assignment?.quizNumber || 'N/A'}\nClass,${assignment?.classId?.name || 'Unknown'}\nTotal Questions in Quiz,${assignment?.questionIds?.length || 0}\nTotal Student Responses,${totalResponses}\nCorrect Responses,${correctResponses}\nAccuracy Rate,${accuracy}%\nAverage Response Time (seconds),${avgResponseTime}\nExport Date,${new Date().toISOString()}\n`;

    const csvContent = csvHeader + csvRows + summarySection;

    const filename = `research_data_quiz${assignment?.quizNumber || assignmentId}_${Date.now()}.csv`;
    const filepath = path.join(__dirname, '../exports', filename);

    // Create exports directory if it doesn't exist
    const exportsDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    fs.writeFileSync(filepath, csvContent);

    res.download(filepath, filename, (err) => {
      if (!err) {
        fs.unlinkSync(filepath); // Delete file after download
      }
    });
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

