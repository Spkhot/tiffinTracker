const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../services/emailService');

// Utility to generate a token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      name,
      email,
      password,
      verificationToken,
    });

    // authController.js -> register function

// authController.js -> register function

// ... inside the try block ...

const verificationUrl = `${process.env.SERVER_URL}/api/auth/verify/${verificationToken}`;

// --- NEW, ATTRACTIVE HTML EMAIL TEMPLATE ---
const message = `
  <div style="font-family: 'Poppins', Arial, sans-serif; background-color: #f9f9f9; padding: 40px; text-align: center;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.07);">
      <div style="background-color: #FF7B54; color: #ffffff; padding: 20px;">
        <h1 style="margin: 0; font-size: 24px;">🍱 TiffinTracker</h1>
      </div>
      <div style="padding: 30px 40px; color: #3D3D3D; line-height: 1.7;">
        <h2 style="font-size: 22px; margin-top: 0;">Welcome, ${name}! 👋</h2>
        <p>We're excited to have you on board. Just one more step to get started.</p>
        <p>Please click the button below to verify your email address and activate your account:</p>
        <a href="${verificationUrl}" target="_blank" style="display: inline-block; background-color: #FF7B54; color: #ffffff; padding: 12px 25px; margin: 20px 0; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 16px;">
          ✅ Verify My Account
        </a>
        <p style="font-size: 12px; color: #888;">If the button above doesn't work, you can copy and paste this link into your browser:</p>
        <p style="font-size: 12px; color: #888; word-break: break-all;">${verificationUrl}</p>
      </div>
      <div style="background-color: #f1f1f1; padding: 15px; font-size: 12px; color: #777;">
        If you did not sign up for TiffinTracker, please ignore this email.
      </div>
    </div>
  </div>
`;

// IMPORTANT: Send this message using the 'message' property again
await sendEmail({
  email: user.email,
  subject: 'Welcome to TiffinTracker! Please Verify Your Email',
  message, // Use 'message' which maps to HTML in your email service
});
    
    res.status(201).json({ message: 'Registration successful. Please check your email to verify your account.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Verify user email
// @route   GET /api/auth/verify/:token
exports.verifyEmail = async (req, res) => {
    try {
        const user = await User.findOne({ verificationToken: req.params.token });

        if (!user) {
            return res.status(400).send('<h1>Invalid or expired verification link.</h1>');
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();
        
        // Redirect to a setup page on the frontend
        res.redirect('/login.html?verified=true'); 

    } catch (error) {
        console.error(error);
        res.status(500).send('<h1>Server Error</h1>');
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
        return res.status(401).json({ message: 'Please verify your email before logging in.' });
    }

    if (await user.matchPassword(password)) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};