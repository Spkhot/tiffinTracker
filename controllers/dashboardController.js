const User = require('../models/User');

// @desc    Save initial user settings
// @route   POST /api/dashboard/settings
// In controllers/dashboardController.js

exports.saveSettings = async (req, res) => {
    // Get the timezone from the request body as well
    const { messName, pricePerTiffin, timesPerDay, notificationTimes, timezone } = req.body; // <-- 1. ADD 'timezone' HERE

    try {
        const user = await User.findById(req.user.id);
        if (user) {
            user.settings.messName = messName;
            user.settings.pricePerTiffin = pricePerTiffin;
            user.settings.timesPerDay = timesPerDay;
            user.settings.notificationTimes = notificationTimes;
            user.settings.timezone = timezone; // <-- 2. ADD THIS LINE TO SAVE IT
            
            const updatedUser = await user.save();
            res.json(updatedUser.settings);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get dashboard data for the current month
// @route   GET /api/dashboard/data
// controllers/dashboardController.js

exports.getDashboardData = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Ensure the current month exists in the history
        let currentMonthExists = user.tiffinHistory.some(h => h.month === currentMonthStr);
        if (!currentMonthExists) {
            user.tiffinHistory.push({ month: currentMonthStr, entries: [] });
            await user.save();
        }

        // --- NEW LOGIC: Calculate stats for ALL months ---
        const historyWithStats = user.tiffinHistory.map(monthHistory => {
            const totalTiffins = monthHistory.entries.filter(e => e.status === 'taken').length;
            const totalPrice = totalTiffins * user.settings.pricePerTiffin;

            return {
                month: monthHistory.month,
                entries: monthHistory.entries, // We still send the full entry list
                totalTiffins: totalTiffins,
                totalPrice: totalPrice
            };
        }).sort((a, b) => b.month.localeCompare(a.month)); // Sort with the newest month first

        res.json({
            settings: user.settings,
            historyWithStats: historyWithStats // Send the new calculated array
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a tiffin entry status (for missed notifications)
// @route   POST /api/dashboard/update-tiffin
exports.updateTiffinStatus = async (req, res) => {
    const { date, time, status, reason } = req.body; // date in "YYYY-MM-DD", time in "HH:MM"
    
    try {
        const user = await User.findById(req.user.id);
        const month = date.substring(0, 7); // "YYYY-MM"

        const monthHistory = user.tiffinHistory.find(h => h.month === month);
        if (!monthHistory) {
            return res.status(404).json({ message: 'No history found for this month.' });
        }
        
        let entry = monthHistory.entries.find(e => e.date === date && e.time === time);
        
        if (entry) {
            // Update existing entry
            entry.status = status;
            entry.reason = reason || '';
        } else {
            // Create new entry if it doesn't exist (edge case)
            monthHistory.entries.push({ date, time, status, reason: reason || '' });
        }

        await user.save();
        res.status(200).json({ message: 'Tiffin status updated successfully.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Save push notification subscription
// @route   POST /api/dashboard/save-subscription
exports.saveSubscription = async (req, res) => {
    const subscription = req.body;
    try {
        await User.findByIdAndUpdate(req.user.id, { pushSubscription: subscription });
        res.status(200).json({ message: 'Subscription saved.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// controllers/dashboardController.js

// ... at the end of the file ...
exports.updateFromNotification = async (req, res) => {
    const { token, status, reason } = req.body;

    if (!token || !status) {
        return res.status(400).json({ message: 'Missing token or status' });
    }

    try {
        // Find the user and the specific tiffin entry that has this token
        const user = await User.findOne({ "tiffinHistory.entries.notificationToken": token });

        if (!user) {
            return res.status(404).json({ message: 'Invalid or expired token.' });
        }

        // Find the specific entry and update it
        let entryUpdated = false;
        user.tiffinHistory.forEach(month => {
            month.entries.forEach(entry => {
                if (entry.notificationToken === token) {
                    entry.status = status;
                    entry.reason = reason || '';
                    entry.notificationToken = undefined; // CRITICAL: Invalidate the token after use
                    entryUpdated = true;
                }
            });
        });
        
        if (entryUpdated) {
            await user.save();
            res.status(200).json({ message: 'Tiffin updated successfully.' });
        } else {
            res.status(404).json({ message: 'Entry not found.' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// In controllers/dashboardController.js

// DELETE your old updateSettings function and REPLACE it with this one.

exports.updateSettings = async (req, res) => {
    // This is a robust way to handle both initial setup and future updates.
    try {
        // Find the user by the ID that the 'auth' middleware provides
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // THE BULLETPROOF FIX:
        // 1. Take the user's existing settings (or an empty object if none exist).
        // 2. Take all the new data from the request body (messName, price, times, timezone).
        // 3. Merge them together. The new data will overwrite the old if there's an overlap.
        const newSettings = {
            ...user.settings,
            ...req.body
        };

        // If 'notificationTimes' was part of the update, also update 'timesPerDay'
        if (req.body.notificationTimes) {
            newSettings.timesPerDay = req.body.notificationTimes.length;
        }

        // Assign the newly merged settings object back to the user
        user.settings = newSettings;

        // Save the user with the complete, updated settings
        await user.save();

        res.json(user.settings);

    } catch (error) {
        console.error('Error in updateSettings controller:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
// @desc    Delete user account
// @route   DELETE /api/dashboard/delete-account
exports.deleteAccount = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user.id);
        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};