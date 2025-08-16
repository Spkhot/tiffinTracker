const webpush = require('web-push');
const User = require('../models/User');

const sendNotification = async (subscription, payload) => {
    try {
        await webpush.sendNotification(subscription, payload);
    } catch (error) {
        console.error(`Error sending notification: ${error}`);
        // If subscription is expired or invalid, we should remove it from the DB
        if (error.statusCode === 410 || error.statusCode === 404) {
            console.log('Subscription has expired or is no longer valid. Removing...');
            await User.updateOne({ pushSubscription: subscription }, { $unset: { pushSubscription: "" } });
        }
    }
};

module.exports = { sendNotification };