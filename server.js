const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const { startScheduler } = require('./services/scheduler');
const webpush = require('web-push');

// Load env vars
// This is the CORRECT line
dotenv.config();
// Connect to database
connectDB();

const app = express();

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup Web Push
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
webpush.setVapidDetails(
    'mailto:crrrrrr121@gmail.com', // Your contact email
    vapidPublicKey,
    vapidPrivateKey
);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', require('./routes/notifications'));
// Serve static assets (our frontend files)
app.use(express.static(path.join(__dirname, 'public')));

// Start the notification scheduler
startScheduler();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));