const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // --- ADD THESE LINES FOR DEBUGGING ---
  console.log("--- ATTEMPTING TO LOG IN WITH ---");
  console.log("USER:", process.env.EMAIL_USER);
  console.log("PASS:", process.env.EMAIL_PASS);
  // ------------------------------------

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const message = {
    from: '"Tiffin Tracker" <no-reply@tiffintracker.com>',
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  const info = await transporter.sendMail(message);

  console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;