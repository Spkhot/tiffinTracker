// services/scheduler.js

const cron = require('node-cron');
const User = require('../models/User');
const { sendNotification } = require('./notificationService');
const crypto = require('crypto'); // <-- ADD THIS LINE

const startScheduler = () => {
    cron.schedule('* * * * *', async () => {
        const now = new Date();
        console.log(`[Scheduler] Running... Server time is: ${now.toString()}`);

        try {
            const potentialUsers = await User.find({
                'settings.notificationTimes': { $ne: null, $not: { $size: 0 } },
                'isVerified': true,
                'pushSubscription': { $exists: true }
            });

            if (potentialUsers.length === 0) return;

            console.log(`[Scheduler] Checking ${potentialUsers.length} potential users.`);

            potentialUsers.forEach(async (user) => {
                user.settings.notificationTimes.forEach(async (time) => {
                    const [hour, minute] = time.split(':');
                    
                    if (now.getHours() == hour && now.getMinutes() == minute) {
                        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                        const currentDate = now.toISOString().split('T')[0];
                        
                        // --- START OF CHANGES ---
                        const notificationToken = crypto.randomBytes(16).toString('hex'); // Create a unique token

                        const payload = JSON.stringify({
                            title: `Time for your tiffin, ${user.name}!`,
                            body: `Did you take your tiffin from ${user.settings.messName}?`,
                            actions: [{ action: 'yes', title: '✅ Yes' }, { action: 'no', title: '❌ No' }],
                            data: { date: currentDate, time: currentTime, token: notificationToken } // Add token to data
                        });

                        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                        let monthHistory = user.tiffinHistory.find(h => h.month === currentMonth);
                        if (!monthHistory) {
                            user.tiffinHistory.push({ month: currentMonth, entries: [] });
                            await user.save();
                            monthHistory = user.tiffinHistory.find(h => h.month === currentMonth);
                        }
                        
                        const entryExists = monthHistory.entries.some(e => e.date === currentDate && e.time === currentTime);
                        if (!entryExists) {
                            monthHistory.entries.push({ 
                                date: currentDate, 
                                time: currentTime, 
                                status: 'pending',
                                notificationToken: notificationToken // Save the token with the entry
                            });
                            await user.save();
                        }
                        // --- END OF CHANGES ---
                       
                        await sendNotification(user.pushSubscription, payload);
                        console.log(`[Scheduler] Notification SENT successfully to ${user.email}`);
                    }
                });
            });
        } catch (error) {
            console.error('[Scheduler] Error processing users:', error);
        }
    });
};

module.exports = { startScheduler };