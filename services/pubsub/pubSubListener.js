const pubSubService = require('./pubSubService');
const alertService = require('../alerts/alertService');

/**
 * Service that listens to Pub/Sub messages and processes them
 */
class PubSubListener {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize listeners for all subscriptions
   */
  initialize() {
    if (this.initialized) return;
    
    // Check if we're in Cloud Run
    const isCloudRun = process.env.K_SERVICE !== undefined;
    
    if (isCloudRun) {
      // For Cloud Run, use pull-based subscription instead of streaming
      console.log('Using pull-based PubSub subscription for Cloud Run');
      this.initializePullSubscriptions();
    } else {
      // For local development, use streaming
      console.log('Using streaming PubSub subscription for local development');
      this.initializeStreamingSubscriptions();
    }
    
    this.initialized = true;
  }

  /**
   * Initialize pull-based subscriptions for Cloud Run
   */
  initializePullSubscriptions() {
    // Setup periodic polling instead of streaming
    setInterval(async () => {
      try {
        await this.pullMessages(pubSubService.getSubscriptions().EMERGENCY_ALERTS_SUB);
        await this.pullMessages(pubSubService.getSubscriptions().DISASTER_WARNINGS_SUB);
        // Add other subscriptions as needed
      } catch (error) {
        console.error('Error pulling messages:', error);
      }
    }, 30000); // Poll every 30 seconds
  }

  /**
   * Pull messages manually
   * @param {string} subscriptionName - Subscription name
   */
  async pullMessages(subscriptionName) {
    try {
      const messages = await pubSubService.pullMessages(subscriptionName, 10);
      for (const message of messages) {
        const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
        // Process based on subscription
        if (subscriptionName.includes('emergency-alerts')) {
          await this.handleEmergencyAlert(data, message.attributes);
        }
        // Handle other message types...
        
        // Acknowledge the message
        await pubSubService.acknowledgeMessage(subscriptionName, message.ackId);
      }
    } catch (error) {
      console.error(`Error pulling messages from ${subscriptionName}:`, error);
    }
  }

  /**
   * Initialize streaming subscriptions for local development
   */
  initializeStreamingSubscriptions() {
    const subscriptions = pubSubService.getSubscriptions();
    
    // Subscribe to emergency alerts
    pubSubService.subscribeToTopic(
      subscriptions.EMERGENCY_ALERTS_SUB,
      this.handleEmergencyAlert
    );
    
    // Subscribe to disaster warnings
    pubSubService.subscribeToTopic(
      subscriptions.DISASTER_WARNINGS_SUB,
      this.handleDisasterWarning
    );
    
    // Subscribe to evacuation notices
    pubSubService.subscribeToTopic(
      subscriptions.EVACUATION_NOTICES_SUB,
      this.handleEvacuationNotice
    );
    
    // Subscribe to system notifications
    pubSubService.subscribeToTopic(
      subscriptions.SYSTEM_NOTIFICATIONS_SUB,
      this.handleSystemNotification
    );
    
    console.log('🔔 PubSub listeners initialized');
  }

  /**
   * Handle emergency alert messages
   * @param {Object} data - Message data
   * @param {Object} attributes - Message attributes
   */
  async handleEmergencyAlert(data, attributes) {
    console.log('📢 Received emergency alert:', data.title);
    
    try {
      // Store in database for API access
      await alertService.storeAlertInDatabase(data);
      
      // Find affected users
      if (data.location) {
        const area = {
          center: {
            lat: data.location.lat,
            lng: data.location.lng
          },
          radius: data.location.radius || 10000 // Default 10km
        };
        
        const users = await alertService.getUsersInArea(area);
        console.log(`Found ${users.length} users in affected area`);
        
        // Send FCM notifications to each user
        for (const user of users) {
          await alertService.sendUserNotification(user, data);
        }
      }
    } catch (error) {
      console.error('Error processing emergency alert:', error);
    }
  }

  // Similar handlers for other message types
  async handleDisasterWarning(data, attributes) {
    console.log('📢 Received disaster warning:', data.title);
    // Similar implementation...
  }
  
  async handleEvacuationNotice(data, attributes) {
    console.log('📢 Received evacuation notice:', data.title);
    // Similar implementation...
  }
  
  async handleSystemNotification(data, attributes) {
    console.log('📢 Received system notification:', data.type);
    // Similar implementation...
  }
}

module.exports = new PubSubListener();