const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    sendMessage,
    getMessages,
    markAsRead,
    markAsResolved
} = require('../controllers/messageController');

router.use(authenticate);

router.post('/', sendMessage);
router.get('/', getMessages);
router.put('/:id/read', markAsRead);
router.put('/:id/resolve', markAsResolved);

module.exports = router;
