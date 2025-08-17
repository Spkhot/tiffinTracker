// services/scheduler.js

const cron = require('node-cron');
const User = require('../models/User');
const { sendNotification } = require('./notificationService');
const crypto = require('crypto');
const { zonedTimeToUtc, utcToZonedTime, format } = require('date-fns-tz'); // <-- IMPORT from new library

const startScheduler = () => {
    // This cron job still runs every minute based on the server's UTC clock
    cron.schedule('* * * * *', async () => {
        const nowUTC = new Date(); // This is the current time in UTC
        console.log(`[Scheduler] Running... Server UTC time is: ${nowUTC.toISOString()}`);

        try {
            // Find all users who have notification settings and a timezone
            const users = await User.find({
                'settings.notificationTimes': { $ne: null, $not: { $size: 0 } },
                'settings.timezone': { $exists: true, $ne: null }, // Important: only get users with a timezone
                'isVerified': true,
                'pushSubscription': { $exists: true }
            });

            if (users.length === 0) {
                // console.log('[Scheduler] No users scheduled for notifications right now.');
                return;
            }

            users.forEach(async (user) => {
                const userTimezone = user.settings.timezone; // e.g., 'Asia/Kolkata'
                if (!userTimezone) return; // Skip user if for some reason timezone is missing
                
                // Convert the current UTC time to the user's local time
                const nowInUserTimezone = utcToZonedTime(nowUTC, userTimezone);

                // Get the current hour and minute IN THE USER'S TIMEZONE
                const localHour = nowInUserTimezone.getHours();
                const localMinute = nowInUserTimezone.getMinutes();

                user.settings.notificationTimes.forEach(async (time) => {
                    const [savedHour, savedMinute] = time.split(':');
                    
                    // Compare the user's current local time with their saved notification time
                    if (localHour == savedHour && localMinute == savedMinute) {
                        
                        // --- The rest of your notification logic is the same ---
                        // But we use the timezone-aware date for consistency
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
                            // The save will happen below, so no need for a separate one here
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
                            await user.save(); // Save the new entry
                            
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