const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Your debugging lines are great, keep them for now!
  console.log("--- ATTEMPTING TO LOG IN WITH ---");
  console.log("HOST:", process.env.EMAIL_HOST); // Good to log the host too
  console.log("USER:", process.env.EMAIL_USER);
  console.log("PASS:", process.env.EMAIL_PASS ? '********' : 'NOT SET!'); // Don't log the full password

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports like 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

 // emailService.js

  const message = {
    from: `"TiffinTracker" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.message, // This line is the important one!
  }

  try {
    const info = await transporter.sendMail(message);
    console.log('Message sent successfully: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    // This will give you a detailed error if login fails
    throw new Error('Email could not be sent.');
  }
};

module.exports = sendEmail;