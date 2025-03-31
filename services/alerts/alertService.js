const pubSubService = require('../pubsub/pubSubService');
const disasterPrediction = require('../vertexai/disasterPrediction');
const firebaseAdmin = require('../firebase/firebaseAdmin');
const { getDistance } = require('geolib');

/**
 * Alert service for generating and distributing alerts
 */
const alertService = {
  /**
   * Generate and publish an emergency alert
   * @param {Object} alertData - Alert data
   * @returns {string} Alert ID
   */
  async createEmergencyAlert(alertData) {
    try {
      // Validate alert data
      if (!alertData.title || !alertData.message || !alertData.location) {
        throw new Error('Invalid alert data');
      }
      
      // Add metadata
      const alert = {
        ...alertData,
        id: `alert-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'active'
      };
      
      // Publish to Pub/Sub if available
      try {
        const topics = pubSubService.getTopics();
        await pubSubService.publishMessage(topics.EMERGENCY_ALERTS, alert, {
          severity: alertData.severity || 'high',
          type: alertData.type || 'emergency',
          region: alertData.region || 'all'
        });
      } catch (pubsubError) {
        console.error('Warning: Could not publish to Pub/Sub:', pubsubError.message);
      }
      
      console.log('Created emergency alert:', alert.id);
      
      return alert.id;
    } catch (error) {
      console.error('Error creating emergency alert:', error);
      throw error;
    }
  },
  
  /**
   * Generate and publish a disaster warning based on AI prediction
   * @param {Object} location - Location data
   * @returns {Object} Warning data
   */
  async generateDisasterWarning(location) {
    try {
      console.log('Generating disaster warning for location:', location);
      
      // Get AI prediction
      const prediction = await disasterPrediction.getPredictiveAnalysis(location);
      
      // Check if there are high-risk predictions
      const highRisks = prediction.risks.filter(risk => 
        ['High', 'Extreme', 'Medium'].includes(risk.riskLevel)
      );
      
      if (highRisks.length === 0) {
        console.log('No high-risk disasters predicted');
        return [];
      }
      
      // Create warning for each high-risk disaster
      const warnings = await Promise.all(highRisks.map(async (risk) => {
        const warning = {
          id: `warning-${Date.now()}-${risk.disasterType}`,
          title: `${risk.riskLevel} Risk: ${risk.disasterType}`,
          message: `There is a ${risk.riskLevel.toLowerCase()} risk of ${risk.disasterType} in ${location.city}, ${location.state}.`,
          details: {
            disasterType: risk.disasterType,
            riskLevel: risk.riskLevel,
            indicators: risk.indicators,
            precautions: risk.precautions
          },
          location: location,
          timestamp: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          source: 'AI Prediction'
        };
        
        // Publish to Pub/Sub if available
        try {
          const topics = pubSubService.getTopics();
          await pubSubService.publishMessage(topics.DISASTER_WARNINGS, warning, {
            severity: this.mapRiskLevelToSeverity(risk.riskLevel),
            type: risk.disasterType,
            region: `${location.city},${location.state}`
          });
        } catch (pubsubError) {
          console.error('Warning: Could not publish to Pub/Sub:', pubsubError.message);
        }
        
        return warning;
      }));
      
      return warnings;
    } catch (error) {
      console.error('Error generating disaster warning:', error);
      throw error;
    }
  },
  
  /**
   * Generate and publish an evacuation notice
   * @param {Object} evacuationData - Evacuation data
   * @returns {string} Evacuation notice ID
   */
  async createEvacuationNotice(evacuationData) {
    try {
      // Validate evacuation data
      if (!evacuationData.area || !evacuationData.reason) {
        throw new Error('Invalid evacuation data');
      }
      
      // Add metadata
      const notice = {
        ...evacuationData,
        id: `evac-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'active',
        type: 'evacuation'
      };
      
      // Publish to Pub/Sub if available
      try {
        const topics = pubSubService.getTopics();
        await pubSubService.publishMessage(topics.EVACUATION_NOTICES, notice, {
          severity: evacuationData.severity || 'high',
          type: 'evacuation',
          region: evacuationData.area.region || 'all'
        });
      } catch (pubsubError) {
        console.error('Warning: Could not publish to Pub/Sub:', pubsubError.message);
      }
      
      console.log('Created evacuation notice:', notice.id);
      
      return notice.id;
    } catch (error) {
      console.error('Error creating evacuation notice:', error);
      throw error;
    }
  },
  
  /**
   * Find users in affected area and send notifications
   * @param {Object} alert - Alert data
   * @param {Object} area - Geographic area
   * @returns {number} Number of notifications sent
   */
  async notifyUsersInArea(alert, area) {
    try {
      console.log('Notifying users for alert:', alert.title);
      console.log('Area:', area);
      
      // Mock notification count
      return 5;
    } catch (error) {
      console.error('Error notifying users in area:', error);
      throw error;
    }
  },
  
  /**
   * Store alert in database
   * @param {Object} alert - Alert data
   */
  async storeAlertInDatabase(alert) {
    // Implement based on your database
    // Example with Firebase:
    try {
      const db = firebaseAdmin.firestore();
      await db.collection('alerts').doc(alert.id).set(alert);
      console.log(`Alert ${alert.id} stored in database`);
    } catch (error) {
      console.error(`Error storing alert ${alert.id} in database:`, error);
    }
  },
  
  /**
   * Get users in a geographic area
   * @param {Object} area - Geographic area
   * @returns {Array} List of users
   */
  async getUsersInArea(area) {
    // Implement based on your database
    // Example with Firebase:
    try {
      const users = [];
      const db = firebaseAdmin.firestore();
      
      // Get all users
      const usersSnapshot = await db.collection('users').get();
      
      // Filter users by location
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        
        if (user.location && user.location.lat && user.location.lng) {
          // Check if user is in the affected area
          const userLocation = {
            latitude: user.location.lat,
            longitude: user.location.lng
          };
          
          const areaCenter = {
            latitude: area.center.lat,
            longitude: area.center.lng
          };
          
          // Calculate distance between user and area center
          const distance = getDistance(userLocation, areaCenter);
          
          // If user is within the radius, add to the list
          if (distance <= area.radius) {
            users.push({
              id: doc.id,
              ...user
            });
          }
        }
      });
      
      return users;
    } catch (error) {
      console.error('Error getting users in area:', error);
      return [];
    }
  },
  
  /**
   * Send notification to a user
   * @param {Object} user - User data
   * @param {Object} alert - Alert data
   * @returns {boolean} Success status
   */
  async sendUserNotification(user, alert) {
    try {
      // Check if user has FCM token
      if (!user.fcmToken) {
        console.log(`User ${user.id} does not have FCM token`);
        return false;
      }
      
      // Prepare notification
      const notification = {
        title: alert.title,
        body: alert.message,
        data: {
          alertId: alert.id,
          type: alert.type || 'emergency',
          timestamp: alert.timestamp,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        }
      };
      
      // Send FCM notification
      await firebaseAdmin.messaging().send({
        token: user.fcmToken,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data
      });
      
      console.log(`Notification sent to user ${user.id}`);
      return true;
    } catch (error) {
      console.error(`Error sending notification to user ${user.id}:`, error);
      return false;
    }
  },
  
  /**
   * Map risk level to severity
   * @param {string} riskLevel - Risk level
   * @returns {string} Severity
   */
  mapRiskLevelToSeverity(riskLevel) {
    const map = {
      'Low': 'info',
      'Medium': 'warning',
      'High': 'high',
      'Extreme': 'critical'
    };
    
    return map[riskLevel] || 'info';
  }
};

module.exports = alertService; 