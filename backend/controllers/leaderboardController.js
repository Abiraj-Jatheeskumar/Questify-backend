const Response = require('../models/Response');
const User = require('../models/User');

// Get leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const { classId } = req.query;

    // Build filter
    const filter = {};
    if (classId) {
      filter.classId = classId;
    }

    // Get all responses
    const responses = await Response.find(filter)
      .populate('studentId', 'name email')
      .populate('classId', 'name');

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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

