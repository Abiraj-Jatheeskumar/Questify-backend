const User = require('../models/User');
const Class = require('../models/Class');
const Question = require('../models/Question');
const AssignedQuestion = require('../models/AssignedQuestion');
const Response = require('../models/Response');
const { sendPasswordEmail } = require('../services/emailService');
const crypto = require('crypto');

// Generate random password prefixed with Std_
const generatePassword = () => {
  const randomString = crypto
    .randomBytes(6)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 6);
  return `Std_${randomString || Date.now().toString().slice(-6)}`;
};

// ========== STUDENT MANAGEMENT ==========

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .populate('classIds', 'name')
      .sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Export students as CSV
exports.exportStudentsCSV = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('admissionNo name email')
      .sort({ admissionNo: 1 });

    // Create CSV header
    const csvHeader = 'Admission No,Name,Email\n';

    // Create CSV rows
    const csvRows = students.map(student => {
      const admissionNo = student.admissionNo || 'N/A';
      const name = `"${(student.name || 'Unknown').replace(/"/g, '""')}"`;
      const email = student.email || 'N/A';
      return `${admissionNo},${name},${email}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=students_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export students CSV error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single student
exports.getStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id)
      .select('-password')
      .populate('classIds', 'name');
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create student
exports.createStudent = async (req, res) => {
  try {
    const { email, name, classIds, admissionNo } = req.body;

    if (!email || !name) {
      return res.status(400).json({ message: 'Email and name are required' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // If admissionNo is provided, check for duplicate
    if (admissionNo && admissionNo.trim()) {
      const existingAdmission = await User.findOne({ admissionNo: admissionNo.trim(), role: 'student' });
      if (existingAdmission) {
        return res.status(400).json({ message: 'Admission number already registered for a student' });
      }
    }

    // Generate password
    const password = generatePassword();

    // Create student
    const student = new User({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      password,
      role: 'student',
      classIds: classIds || [],
      admissionNo: admissionNo ? admissionNo.trim() : undefined
    });

    await student.save();

    // Send email with password
    const emailResult = await sendPasswordEmail(email, name, password);
    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.message);
      // Still return success but log the email error
    }

    // Update classes with student
    if (classIds && classIds.length > 0) {
      await Class.updateMany(
        { _id: { $in: classIds } },
        { $addToSet: { students: student._id } }
      );
    }

    const savedStudent = await User.findById(student._id)
      .select('-password')
      .populate('classIds', 'name');

    res.status(201).json({
      student: savedStudent,
      password: password, // Return password for admin reference
      emailSent: emailResult.success
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update student
exports.updateStudent = async (req, res) => {
  try {
    const { name, classIds, admissionNo } = req.body;
    const student = await User.findById(req.params.id);

    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (name) student.name = name.trim();
    
    // Handle admissionNo update
    if (admissionNo !== undefined) {
      if (admissionNo && admissionNo.trim()) {
        // Check for duplicate admissionNo (excluding current student)
        const existingAdmission = await User.findOne({ 
          admissionNo: admissionNo.trim(), 
          role: 'student',
          _id: { $ne: student._id }
        });
        if (existingAdmission) {
          return res.status(400).json({ message: 'Admission number already registered for another student' });
        }
        student.admissionNo = admissionNo.trim();
      } else {
        // Allow clearing admissionNo by sending empty string
        student.admissionNo = undefined;
      }
    }
    
    if (classIds) {
      // Remove student from old classes
      await Class.updateMany(
        { students: student._id },
        { $pull: { students: student._id } }
      );
      // Add student to new classes
      student.classIds = classIds;
      await Class.updateMany(
        { _id: { $in: classIds } },
        { $addToSet: { students: student._id } }
      );
    }

    await student.save();
    const updatedStudent = await User.findById(student._id)
      .select('-password')
      .populate('classIds', 'name');

    res.json(updatedStudent);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Remove student from classes
    await Class.updateMany(
      { students: student._id },
      { $pull: { students: student._id } }
    );

    // Delete student responses
    await Response.deleteMany({ studentId: student._id });

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ========== CLASS MANAGEMENT ==========

// Get all classes
exports.getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate('students', 'name email')
      .sort({ createdAt: -1 });
    res.json(classes);
  } catch (error) {
    console.error('Get all classes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single class
exports.getClass = async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('students', 'name email');
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json(classData);
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create class
exports.createClass = async (req, res) => {
  try {
    const { name, studentIds } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Class name is required' });
    }

    const classData = new Class({
      name,
      students: studentIds || []
    });

    await classData.save();

    // Update students with class
    if (studentIds && studentIds.length > 0) {
      await User.updateMany(
        { _id: { $in: studentIds } },
        { $addToSet: { classIds: classData._id } }
      );
    }

    const savedClass = await Class.findById(classData._id)
      .populate('students', 'name email');

    res.status(201).json(savedClass);
  } catch (error) {
    console.error('Create class error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Class name already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update class
exports.updateClass = async (req, res) => {
  try {
    const { name, studentIds } = req.body;
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (name) classData.name = name;
    if (studentIds) {
      // Remove class from old students
      await User.updateMany(
        { classIds: classData._id },
        { $pull: { classIds: classData._id } }
      );
      // Add class to new students
      classData.students = studentIds;
      await User.updateMany(
        { _id: { $in: studentIds } },
        { $addToSet: { classIds: classData._id } }
      );
    }

    await classData.save();
    const updatedClass = await Class.findById(classData._id)
      .populate('students', 'name email');

    res.json(updatedClass);
  } catch (error) {
    console.error('Update class error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Class name already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete class
exports.deleteClass = async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Remove class from students
    await User.updateMany(
      { classIds: classData._id },
      { $pull: { classIds: classData._id } }
    );

    // Delete assigned questions for this class
    await AssignedQuestion.deleteMany({ classId: classData._id });

    // Delete responses for this class
    await Response.deleteMany({ classId: classData._id });

    await Class.findByIdAndDelete(req.params.id);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove student from class
exports.removeStudentFromClass = async (req, res) => {
  try {
    const { classId, studentId } = req.params;

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    classData.students = classData.students.filter(
      (id) => id.toString() !== studentId
    );
    await classData.save();

    student.classIds = student.classIds.filter(
      (id) => id.toString() !== classId
    );
    await student.save();

    const updatedClass = await Class.findById(classId)
      .populate('students', 'name email');

    res.json(updatedClass);
  } catch (error) {
    console.error('Remove student from class error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ========== QUESTION MANAGEMENT ==========

// Get all questions
exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find()
      .populate('classIds', 'name')
      .sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    console.error('Get all questions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single question
exports.getQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('classIds', 'name');
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create question
exports.createQuestion = async (req, res) => {
  try {
    const { question, options, correctAnswer, subject, imageUrl, classIds } = req.body;

    if (!question || !options || correctAnswer === undefined) {
      return res.status(400).json({ message: 'Question, options, and correctAnswer are required' });
    }

    if (options.length !== 5) {
      return res.status(400).json({ message: 'Question must have exactly 5 options' });
    }

    if (correctAnswer < 0 || correctAnswer > 4) {
      return res.status(400).json({ message: 'Correct answer must be between 0 and 4' });
    }

    const newQuestion = new Question({
      question,
      options,
      correctAnswer,
      subject: subject || '',
      imageUrl: imageUrl || '',
      classIds: Array.isArray(classIds) ? classIds : []
    });

    await newQuestion.save();
    const savedQuestion = await Question.findById(newQuestion._id)
      .populate('classIds', 'name');
    res.status(201).json(savedQuestion);
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update question
exports.updateQuestion = async (req, res) => {
  try {
    const { question, options, correctAnswer, subject, imageUrl, classIds } = req.body;
    const questionData = await Question.findById(req.params.id);

    if (!questionData) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question) questionData.question = question;
    if (options) {
      if (options.length !== 5) {
        return res.status(400).json({ message: 'Question must have exactly 5 options' });
      }
      questionData.options = options;
    }
    if (correctAnswer !== undefined) {
      if (correctAnswer < 0 || correctAnswer > 4) {
        return res.status(400).json({ message: 'Correct answer must be between 0 and 4' });
      }
      questionData.correctAnswer = correctAnswer;
    }
    if (subject !== undefined) questionData.subject = subject;
    if (imageUrl !== undefined) questionData.imageUrl = imageUrl;
    if (classIds !== undefined) questionData.classIds = classIds;

    await questionData.save();
    const updatedQuestion = await Question.findById(questionData._id)
      .populate('classIds', 'name');
    res.json(updatedQuestion);
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete question
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Delete responses for this question
    await Response.deleteMany({ questionId: question._id });

    // Remove from assigned questions
    await AssignedQuestion.updateMany(
      { questionIds: question._id },
      { $pull: { questionIds: question._id } }
    );

    await Question.findByIdAndDelete(req.params.id);
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ========== ASSIGN QUESTIONS ==========

// Assign questions to class
exports.assignQuestions = async (req, res) => {
  try {
    const { classId, questionIds, title, description } = req.body;

    if (!classId || !questionIds || questionIds.length === 0) {
      return res.status(400).json({ message: 'Class ID and question IDs are required' });
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Verify all questions exist
    const questions = await Question.find({ _id: { $in: questionIds } });
    if (questions.length !== questionIds.length) {
      return res.status(400).json({ message: 'Some questions not found' });
    }

    // Auto-increment quiz number for this class
    const lastAssignment = await AssignedQuestion.findOne({ classId }).sort({ quizNumber: -1 });
    const quizNumber = (lastAssignment?.quizNumber || 0) + 1;

    const assignment = new AssignedQuestion({
      classId,
      questionIds,
      assignedBy: req.user._id,
      quizNumber,
      title: title && title.trim() ? title.trim() : undefined, // Use provided title or default to 'Quiz' from model
      description: description && description.trim() ? description.trim() : undefined
    });

    await assignment.save();

    const savedAssignment = await AssignedQuestion.findById(assignment._id)
      .populate('classId', 'name')
      .populate('questionIds')
      .populate('assignedBy', 'name email');

    res.status(201).json(savedAssignment);
  } catch (error) {
    console.error('Assign questions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all assignments
exports.getAllAssignments = async (req, res) => {
  try {
    const assignments = await AssignedQuestion.find({ isActive: true })
      .populate('classId', 'name')
      .populate('questionIds')
      .populate('assignedBy', 'name email')
      .sort({ assignedAt: -1 });
    res.json(assignments);
  } catch (error) {
    console.error('Get all assignments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ========== VIEW RESPONSES ==========

// Get all responses with filters
exports.getAllResponses = async (req, res) => {
  try {
    const { classId, studentId, questionId } = req.query;
    const filter = {};

    if (classId) filter.classId = classId;
    if (studentId) filter.studentId = studentId;
    if (questionId) filter.questionId = questionId;

    const responses = await Response.find(filter)
      .populate('studentId', 'name email admissionNo')
      .populate('questionId', 'question options correctAnswer')
      .populate('classId', 'name')
      .populate('assignedQuestionId', 'title quizNumber questionIds classId')
      .sort({ answeredAt: -1 });

    res.json(responses);
  } catch (error) {
    console.error('Get all responses error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Export responses as JSON
exports.exportResponses = async (req, res) => {
  try {
    const { classId, studentId, questionId } = req.query;
    const filter = {};

    if (classId) filter.classId = classId;
    if (studentId) filter.studentId = studentId;
    if (questionId) filter.questionId = questionId;

    const responses = await Response.find(filter)
      .populate('studentId', 'name email')
      .populate('questionId', 'question options correctAnswer')
      .populate('classId', 'name')
      .lean();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=responses.json');
    res.json(responses);
  } catch (error) {
    console.error('Export responses error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

