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
        responseTime: `${r.responseTime} seconds`,
        answeredAt: r.answeredAt,
        networkMetrics: r.networkMetrics ? {
          rtt_ms: r.networkMetrics.rtt_ms !== undefined ? r.networkMetrics.rtt_ms : null,
          jitter_ms: r.networkMetrics.jitter_ms !== undefined ? r.networkMetrics.jitter_ms : null,
          stability_percent: r.networkMetrics.stability_percent !== undefined ? r.networkMetrics.stability_percent : null,
          network_quality: r.networkMetrics.network_quality !== undefined ? r.networkMetrics.network_quality : null
        } : null
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

    // Create mapping for question_id (format: q{quizNumber}_{questionPosition})
    const questionIdMap = {};
    if (assignment && assignment.questionIds) {
      const quizNumber = assignment.quizNumber || 1;
      assignment.questionIds.forEach((qId, index) => {
        const qIdStr = qId._id?.toString() || qId.toString();
        if (!questionIdMap[qIdStr]) {
          questionIdMap[qIdStr] = `q${quizNumber}_${index + 1}`;
        }
      });
    }

    // Calculate per-question statistics (for relative comparison)
    const questionStats = {};
    responses.forEach(r => {
      const qId = r.questionId?._id?.toString();
      if (qId) {
        if (!questionStats[qId]) {
          questionStats[qId] = {
            times: [],
            correctness: []
          };
        }
        questionStats[qId].times.push(r.responseTime ? (r.responseTime / 1000) : 0);
        questionStats[qId].correctness.push(r.isCorrect);
      }
    });
    
    // Calculate percentiles for each question
    Object.keys(questionStats).forEach(qId => {
      const stats = questionStats[qId];
      const sortedTimes = [...stats.times].sort((a, b) => a - b);
      stats.medianTime = sortedTimes.length > 0 
        ? sortedTimes[Math.floor(sortedTimes.length / 2)] 
        : 0;
      stats.p25Time = sortedTimes.length > 0 
        ? sortedTimes[Math.floor(sortedTimes.length * 0.25)] 
        : 0;
      stats.p75Time = sortedTimes.length > 0 
        ? sortedTimes[Math.floor(sortedTimes.length * 0.75)] 
        : 0;
      stats.avgCorrectness = stats.correctness.filter(c => c).length / stats.correctness.length;
    });

    // Calculate overall statistics
    const totalResponses = responses.length;
    const correctResponses = responses.filter(r => r.isCorrect).length;
    const accuracy = totalResponses > 0 ? ((correctResponses / totalResponses) * 100).toFixed(2) : 0;
    const avgResponseTime = totalResponses > 0 ? (responses.reduce((sum, r) => sum + (r.responseTime || 0), 0) / totalResponses).toFixed(2) : 0;

    // Enhanced Engagement Algorithm (Percentile-Based per Question)
    // Compares student's performance to all students' performance on the same question
    // IMPORTANT: Network metrics are used ONLY to normalize response time, NOT directly in engagementScore
    // This ensures fairness by compensating for network delays without changing the core formula
    const calculateEngagement = (isCorrect, responseTimeSec, questionId, rtt_ms = null, jitter_ms = null) => {
      const responseTimeSecNum = parseFloat(responseTimeSec);
      
      // If no response time, default to passive
      if (!responseTimeSecNum || responseTimeSecNum <= 0) {
        return 'Passive';
      }
      
      // Network normalization: Calculate penalty to adjust response time for network conditions
      // Network metrics are used ONLY here to normalize time, not in the engagementScore formula
      let networkPenalty = 1.0; // Default: no penalty (good network)
      
      // Check if we have RTT (required for network normalization)
      // Note: jitter may be 0 (valid - means no variation) or null/undefined (first question with only 1 RTT measurement)
      if (rtt_ms !== null && rtt_ms !== undefined) {
        // Normalize RTT: 0-50ms = good (0 penalty), 50-200ms = moderate (0.1-0.3), 200+ = bad (0.3-0.5)
        const rttPenalty = Math.min(0.5, Math.max(0, (rtt_ms - 50) / 500));
        
        // Jitter calculation: If jitter is available (not null/undefined), use it
        // Note: jitter = 0 is valid (means no variation, typically for first question with only 1 RTT measurement)
        let jitterPenalty = 0; // Default: no jitter penalty
        if (jitter_ms !== null && jitter_ms !== undefined) {
          // Normalize jitter: 0-10ms = good (0 penalty), 10-30ms = moderate (0.1-0.2), 30+ = bad (0.2-0.3)
          jitterPenalty = Math.min(0.3, Math.max(0, (jitter_ms - 10) / 200));
        }
        
        // Combine penalties: networkPenalty = 1.0 + average of RTT and jitter penalties
        // If jitter not available, use RTT-only penalty (weighted appropriately)
        // Clamped to safe range 1.0-1.5 as required for research
        if (jitter_ms !== null && jitter_ms !== undefined) {
          // Both RTT and jitter available: use average
          networkPenalty = Math.min(1.5, Math.max(1.0, 1.0 + (rttPenalty + jitterPenalty) / 2));
        } else {
          // Only RTT available (e.g., first question): use RTT penalty only, scaled to account for missing jitter
          networkPenalty = Math.min(1.5, Math.max(1.0, 1.0 + rttPenalty * 0.6));
        }
      }
      
      // Adjust response time by network penalty
      // Higher penalty (worse network) reduces adjusted time, making student appear faster
      // This compensates for network delays without affecting correctness or changing formula weights
      const adjustedResponseTime = responseTimeSecNum / networkPenalty;
      
      const qId = questionId?.toString();
      const stats = questionStats[qId];
      
      // If no stats for this question, fall back to confidence-based
      if (!stats || !stats.medianTime) {
        const isFast = adjustedResponseTime < 15;
        const isMedium = adjustedResponseTime >= 15 && adjustedResponseTime <= 30;
        if (isCorrect && (isFast || isMedium)) return 'Active';
        if (isCorrect) return 'Moderate';
        if (!isCorrect && isFast) return 'Passive';
        if (!isCorrect && isMedium) return 'Moderate';
        return 'Passive';
      }
      
      // Relative speed: How does this student compare to others on this question?
      // Uses ADJUSTED response time (network-normalized) for fair comparison
      // Faster than median = engaged, slower = less engaged
      const isFasterThanMedian = adjustedResponseTime < stats.medianTime;
      const isFasterThanP25 = adjustedResponseTime < stats.p25Time; // Top 25% fastest
      const isSlowerThanP75 = adjustedResponseTime > stats.p75Time; // Bottom 25% slowest
      
      // Correctness score (adjusted by question difficulty)
      const correctnessScore = isCorrect ? 1.0 : 0.0;
      const questionDifficulty = 1 - stats.avgCorrectness; // Higher = harder question
      
      // Speed score based on percentile position (using adjusted response time)
      let speedScore = 0.5; // Default neutral
      if (isFasterThanP25) {
        speedScore = 1.0; // Top 25% fastest
      } else if (isFasterThanMedian) {
        speedScore = 0.7; // Faster than median
      } else if (isSlowerThanP75) {
        speedScore = 0.2; // Bottom 25% slowest
      } else {
        speedScore = 0.4; // Between median and P75
      }
      
      // Combined engagement score
      // IMPORTANT: Formula remains exactly as specified - network does NOT appear here
      // Correctness (60%) + Speed relative to question (40%)
      // Harder questions get slight boost for correct answers
      const difficultyBonus = isCorrect && questionDifficulty > 0.3 ? 0.1 : 0;
      const engagementScore = (correctnessScore * 0.6) + (speedScore * 0.4) + difficultyBonus;
      
      // Classification
      if (engagementScore >= 0.75) {
        return 'Active';    // High correctness + faster than most students
      } else if (engagementScore >= 0.45) {
        return 'Moderate';   // Medium engagement
      } else {
        return 'Passive';    // Low correctness + slower than most students
      }
    };

    // Create CSV header with research fields (added Question ID and Network Metrics)
    const csvHeader = 'Quiz#,Student Name,Admission No,Email,Class,Question ID,Question,Selected Answer,Correct Answer,Is Correct,Response Time (ms),Response Time (sec),Engagement Level,Attempt Status,Answered At,Timestamp,RTT (ms),Jitter (ms),Stability (%),Network Quality\n';

    // Create CSV rows with enhanced data
    const csvRows = responses.map((r, index) => {
      const quizNumber = r.assignedQuestionId?.quizNumber || 'N/A';
      const studentName = r.studentId?.name || 'Unknown';
      const admissionNo = r.studentId?.admissionNo || 'N/A';
      const studentEmail = r.studentId?.email || 'Unknown';
      const className = r.classId?.name || 'Unknown';
      const qId = r.questionId?._id?.toString();
      const questionId = qId ? (questionIdMap[qId] || 'unknown') : 'N/A';
      const question = `"${(r.questionId?.question || 'Unknown').replace(/"/g, '""')}"`;
      // Handle 0 as valid answer (first option), only use N/A if null/undefined
      const selectedAnswer = (r.selectedAnswer !== null && r.selectedAnswer !== undefined) ? r.selectedAnswer : 'N/A';
      const correctAnswer = (r.questionId?.correctAnswer !== null && r.questionId?.correctAnswer !== undefined) ? r.questionId.correctAnswer : 'N/A';
      const isCorrect = r.isCorrect ? 'Yes' : 'No';
      // responseTime is stored in milliseconds in database
      const responseTimeMs = r.responseTime || 0;
      const responseTimeSec = r.responseTime ? (r.responseTime / 1000).toFixed(2) : 0;
      
      // Calculate engagement level using percentile-based formula (compares to all students on same question)
      // Network metrics passed for response time normalization only
      const engagementLevel = calculateEngagement(
        r.isCorrect, 
        responseTimeSec, 
        r.questionId?._id,
        r.networkMetrics?.rtt_ms,
        r.networkMetrics?.jitter_ms
      );
      
      const attemptStatus = 'Completed';
      const answeredAt = new Date(r.answeredAt).toISOString();
      const timestamp = new Date(r.answeredAt).getTime();
      
      // Network metrics (handle null/undefined for backward compatibility)
      const rtt_ms = r.networkMetrics?.rtt_ms ?? 'N/A';
      const jitter_ms = r.networkMetrics?.jitter_ms ?? 'N/A';
      const stability_percent = r.networkMetrics?.stability_percent ?? 'N/A';
      const network_quality = r.networkMetrics?.network_quality ?? 'N/A';

      return `${quizNumber},"${studentName}","${admissionNo}","${studentEmail}","${className}",${questionId},${question},${selectedAnswer},${correctAnswer},${isCorrect},${responseTimeMs},${responseTimeSec},${engagementLevel},${attemptStatus},${answeredAt},${timestamp},${rtt_ms},${jitter_ms},${stability_percent},${network_quality}`;
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

// Export ALL responses as JSON (all quizzes)
router.get('/export/json-all', authenticate, async (req, res) => {
  try {
    const responses = await Response.find({})
      .populate('studentId', 'name email admissionNo')
      .populate('questionId', 'question options correctAnswer')
      .populate('classId', 'name')
      .populate('assignedQuestionId', 'title quizNumber')
      .sort({ answeredAt: -1 });

    const exportData = {
      exportedAt: new Date().toISOString(),
      totalResponses: responses.length,
      responses: responses.map(r => ({
        quizNumber: r.assignedQuestionId?.quizNumber || 'N/A',
        quizTitle: r.assignedQuestionId?.title || 'Unknown',
        studentName: r.studentId?.name || 'Unknown',
        studentEmail: r.studentId?.email || 'Unknown',
        admissionNo: r.studentId?.admissionNo || 'N/A',
        className: r.classId?.name || 'Unknown',
        question: r.questionId?.question || 'Unknown',
        selectedAnswer: r.selectedAnswer,
        correctAnswer: r.questionId?.correctAnswer,
        isCorrect: r.isCorrect,
        responseTimeMs: r.responseTime || 0,
        responseTimeSec: r.responseTime ? (r.responseTime / 1000).toFixed(2) : 0,
        answeredAt: r.answeredAt,
        networkMetrics: r.networkMetrics ? {
          rtt_ms: r.networkMetrics.rtt_ms !== undefined ? r.networkMetrics.rtt_ms : null,
          jitter_ms: r.networkMetrics.jitter_ms !== undefined ? r.networkMetrics.jitter_ms : null,
          stability_percent: r.networkMetrics.stability_percent !== undefined ? r.networkMetrics.stability_percent : null,
          network_quality: r.networkMetrics.network_quality !== undefined ? r.networkMetrics.network_quality : null
        } : null
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=all_responses_${Date.now()}.json`);
    res.json(exportData);
  } catch (error) {
    console.error('Export All JSON error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export ALL responses as CSV (all quizzes)
router.get('/export/csv-all', authenticate, async (req, res) => {
  try {
    const responses = await Response.find({})
      .populate('studentId', 'name email admissionNo')
      .populate('questionId', 'question options correctAnswer')
      .populate('classId', 'name')
      .populate('assignedQuestionId', 'title quizNumber')
      .sort({ answeredAt: -1 });

    // Create mapping for question_id (format: q{quizNumber}_{questionPosition})
    const questionIdMap = {};
    const assignmentIds = [...new Set(responses.map(r => r.assignedQuestionId?._id?.toString()).filter(Boolean))];
    const assignments = await AssignedQuestion.find({ _id: { $in: assignmentIds } });
    
    assignments.forEach(assignment => {
      const quizNumber = assignment.quizNumber || 1;
      const questionIds = assignment.questionIds || [];
      questionIds.forEach((qId, index) => {
        const qIdStr = qId._id?.toString() || qId.toString();
        if (!questionIdMap[qIdStr]) {
          questionIdMap[qIdStr] = `q${quizNumber}_${index + 1}`;
        }
      });
    });

    // Calculate per-question statistics (for relative comparison)
    const questionStats = {};
    responses.forEach(r => {
      const qId = r.questionId?._id?.toString();
      if (qId) {
        if (!questionStats[qId]) {
          questionStats[qId] = {
            times: [],
            correctness: []
          };
        }
        questionStats[qId].times.push(r.responseTime ? (r.responseTime / 1000) : 0);
        questionStats[qId].correctness.push(r.isCorrect);
      }
    });
    
    // Calculate percentiles for each question
    Object.keys(questionStats).forEach(qId => {
      const stats = questionStats[qId];
      const sortedTimes = [...stats.times].sort((a, b) => a - b);
      stats.medianTime = sortedTimes.length > 0 
        ? sortedTimes[Math.floor(sortedTimes.length / 2)] 
        : 0;
      stats.p25Time = sortedTimes.length > 0 
        ? sortedTimes[Math.floor(sortedTimes.length * 0.25)] 
        : 0;
      stats.p75Time = sortedTimes.length > 0 
        ? sortedTimes[Math.floor(sortedTimes.length * 0.75)] 
        : 0;
      stats.avgCorrectness = stats.correctness.filter(c => c).length / stats.correctness.length;
    });

    // Calculate overall statistics
    const totalResponses = responses.length;
    const correctResponses = responses.filter(r => r.isCorrect).length;
    const accuracy = totalResponses > 0 ? ((correctResponses / totalResponses) * 100).toFixed(2) : 0;
    const avgResponseTime = totalResponses > 0 
      ? (responses.reduce((sum, r) => sum + ((r.responseTime || 0) / 1000), 0) / totalResponses).toFixed(2) 
      : 0;

    // Enhanced Engagement Algorithm (Percentile-Based per Question)
    // Compares student's performance to all students' performance on the same question
    // IMPORTANT: Network metrics are used ONLY to normalize response time, NOT directly in engagementScore
    // This ensures fairness by compensating for network delays without changing the core formula
    const calculateEngagement = (isCorrect, responseTimeSec, questionId, rtt_ms = null, jitter_ms = null) => {
      const responseTimeSecNum = parseFloat(responseTimeSec);
      
      // If no response time, default to passive
      if (!responseTimeSecNum || responseTimeSecNum <= 0) {
        return 'Passive';
      }
      
      // Network normalization: Calculate penalty to adjust response time for network conditions
      // Network metrics are used ONLY here to normalize time, not in the engagementScore formula
      let networkPenalty = 1.0; // Default: no penalty (good network)
      
      // Check if we have RTT (required for network normalization)
      // Note: jitter may be 0 (valid - means no variation) or null/undefined (first question with only 1 RTT measurement)
      if (rtt_ms !== null && rtt_ms !== undefined) {
        // Normalize RTT: 0-50ms = good (0 penalty), 50-200ms = moderate (0.1-0.3), 200+ = bad (0.3-0.5)
        const rttPenalty = Math.min(0.5, Math.max(0, (rtt_ms - 50) / 500));
        
        // Jitter calculation: If jitter is available (not null/undefined), use it
        // Note: jitter = 0 is valid (means no variation, typically for first question with only 1 RTT measurement)
        let jitterPenalty = 0; // Default: no jitter penalty
        if (jitter_ms !== null && jitter_ms !== undefined) {
          // Normalize jitter: 0-10ms = good (0 penalty), 10-30ms = moderate (0.1-0.2), 30+ = bad (0.2-0.3)
          jitterPenalty = Math.min(0.3, Math.max(0, (jitter_ms - 10) / 200));
        }
        
        // Combine penalties: networkPenalty = 1.0 + average of RTT and jitter penalties
        // If jitter not available, use RTT-only penalty (weighted appropriately)
        // Clamped to safe range 1.0-1.5 as required for research
        if (jitter_ms !== null && jitter_ms !== undefined) {
          // Both RTT and jitter available: use average
          networkPenalty = Math.min(1.5, Math.max(1.0, 1.0 + (rttPenalty + jitterPenalty) / 2));
        } else {
          // Only RTT available (e.g., first question): use RTT penalty only, scaled to account for missing jitter
          networkPenalty = Math.min(1.5, Math.max(1.0, 1.0 + rttPenalty * 0.6));
        }
      }
      
      // Adjust response time by network penalty
      // Higher penalty (worse network) reduces adjusted time, making student appear faster
      // This compensates for network delays without affecting correctness or changing formula weights
      const adjustedResponseTime = responseTimeSecNum / networkPenalty;
      
      const qId = questionId?.toString();
      const stats = questionStats[qId];
      
      // If no stats for this question, fall back to confidence-based
      if (!stats || !stats.medianTime) {
        const isFast = adjustedResponseTime < 15;
        const isMedium = adjustedResponseTime >= 15 && adjustedResponseTime <= 30;
        if (isCorrect && (isFast || isMedium)) return 'Active';
        if (isCorrect) return 'Moderate';
        if (!isCorrect && isFast) return 'Passive';
        if (!isCorrect && isMedium) return 'Moderate';
        return 'Passive';
      }
      
      // Relative speed: How does this student compare to others on this question?
      // Uses ADJUSTED response time (network-normalized) for fair comparison
      const isFasterThanMedian = adjustedResponseTime < stats.medianTime;
      const isFasterThanP25 = adjustedResponseTime < stats.p25Time; // Top 25% fastest
      const isSlowerThanP75 = adjustedResponseTime > stats.p75Time; // Bottom 25% slowest
      
      // Correctness score (adjusted by question difficulty)
      const correctnessScore = isCorrect ? 1.0 : 0.0;
      const questionDifficulty = 1 - stats.avgCorrectness; // Higher = harder question
      
      // Speed score based on percentile position (using adjusted response time)
      let speedScore = 0.5; // Default neutral
      if (isFasterThanP25) {
        speedScore = 1.0; // Top 25% fastest
      } else if (isFasterThanMedian) {
        speedScore = 0.7; // Faster than median
      } else if (isSlowerThanP75) {
        speedScore = 0.2; // Bottom 25% slowest
      } else {
        speedScore = 0.4; // Between median and P75
      }
      
      // Combined engagement score
      // IMPORTANT: Formula remains exactly as specified - network does NOT appear here
      // Correctness (60%) + Speed relative to question (40%)
      // Harder questions get slight boost for correct answers
      const difficultyBonus = isCorrect && questionDifficulty > 0.3 ? 0.1 : 0;
      const engagementScore = (correctnessScore * 0.6) + (speedScore * 0.4) + difficultyBonus;
      
      // Classification
      if (engagementScore >= 0.75) {
        return 'Active';    // High correctness + faster than most students
      } else if (engagementScore >= 0.45) {
        return 'Moderate';   // Medium engagement
      } else {
        return 'Passive';    // Low correctness + slower than most students
      }
    };

    // Create CSV header (added Question ID and Network Metrics)
    const csvHeader = 'Quiz#,Student Name,Admission No,Email,Class,Question ID,Question,Selected Answer,Correct Answer,Is Correct,Response Time (ms),Response Time (sec),Engagement Level,Attempt Status,Answered At,Timestamp,RTT (ms),Jitter (ms),Stability (%),Network Quality\n';

    // Create CSV rows
    const csvRows = responses.map((r) => {
      const quizNumber = r.assignedQuestionId?.quizNumber || 'N/A';
      const studentName = r.studentId?.name || 'Unknown';
      const admissionNo = r.studentId?.admissionNo || 'N/A';
      const studentEmail = r.studentId?.email || 'Unknown';
      const className = r.classId?.name || 'Unknown';
      const qId = r.questionId?._id?.toString();
      const questionId = qId ? (questionIdMap[qId] || 'unknown') : 'N/A';
      const question = `"${(r.questionId?.question || 'Unknown').replace(/"/g, '""')}"`;
      // Handle 0 as valid answer (first option), only use N/A if null/undefined
      const selectedAnswer = (r.selectedAnswer !== null && r.selectedAnswer !== undefined) ? r.selectedAnswer : 'N/A';
      const correctAnswer = (r.questionId?.correctAnswer !== null && r.questionId?.correctAnswer !== undefined) ? r.questionId.correctAnswer : 'N/A';
      const isCorrect = r.isCorrect ? 'Yes' : 'No';
      const responseTimeMs = r.responseTime || 0;
      const responseTimeSec = r.responseTime ? (r.responseTime / 1000).toFixed(2) : 0;
      
      // Calculate engagement level using percentile-based formula (compares to all students on same question)
      // Network metrics passed for response time normalization only
      const engagementLevel = calculateEngagement(
        r.isCorrect, 
        responseTimeSec, 
        r.questionId?._id,
        r.networkMetrics?.rtt_ms,
        r.networkMetrics?.jitter_ms
      );
      
      const attemptStatus = 'Completed';
      const answeredAt = new Date(r.answeredAt).toISOString();
      const timestamp = new Date(r.answeredAt).getTime();
      
      // Network metrics (handle null/undefined for backward compatibility)
      const rtt_ms = r.networkMetrics?.rtt_ms ?? 'N/A';
      const jitter_ms = r.networkMetrics?.jitter_ms ?? 'N/A';
      const stability_percent = r.networkMetrics?.stability_percent ?? 'N/A';
      const network_quality = r.networkMetrics?.network_quality ?? 'N/A';

      return `${quizNumber},"${studentName}","${admissionNo}","${studentEmail}","${className}",${questionId},${question},${selectedAnswer},${correctAnswer},${isCorrect},${responseTimeMs},${responseTimeSec},${engagementLevel},${attemptStatus},${answeredAt},${timestamp},${rtt_ms},${jitter_ms},${stability_percent},${network_quality}`;
    }).join('\n');

    // Summary section
    const summarySection = `\n\n=== OVERALL SUMMARY (ALL QUIZZES) ===\nTotal Responses (All Quizzes),${totalResponses}\nCorrect Responses,${correctResponses}\nOverall Accuracy Rate,${accuracy}%\nAverage Response Time (seconds),${avgResponseTime}\nExport Date,${new Date().toISOString()}\n`;

    const csvContent = csvHeader + csvRows + summarySection;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=all_responses_detailed_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export All CSV error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export ALL responses as EdNet Basic format (all quizzes) - MUST come before parameterized routes
router.get('/export/ednet-basic-all', authenticate, async (req, res) => {
  try {
    const responses = await Response.find({})
      .populate('studentId', 'name email admissionNo')
      .populate('questionId', 'question options correctAnswer')
      .populate('assignedQuestionId', 'title quizNumber questionIds')
      .sort({ answeredAt: -1 });

    // Create mapping for solving_id (auto-increment attempt number per student per quiz)
    // solving_id = attempt number (1, 2, 3...) unique per student per quiz
    const solvingIdMap = {}; // Key: studentId_assignmentId, Value: solving_id
    const studentAttemptCounters = {}; // Track attempt number per student
    
    // Group responses by student and assignment to assign solving_id
    responses.forEach(r => {
      const studentId = r.studentId?._id?.toString();
      const assignmentId = r.assignedQuestionId?._id?.toString();
      
      if (studentId && assignmentId) {
        const key = `${studentId}_${assignmentId}`;
        if (!solvingIdMap[key]) {
          // Initialize counter for this student if not exists
          if (!studentAttemptCounters[studentId]) {
            studentAttemptCounters[studentId] = 0;
          }
          // Increment and assign solving_id for this student's attempt
          studentAttemptCounters[studentId]++;
          solvingIdMap[key] = studentAttemptCounters[studentId];
        }
      }
    });

    // Create mapping for question_id (format: q{quizNumber}_{questionPosition})
    // e.g., q1_1 (Quiz 1, Question 1), q1_2 (Quiz 1, Question 2)
    // Note: For Export ALL, we need to fetch assignments separately to get questionIds properly
    const questionIdMap = {};
    const assignmentIds = [...new Set(responses.map(r => r.assignedQuestionId?._id?.toString()).filter(Boolean))];
    const assignments = await AssignedQuestion.find({ _id: { $in: assignmentIds } });
    
    // Build mapping: questionId -> { quizNumber, position }
    assignments.forEach(assignment => {
      const quizNumber = assignment.quizNumber || 1;
      const questionIds = assignment.questionIds || [];
      questionIds.forEach((qId, index) => {
        const qIdStr = qId.toString();
        // Only set if not already mapped (first occurrence wins)
        if (!questionIdMap[qIdStr]) {
          questionIdMap[qIdStr] = `q${quizNumber}_${index + 1}`;
        }
      });
    });

    // Helper function to convert numeric answer (0-4) to letter (a-e)
    const numToLetter = (num) => {
      const letters = ['a', 'b', 'c', 'd', 'e'];
      return letters[num] || 'a';
    };

    // EdNet Basic format: timestamp, solving_id, question_id, user_answer, elapsed_time
    const csvHeader = 'timestamp,solving_id,question_id,user_answer,elapsed_time\n';
    
    const csvRows = responses.map((r) => {
      const timestamp = new Date(r.answeredAt).getTime();
      const studentId = r.studentId?._id?.toString();
      const assignmentId = r.assignedQuestionId?._id?.toString();
      const key = studentId && assignmentId ? `${studentId}_${assignmentId}` : null;
      const solvingId = key ? (solvingIdMap[key] || 'unknown') : 'unknown';
      const qId = r.questionId?._id?.toString();
      const questionId = qId ? (questionIdMap[qId] || 'unknown') : 'unknown';
      const userAnswer = numToLetter(r.selectedAnswer || 0);
      const elapsedTime = r.responseTime || 0; // Keep in milliseconds

      return `${timestamp},${solvingId},${questionId},${userAnswer},${elapsedTime}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=ednet_basic_all_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export All EdNet Basic error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export ALL responses as EdNet Extended format (all quizzes) - MUST come before parameterized routes
router.get('/export/ednet-all', authenticate, async (req, res) => {
  try {
    const responses = await Response.find({})
      .populate('studentId', 'name email admissionNo')
      .populate('questionId', 'question options correctAnswer')
      .populate('assignedQuestionId', 'title quizNumber questionIds')
      .sort({ answeredAt: -1 });

    // Create mapping for solving_id (auto-increment attempt number per student per quiz)
    // solving_id = attempt number (1, 2, 3...) unique per student per quiz
    const solvingIdMap = {}; // Key: studentId_assignmentId, Value: solving_id
    const studentAttemptCounters = {}; // Track attempt number per student
    
    // Group responses by student and assignment to assign solving_id
    responses.forEach(r => {
      const studentId = r.studentId?._id?.toString();
      const assignmentId = r.assignedQuestionId?._id?.toString();
      
      if (studentId && assignmentId) {
        const key = `${studentId}_${assignmentId}`;
        if (!solvingIdMap[key]) {
          // Initialize counter for this student if not exists
          if (!studentAttemptCounters[studentId]) {
            studentAttemptCounters[studentId] = 0;
          }
          // Increment and assign solving_id for this student's attempt
          studentAttemptCounters[studentId]++;
          solvingIdMap[key] = studentAttemptCounters[studentId];
        }
      }
    });

    // Create mapping for question_id (format: q{quizNumber}_{questionPosition})
    // e.g., q1_1 (Quiz 1, Question 1), q1_2 (Quiz 1, Question 2)
    // Note: For Export ALL, we need to fetch assignments separately to get questionIds properly
    const questionIdMap = {};
    const assignmentIds = [...new Set(responses.map(r => r.assignedQuestionId?._id?.toString()).filter(Boolean))];
    const assignments = await AssignedQuestion.find({ _id: { $in: assignmentIds } });
    
    // Build mapping: questionId -> { quizNumber, position }
    assignments.forEach(assignment => {
      const quizNumber = assignment.quizNumber || 1;
      const questionIds = assignment.questionIds || [];
      questionIds.forEach((qId, index) => {
        const qIdStr = qId.toString();
        // Only set if not already mapped (first occurrence wins)
        if (!questionIdMap[qIdStr]) {
          questionIdMap[qIdStr] = `q${quizNumber}_${index + 1}`;
        }
      });
    });

    // Helper function to convert numeric answer (0-4) to letter (a-e)
    const numToLetter = (num) => {
      const letters = ['a', 'b', 'c', 'd', 'e'];
      return letters[num] || 'a';
    };

    // EdNet Extended format: timestamp, solving_id, question_id, user_answer, elapsed_time, correct_answer, is_correct
    const csvHeader = 'timestamp,solving_id,question_id,user_answer,elapsed_time,correct_answer,is_correct\n';
    
    const csvRows = responses.map((r) => {
      const timestamp = new Date(r.answeredAt).getTime();
      const studentId = r.studentId?._id?.toString();
      const assignmentId = r.assignedQuestionId?._id?.toString();
      const key = studentId && assignmentId ? `${studentId}_${assignmentId}` : null;
      const solvingId = key ? (solvingIdMap[key] || 'unknown') : 'unknown';
      const qId = r.questionId?._id?.toString();
      const questionId = qId ? (questionIdMap[qId] || 'unknown') : 'unknown';
      const userAnswer = numToLetter(r.selectedAnswer || 0);
      const elapsedTime = r.responseTime || 0; // Keep in milliseconds
      const correctAnswer = numToLetter(r.questionId?.correctAnswer ?? 0);
      const isCorrect = r.isCorrect ? 1 : 0;

      return `${timestamp},${solvingId},${questionId},${userAnswer},${elapsedTime},${correctAnswer},${isCorrect}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=ednet_extended_all_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export All EdNet Extended error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export responses as EdNet Basic format (single assignment)
// Format: timestamp, solving_id, question_id, user_answer, elapsed_time
router.get('/export/ednet-basic/:assignmentId', authenticate, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { classId } = req.query;

    let filter = { assignedQuestionId: assignmentId };
    if (classId) filter.classId = classId;

    const responses = await Response.find(filter)
      .populate('studentId', 'name email admissionNo')
      .populate('questionId', 'question options correctAnswer')
      .populate('assignedQuestionId', 'title quizNumber questionIds')
      .sort({ answeredAt: -1 });

    // Get assignment details for question positioning
    const assignment = await AssignedQuestion.findById(assignmentId);
    const quizNumber = assignment?.quizNumber || 1;
    const questionIds = assignment?.questionIds || [];

    // Create mapping for solving_id (auto-increment attempt number per student per quiz)
    // solving_id = attempt number (1, 2, 3...) unique per student per quiz
    const solvingIdMap = {}; // Key: studentId_assignmentId, Value: solving_id
    const studentAttemptCounters = {}; // Track attempt number per student
    
    // Group responses by student and assignment to assign solving_id
    responses.forEach(r => {
      const studentId = r.studentId?._id?.toString();
      const assignmentId = r.assignedQuestionId?._id?.toString();
      
      if (studentId && assignmentId) {
        const key = `${studentId}_${assignmentId}`;
        if (!solvingIdMap[key]) {
          // Initialize counter for this student if not exists
          if (!studentAttemptCounters[studentId]) {
            studentAttemptCounters[studentId] = 0;
          }
          // Increment and assign solving_id for this student's attempt
          studentAttemptCounters[studentId]++;
          solvingIdMap[key] = studentAttemptCounters[studentId];
        }
      }
    });

    // Create mapping for question_id (format: q{quizNumber}_{questionPosition})
    // e.g., q1_1 (Quiz 1, Question 1), q1_2 (Quiz 1, Question 2)
    const questionIdMap = {};
    questionIds.forEach((qId, index) => {
      questionIdMap[qId.toString()] = `q${quizNumber}_${index + 1}`;
    });

    // Helper function to convert numeric answer (0-4) to letter (a-e)
    const numToLetter = (num) => {
      const letters = ['a', 'b', 'c', 'd', 'e'];
      return letters[num] || 'a';
    };

    // EdNet Basic format: timestamp, solving_id, question_id, user_answer, elapsed_time
    const csvHeader = 'timestamp,solving_id,question_id,user_answer,elapsed_time\n';
    
    const csvRows = responses.map((r) => {
      const timestamp = new Date(r.answeredAt).getTime();
      const studentId = r.studentId?._id?.toString();
      const assignmentId = r.assignedQuestionId?._id?.toString();
      const key = studentId && assignmentId ? `${studentId}_${assignmentId}` : null;
      const solvingId = key ? (solvingIdMap[key] || 'unknown') : 'unknown';
      const qId = r.questionId?._id?.toString();
      const questionId = qId ? (questionIdMap[qId] || 'unknown') : 'unknown';
      const userAnswer = numToLetter(r.selectedAnswer || 0);
      const elapsedTime = r.responseTime || 0; // Keep in milliseconds

      return `${timestamp},${solvingId},${questionId},${userAnswer},${elapsedTime}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=ednet_basic_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export EdNet Basic error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export responses as EdNet Extended format (single assignment)
// Format: timestamp, solving_id, question_id, user_answer, elapsed_time, correct_answer, is_correct
router.get('/export/ednet/:assignmentId', authenticate, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { classId } = req.query;

    let filter = { assignedQuestionId: assignmentId };
    if (classId) filter.classId = classId;

    const responses = await Response.find(filter)
      .populate('studentId', 'name email admissionNo')
      .populate('questionId', 'question options correctAnswer')
      .populate('assignedQuestionId', 'title quizNumber questionIds')
      .sort({ answeredAt: -1 });

    // Get assignment details for question positioning
    const assignment = await AssignedQuestion.findById(assignmentId);
    const quizNumber = assignment?.quizNumber || 1;
    const questionIds = assignment?.questionIds || [];

    // Create mapping for solving_id (auto-increment attempt number per student per quiz)
    // solving_id = attempt number (1, 2, 3...) unique per student per quiz
    const solvingIdMap = {}; // Key: studentId_assignmentId, Value: solving_id
    const studentAttemptCounters = {}; // Track attempt number per student
    
    // Group responses by student and assignment to assign solving_id
    responses.forEach(r => {
      const studentId = r.studentId?._id?.toString();
      const assignmentId = r.assignedQuestionId?._id?.toString();
      
      if (studentId && assignmentId) {
        const key = `${studentId}_${assignmentId}`;
        if (!solvingIdMap[key]) {
          // Initialize counter for this student if not exists
          if (!studentAttemptCounters[studentId]) {
            studentAttemptCounters[studentId] = 0;
          }
          // Increment and assign solving_id for this student's attempt
          studentAttemptCounters[studentId]++;
          solvingIdMap[key] = studentAttemptCounters[studentId];
        }
      }
    });

    // Create mapping for question_id (format: q{quizNumber}_{questionPosition})
    // e.g., q1_1 (Quiz 1, Question 1), q1_2 (Quiz 1, Question 2)
    const questionIdMap = {};
    questionIds.forEach((qId, index) => {
      questionIdMap[qId.toString()] = `q${quizNumber}_${index + 1}`;
    });

    // Helper function to convert numeric answer (0-4) to letter (a-e)
    const numToLetter = (num) => {
      const letters = ['a', 'b', 'c', 'd', 'e'];
      return letters[num] || 'a';
    };

    // EdNet Extended format: timestamp, solving_id, question_id, user_answer, elapsed_time, correct_answer, is_correct
    const csvHeader = 'timestamp,solving_id,question_id,user_answer,elapsed_time,correct_answer,is_correct\n';
    
    const csvRows = responses.map((r) => {
      const timestamp = new Date(r.answeredAt).getTime();
      const studentId = r.studentId?._id?.toString();
      const assignmentId = r.assignedQuestionId?._id?.toString();
      const key = studentId && assignmentId ? `${studentId}_${assignmentId}` : null;
      const solvingId = key ? (solvingIdMap[key] || 'unknown') : 'unknown';
      const qId = r.questionId?._id?.toString();
      const questionId = qId ? (questionIdMap[qId] || 'unknown') : 'unknown';
      const userAnswer = numToLetter(r.selectedAnswer || 0);
      const elapsedTime = r.responseTime || 0; // Keep in milliseconds
      const correctAnswer = numToLetter(r.questionId?.correctAnswer ?? 0);
      const isCorrect = r.isCorrect ? 1 : 0;

      return `${timestamp},${solvingId},${questionId},${userAnswer},${elapsedTime},${correctAnswer},${isCorrect}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=ednet_extended_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export EdNet Extended error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

