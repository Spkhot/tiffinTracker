// services/scheduler.js

const cron = require('node-cron');
const User = require('../models/User');
const { sendNotification } = require('./notificationService');
const crypto = require('crypto');

// --- THE FINAL, BULLETPROOF IMPORT METHOD ---
// We are now importing the functions directly from their specific files.
// This is guaranteed to work if the package is installed.
const { utcToZonedTime } = require('date-fns-tz/utcToZonedTime');
const { format } = require('date-fns-tz/format');

const startScheduler = () => {
    cron.schedule('* * * * *', async () => {
        const nowUTC = new Date();
        console.log(`[Scheduler] Running... Server UTC time is: ${nowUTC.toISOString()}`);

        try {
            const users = await User.find({
                'settings.notificationTimes': { $ne: null, $not: { $size: 0 } },
                'settings.timezone': { $exists: true, $ne: null },
                'isVerified': true,
                'pushSubscription': { $exists: true }
            });

            if (users.length === 0) {
                return;
            }

            users.forEach(async (user) => {
                const userTimezone = user.settings.timezone;
                if (!userTimezone) return;
                
                // --- NO CHANGE NEEDED HERE ---
                // The function call is now valid because the import above is direct.
                const nowInUserTimezone = utcToZonedTime(nowUTC, userTimezone);

                const localHour = nowInUserTimezone.getHours();
                const localMinute = nowInUserTimezone.getMinutes();

                user.settings.notificationTimes.forEach(async (time) => {
                    const [savedHour, savedMinute] = time.split(':');
                    
                    if (localHour == savedHour && localMinute == savedMinute) {
                        
                        // --- NO CHANGE NEEDED HERE ---
                        const currentDate = format(nowInUserTimezone, 'yyyy-MM-dd', { timeZone: userTimezone });
                        const currentTime = format(nowInUserTimezone, 'HH:mm', { timeZone: userTimezone });

                        const notificationToken = crypto.randomBytes(16).toString('hex');
                        
                        const payload = JSON.stringify({
                            title: `Time for your tiffin, ${user.name}!`,
                            body: `Did you take your tiffin from ${user.settings.messName}?`,
                            actions: [{ action: 'yes', title: '✅ Yes' }, { action: 'no', title: '❌ No' }],
                            data: { date: currentDate, time: currentTime, token: notificationToken }
                        });

                        const currentMonth = format(nowInUserTimezone, 'yyyy-MM', { timeZone: userTimezone });
                        let monthHistory = user.tiffinHistory.find(h => h.month === currentMonth);
                        
                        if (!monthHistory) {
                            user.tiffinHistory.push({ month: currentMonth, entries: [] });
                            monthHistory = user.tiffinHistory[user.tiffinHistory.length - 1];
                        }
                        
                        const entryExists = monthHistory.entries.some(e => e.date === currentDate && e.time === currentTime);
                        
                        if (!entryExists) {
                            monthHistory.entries.push({ 
                                date: currentDate, 
                                time: currentTime, 
                                status: 'pending',
                                notificationToken: notificationToken
                            });
                            await user.save();
                            
                            console.log(`[Scheduler] MATCH! Sending notification to ${user.email} for their ${currentTime} tiffin.`);
                            await sendNotification(user.pushSubscription, payload);
                        } else {
                            console.log(`[Scheduler] Notification already sent for ${user.email} at ${currentTime} on ${currentDate}.`);
                        }
                    }
                });
            });
        } catch (error) {
            console.error('[Scheduler] Error processing users:', error);
        }
    });
};

module.exports = { startScheduler };