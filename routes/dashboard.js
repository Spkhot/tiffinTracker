const express = require('express');
const router = express.Router();
const { saveSettings, getDashboardData, updateTiffinStatus, saveSubscription  , updateFromNotification , updateSettings , deleteAccount} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.post('/update-from-notification', updateFromNotification);
// All routes here are protected
router.use(protect);

router.post('/settings', saveSettings);
router.put('/settings', updateSettings); // For updating existing settings
router.get('/data', getDashboardData);
router.post('/update-tiffin', updateTiffinStatus);
router.post('/save-subscription', saveSubscription);
router.delete('/delete-account', deleteAccount);

module.exports = router;