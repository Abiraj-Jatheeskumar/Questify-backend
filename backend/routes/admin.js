const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');

// Student routes
router.get('/students', authenticate, isAdmin, adminController.getAllStudents);
router.get('/export-students-csv', authenticate, isAdmin, adminController.exportStudentsCSV);
router.get('/export-students-pdf', authenticate, isAdmin, adminController.exportStudentsPDF);
router.get('/export-students-csv-no-email', authenticate, isAdmin, adminController.exportStudentsCSVNoEmail);
router.get('/export-students-pdf-no-email', authenticate, isAdmin, adminController.exportStudentsPDFNoEmail);
router.get('/export-students-csv-masked', authenticate, isAdmin, adminController.exportStudentsCSVMaskedEmail);
router.get('/export-students-pdf-masked', authenticate, isAdmin, adminController.exportStudentsPDFMaskedEmail);
router.get('/students/:id', authenticate, isAdmin, adminController.getStudent);
router.post('/students', authenticate, isAdmin, adminController.createStudent);
router.put('/students/:id', authenticate, isAdmin, adminController.updateStudent);
router.delete('/students/:id', authenticate, isAdmin, adminController.deleteStudent);

// Class routes
router.get('/classes', authenticate, isAdmin, adminController.getAllClasses);
router.get('/classes/:id', authenticate, isAdmin, adminController.getClass);
router.post('/classes', authenticate, isAdmin, adminController.createClass);
router.put('/classes/:id', authenticate, isAdmin, adminController.updateClass);
router.delete('/classes/:id', authenticate, isAdmin, adminController.deleteClass);
router.delete('/classes/:classId/students/:studentId', authenticate, isAdmin, adminController.removeStudentFromClass);

// Question routes
router.get('/questions', authenticate, isAdmin, adminController.getAllQuestions);
router.get('/questions/:id', authenticate, isAdmin, adminController.getQuestion);
router.post('/questions', authenticate, isAdmin, adminController.createQuestion);
router.put('/questions/:id', authenticate, isAdmin, adminController.updateQuestion);
router.delete('/questions/:id', authenticate, isAdmin, adminController.deleteQuestion);

// Assignment routes
router.post('/assign-questions', authenticate, isAdmin, adminController.assignQuestions);
router.get('/assignments', authenticate, isAdmin, adminController.getAllAssignments);

// Response routes
router.get('/responses', authenticate, isAdmin, adminController.getAllResponses);
router.get('/responses/export', authenticate, isAdmin, adminController.exportResponses);

module.exports = router;

