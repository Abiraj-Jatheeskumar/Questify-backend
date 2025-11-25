const Message = require('../models/Message');
const User = require('../models/User');

// Send a message
exports.sendMessage = async (req, res) => {
    try {
        const { content, receiverId } = req.body;
        const senderId = req.user._id;

        if (!content) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        let receiver = null;

        // If student sends, receiver is null (Admin)
        // If admin sends, receiver must be specified
        if (req.user.role === 'admin') {
            if (!receiverId) {
                return res.status(400).json({ message: 'Receiver ID is required for admin messages' });
            }
            receiver = receiverId;
        } else {
            // Student sending to admin
            receiver = null;
        }

        const message = new Message({
            sender: senderId,
            receiver,
            content
        });

        await message.save();

        // Populate sender details for immediate return
        await message.populate('sender', 'name email role');
        if (receiver) {
            await message.populate('receiver', 'name email role');
        }

        res.status(201).json(message);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get messages for current user
exports.getMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        let query = {};

        if (userRole === 'admin') {
            // Admin sees all messages sent to null (system) OR sent to them specifically (if we implement that later)
            // AND messages they sent
            // For now, let's just get ALL messages where receiver is null OR sender is the admin OR receiver is the admin
            // Actually, simpler: Admin sees everything involving them or the system.
            // But the requirement says "admin can sent reply".
            // Let's fetch all messages for now to build the inbox, or filter by conversation.
            // Better approach: Return all messages so Admin can see everything.
            query = {};
        } else {
            // Student sees messages they sent OR messages sent to them
            query = {
                $or: [
                    { sender: userId },
                    { receiver: userId }
                ]
            };
        }

        const messages = await Message.find(query)
            .populate('sender', 'name email role')
            .populate('receiver', 'name email role')
            .sort({ createdAt: -1 });

        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Mark message as read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const message = await Message.findById(id);

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Only receiver can mark as read? Or admin for system messages.
        // If receiver is null, any admin can mark as read.
        if (message.receiver && message.receiver.toString() !== req.user._id.toString()) {
            // If specific receiver, only they can mark
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (!message.receiver && req.user.role !== 'admin') {
            // If system message, only admin can mark
            return res.status(403).json({ message: 'Not authorized' });
        }

        message.isRead = true;
        await message.save();

        res.json(message);
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Mark message as resolved (Admin only)
exports.markAsResolved = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { id } = req.params;
        const message = await Message.findById(id);

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        message.isResolved = !message.isResolved; // Toggle
        await message.save();

        res.json(message);
    } catch (error) {
        console.error('Mark resolved error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
