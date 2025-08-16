const express = require('express');
const router = express.Router();
const { register, verifyEmail, login } = require('../controllers/authController');

router.post('/register', register);
router.get('/verify/:token', verifyEmail);
router.post('/login', login);

module.exports = router;