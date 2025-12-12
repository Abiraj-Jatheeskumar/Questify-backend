const Response = require('../models/Response');
const User = require('../models/User');

// Get leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const { classId } = req.query;
    const currentStudent = req.user;

    // If user is a student, only show leaderboard for quizzes they've participated in
    let participatedAssignmentIds = [];
    if (currentStudent.role === 'student') {
      // Get all assignments (quizzes) that the current student has participated in
      const studentResponses = await Response.distinct('assignedQuestionId', {
        studentId: currentStudent._id
      });
      
      participatedAssignmentIds = studentResponses.map(id => id ? id.toString() : null).filter(id => id !== null);
      
      // If student hasn't participated in any quiz, return empty leaderboard
      if (participatedAssignmentIds.length === 0) {
        return res.json([]);
      }
    }

    // Build filter
    const filter = {};
    if (classId) {
      filter.classId = classId;
    } else if (currentStudent.role === 'student') {
      // For students, only show their classes
      if (currentStudent.classIds && currentStudent.classIds.length > 0) {
        filter.classId = { $in: currentStudent.classIds };
      } else {
        // Student not in any class, return empty
        return res.json([]);
      }
    }

    // If student, only include responses from quizzes they've participated in
    if (currentStudent.role === 'student' && participatedAssignmentIds.length > 0) {
      filter.assignedQuestionId = { $in: participatedAssignmentIds };
    }

    // Get all responses with limit for performance (max 50,000 responses)
    // For 2000 students with 10 questions each = 20,000 responses (safe)
    const responses = await Response.find(filter)
      .populate('studentId', 'name email')
      .populate('classId', 'name')
      .limit(50000); // Safety limit to prevent memory issues

    // Calculate statistics per student
    const studentStats = {};

    responses.forEach(response => {
      const studentId = response.studentId._id.toString();
      
      if (!studentStats[studentId]) {
        studentStats[studentId] = {
          studentId: response.studentId._id,
          studentName: response.studentId.name,
          studentEmail: response.studentId.email,
          totalAnswers: 0,
          correctAnswers: 0,
          totalResponseTime: 0,
          responseCount: 0
        };
      }

      studentStats[studentId].totalAnswers++;
      if (response.isCorrect) {
        studentStats[studentId].correctAnswers++;
      }
      studentStats[studentId].totalResponseTime += response.responseTime;
      studentStats[studentId].responseCount++;
    });

    // Format leaderboard
    const leaderboard = Object.values(studentStats).map(stats => ({
      studentId: stats.studentId,
      studentName: stats.studentName,
      studentEmail: stats.studentEmail,
      score: stats.correctAnswers,
      totalAnswers: stats.totalAnswers,
      correctAnswers: stats.correctAnswers,
      averageResponseTime: stats.responseCount > 0 
        ? Math.round((stats.totalResponseTime / stats.responseCount) * 100) / 100 
        : 0
    }));

    // Sort by score (descending), then by average response time (ascending)
    leaderboard.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.averageResponseTime - b.averageResponseTime;
    });

    res.json(leaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Failed to load leaderboard. Please try again later.' });
  }
};

