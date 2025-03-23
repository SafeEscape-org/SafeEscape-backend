const express = require('express');
const router = express.Router();
const PushNotificationService = require('../services/notificationServices/pushNotifications/pushNotification');
/**
 * @route POST /notify-disaster
 * @desc Sends notifications to users in disaster-affected areas
 * @access Public (or Protected if needed)
 */
router.post('/notify-disaster', async (req, res) => {
    try {
        await PushNotificationService.notifyUsersOfDisaster(req.body);
        res.status(200).json({ message: 'Disaster notifications sent successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;