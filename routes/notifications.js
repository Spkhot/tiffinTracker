// File: routes/notifications.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');

// @route   POST /api/notifications/respond
// @desc    Handle user response from a push notification
router.post('/respond', async (req, res) => {
    const { token, status, reason } = req.body;

    if (!token || !status) {
        return res.status(400).json({ message: 'Token and status are required.' });
    }

    try {
        const user = await User.findOne({ "tiffinHistory.entries.notificationToken": token });

        if (!user) {
            return res.status(404).json({ message: 'No pending notification found for this token.' });
        }

        let entryUpdated = false;
        user.tiffinHistory.forEach(month => {
            month.entries.forEach(entry => {
                if (entry.notificationToken === token) {
                    entry.status = status;
                    if (status === 'skipped') {
                        entry.reason = reason;
                    }
                    entry.notificationToken = undefined; // Remove token after use
                    entryUpdated = true;
                }
            });
        });

        if (!entryUpdated) {
             return res.status(404).json({ message: 'Could not find the specific tiffin entry to update.' });
        }

        await user.save();
        res.status(200).json({ message: 'Response recorded successfully.' });

    } catch (error) {
        console.error('Error in /api/notifications/respond:', error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;