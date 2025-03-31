const Alert = require('../models/Alert');
const pushNotificationService = require('../services/notificationServices/pushNotifications/pushNotification');
const smsService = require('../services/notificationServices/smsServices/smsService');
const pubSubService = require('../services/pubsub/pubSubService');
const alertService = require('../services/alerts/alertService');
class AlertController {
  async createAlert(req, res) {
    try {
      const alertData = req.body;
      
      // Validate request
      if (!alertData.title || !alertData.message || !alertData.location) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: title, message, location'
        });
      }
      
      // Create alert
      const alertId = await alertService.createEmergencyAlert(alertData);
      
      res.status(201).json({
        success: true,
        data: {
          alertId: alertId,
          message: 'Alert created successfully'
        }
      });
    } catch (error) {
      console.error('Error creating alert:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getActiveAlerts(req, res) {
    try {
      const alerts = await Alert.find()
        .sort({ timestamp: -1 })
        .limit(10);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async generateWarning(req, res) {
    try {
      const { location } = req.body;
      
      // Validate request
      if (!location || !location.city || !location.state) {
        return res.status(400).json({
          success: false,
          error: 'Missing required location data: city, state'
        });
      }
      
      // Generate warning
      const warnings = await alertService.generateDisasterWarning(location);
      
      if (!warnings || warnings.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            message: 'No high-risk disasters predicted',
            warnings: []
          }
        });
      }
      
      res.status(201).json({
        success: true,
        data: {
          message: `${warnings.length} warnings generated successfully`,
          warnings: warnings
        }
      });
    } catch (error) {
      console.error('Error generating warning:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async createEvacuation(req, res) {
    try {
      const evacuationData = req.body;
      
      // Validate request
      if (!evacuationData.area || !evacuationData.reason) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: area, reason'
        });
      }
      
      // Create evacuation notice
      const noticeId = await alertService.createEvacuationNotice(evacuationData);
      
      res.status(201).json({
        success: true,
        data: {
          noticeId: noticeId,
          message: 'Evacuation notice created successfully'
        }
      });
    } catch (error) {
      console.error('Error creating evacuation notice:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async notifyUsers(req, res) {
    try {
      const { alert, area } = req.body;
      
      // Validate request
      if (!alert || !area || !area.center || !area.radius) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: alert, area (center, radius)'
        });
      }
      
      // Notify users
      const notificationCount = await alertService.notifyUsersInArea(alert, area);
      
      res.status(200).json({
        success: true,
        data: {
          notificationCount: notificationCount,
          message: `${notificationCount} users notified successfully`
        }
      });
    } catch (error) {
      console.error('Error notifying users:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  getTopics(req, res) {
    try {
      const topics = pubSubService.getTopics();
      res.json(topics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new AlertController();