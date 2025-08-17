// services/scheduler.js

const cron = require('node-cron');
const User = require('../models/User');
const { sendNotification } = require('./notificationService');
const crypto = require('crypto');
const moment = require('moment-timezone'); // <-- IMPORT THE NEW LIBRARY

const startScheduler = () => {
    cron.schedule('* * * * *', async () => {
        // We will work with moment objects now
        const nowUTC = moment.utc();
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
                const userTimezone = user.settings.timezone; // e.g., 'Asia/Kolkata'
                if (!userTimezone || !moment.tz.zone(userTimezone)) {
                    console.error(`[Scheduler] Invalid timezone '${userTimezone}' for user ${user.email}. Skipping.`);
                    return; // Skip user if timezone is invalid
                }
                
                // Convert the current UTC time to the user's local time
                const nowInUserTimezone = nowUTC.clone().tz(userTimezone);

                // Get the current hour and minute IN THE USER'S TIMEZONE
                const localHour = nowInUserTimezone.hour();
                const localMinute = nowInUserTimezone.minute();

                user.settings.notificationTimes.forEach(async (time) => {
                    const [savedHour, savedMinute] = time.split(':');
                    
                    if (localHour == savedHour && localMinute == savedMinute) {
                        
                        const currentDate = nowInUserTimezone.format('YYYY-MM-DD');
                        const currentTime = nowInUserTimezone.format('HH:mm');
                        const currentMonth = nowInUserTimezone.format('YYYY-MM');

                        const notificationToken = crypto.randomBytes(16).toString('hex');
                        
                        const payload = JSON.stringify({
                            title: `Time for your tiffin, ${user.name}!`,
                            body: `Did you take your tiffin from ${user.settings.messName}?`,
                            actions: [{ action: 'yes', title: '✅ Yes' }, { action: 'no', title: '❌ No' }],
                            data: { date: currentDate, time: currentTime, token: notificationToken }
                        });

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