const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/auth');

router.put('/', authenticate, profileController.updateProfile);
router.put('/change-password', authenticate, profileController.changePassword);

module.exports = router;

