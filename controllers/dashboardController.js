const User = require('../models/User');
exports.saveSettings = async (req, res) => {
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
            entry.status = status;
            entry.reason = reason || '';
        } else {
            monthHistory.entries.push({ date, time, status, reason: reason || '' });
        }

        await user.save();
        res.status(200).json({ message: 'Tiffin status updated successfully.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

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
exports.updateFromNotification = async (req, res) => {
    const { token, status, reason } = req.body;

    if (!token || !status) {
        return res.status(400).json({ message: 'Missing token or status' });
    }

    try {
        const user = await User.findOne({ "tiffinHistory.entries.notificationToken": token });

        if (!user) {
            return res.status(404).json({ message: 'Invalid or expired token.' });
        }

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

exports.updateSettings = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const newSettings = {
            ...user.settings,
            ...req.body
        };
        if (req.body.notificationTimes) {
            newSettings.timesPerDay = req.body.notificationTimes.length;
        }

        user.settings = newSettings;
        await user.save();

        res.json(user.settings);

    } catch (error) {
        console.error('Error in updateSettings controller:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
exports.deleteAccount = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user.id);
        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};