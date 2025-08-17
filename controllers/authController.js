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

// ... inside the try block ...

const verificationUrl = `${process.env.SERVER_URL}/api/auth/verify/${verificationToken}`;

// Create a simple, plain text message instead of HTML
const plainTextMessage = `
Welcome to TiffinTracker!

To complete your registration, please verify your email address.

Copy the link below and paste it into your web browser's address bar:

${verificationUrl}

If you did not sign up for TiffinTracker, please ignore this email.
`;

// IMPORTANT: Send this message using the 'text' property, not 'html' or 'message'
await sendEmail({
  email: user.email,
  subject: 'Verify Your TiffinTracker Account',
  text: plainTextMessage, // Use 'text' instead of 'message'
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