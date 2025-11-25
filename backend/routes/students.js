const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticate, isStudent } = require('../middleware/auth');

router.get('/assigned-questions', authenticate, isStudent, studentController.getAssignedQuestions);
router.post('/submit-answer', authenticate, isStudent, studentController.submitAnswer);
router.get('/my-responses', authenticate, isStudent, studentController.getMyResponses);

module.exports = router;

