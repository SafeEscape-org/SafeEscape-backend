const admin = require('firebase-admin');
const geolib = require('geolib');

/**
 * Disaster management component for socket service
 */
class DisasterManager {
  constructor(io, userManager) {
    this.io = io;
    this.userManager = userManager;
    this.disasterCheckInterval = null;
  }
  
  /**
   * Start periodic disaster checks
   */
  startDisasterChecks() {
    console.log('Starting disaster checks');
    
    if (!this.disasterCheckInterval) {
      console.log('Starting periodic disaster checks');
      
      // Run an initial check
      console.log("Running initial check");
      this.checkForDisasters();
    }
  }
  
  /**
   * Check for disasters near connected users
   */
  async checkForDisasters() {
    try {
      console.log('Checking for disasters near connected users');
      
      // Skip if no users are connected
      const connectedUsers = this.userManager.getConnectedUsers();
      if (connectedUsers.size === 0) {
        console.log('No connected users, skipping disaster check');
        return;
      }
      
      // Get active disasters from Firestore
      const disastersSnapshot = await admin.firestore()
        .collection('disasters')
        .where('active', '==', true)
        .get();
      
      if (disastersSnapshot.empty) {
        console.log('No active disasters found');
        return;
      }
      
      // Process each disaster
      disastersSnapshot.forEach(doc => {
        const disaster = { id: doc.id, ...doc.data() };
        this.processDisaster(disaster);
      });
    } catch (error) {
      console.error('Error checking for disasters:', error);
    }
  }
  
  /**
   * Process a disaster and notify nearby users
   * @param {Object} disaster - Disaster data
   */
  processDisaster(disaster) {
    // Skip if disaster has no location
    if (!disaster.location || !disaster.location.latitude || !disaster.location.longitude) {
      console.log(`Disaster ${disaster.id} has no valid location`);
      return;
    }
    
    const disasterLocation = {
      latitude: disaster.location.latitude,
      longitude: disaster.location.longitude
    };
    
    const radius = disaster.radius || 50000; // Default 50km radius
    const affectedUsers = [];
    
    // Batch process users instead of iterating one by one
    const userBatch = Array.from(this.userManager.getConnectedUsers().entries());
    
    // Process users in parallel using Promise.all for better performance
    Promise.all(userBatch.map(([userId, user]) => {
      return new Promise(resolve => {
        // Extract user location efficiently
        let userLocation = this.userManager.extractUserLocation(user);
        
        if (!userLocation) {
          resolve(); // Skip this user
          return;
        }
        
        // Calculate distance between user and disaster
        const distance = geolib.getDistance(userLocation, disasterLocation);
        
        // If user is within disaster radius, add to affected users
        if (distance <= radius) {
          affectedUsers.push({
            userId,
            socketId: user.socketId,
            distance,
            location: userLocation
          });
        }
        resolve();
      });
    })).then(() => {
      console.log(`Found ${affectedUsers.length} users affected by disaster ${disaster.id}`);
      
      // Notify affected users if any
      if (affectedUsers.length > 0) {
        // Use optimized notification method
        this.notifyAffectedUsersOptimized(disaster, affectedUsers);
      }
    }).catch(error => {
      console.error(`Error processing disaster ${disaster.id}:`, error);
    });
  }
  
  /**
   * Optimized method to notify affected users
   * @param {Object} disaster - Disaster data
   * @param {Array} affectedUsers - List of affected users
   */
  notifyAffectedUsersOptimized(disaster, affectedUsers) {
    console.log(`Notifying ${affectedUsers.length} users about disaster ${disaster.id}`);
    
    // Prepare disaster warning data once (don't recreate for each user)
    const warningData = {
      id: `disaster-${disaster.id}`,
      title: disaster.title || 'Disaster Warning',
      message: disaster.description || 'A disaster has been reported in your area',
      type: disaster.type || 'unknown',
      severity: disaster.severity || 'high',
      location: {
        city: disaster.location.city || 'Unknown',
        state: disaster.location.state || 'Unknown',
        coordinates: {
          latitude: disaster.location.latitude,
          longitude: disaster.location.longitude
        }
      },
      timestamp: new Date().toISOString(),
      instructions: disaster.instructions || 'Stay alert and follow official guidance'
    };
    
    const attributes = {
      severity: disaster.severity || 'high',
      region: `${disaster.location.city || ''},${disaster.location.state || ''}`,
      source: 'automated-check'
    };
    
    // Group users by city for more efficient room-based notifications
    const usersByCity = {};
    const usersByState = {};
    
    // Process users in batches to prevent blocking
    const batchSize = 10;
    let successCount = 0;
    
    // Process users in smaller batches
    for (let i = 0; i < affectedUsers.length; i += batchSize) {
      const batch = affectedUsers.slice(i, i + batchSize);
      
      // Use setTimeout to prevent blocking the event loop
      setTimeout(() => {
        batch.forEach(user => {
          // Create personalized warning with distance information
          const distanceKm = (user.distance/1000).toFixed(2);
          
          // Send disaster warning - match the frontend listener
          const disasterWarning = {
            warning: warningData,
            attributes: attributes,
            distance: user.distance,
            distanceKm: distanceKm,
            personalMessage: `You are approximately ${distanceKm} km from this ${disaster.type || 'disaster'}.`
          };
          this.userManager.sendToUser(user.userId, 'disaster-warning', disasterWarning);
          
          // For severe disasters, also send as emergency alert
          if (disaster.severity === 'high' || disaster.severity === 'critical') {
            const emergencyAlert = {
              alert: warningData,
              attributes: attributes,
              distance: user.distance,
              distanceKm: distanceKm,
              personalMessage: `URGENT: You are approximately ${distanceKm} km from this ${disaster.type || 'disaster'}.`
            };
            this.userManager.sendToUser(user.userId, 'emergency-alert', emergencyAlert);
          }
          
          // If evacuation is recommended, send evacuation notice
          if (disaster.evacuation) {
            const evacuationNotice = {
              notice: {
                ...warningData,
                title: `Evacuation: ${warningData.title}`,
                evacuationZone: disaster.evacuationZone || 'Affected area',
                evacuationRoutes: disaster.evacuationRoutes || ['Follow official guidance']
              },
              attributes: attributes,
              distance: user.distance
            };
            this.userManager.sendToUser(user.userId, 'evacuation-notice', evacuationNotice);
          }
          
          successCount++;
          
          // Group by city and state for room broadcasts
          if (disaster.location.city) {
            const city = disaster.location.city.toLowerCase();
            if (!usersByCity[city]) usersByCity[city] = [];
            usersByCity[city].push(user.userId);
          }
          
          if (disaster.location.state) {
            const state = disaster.location.state.toLowerCase();
            if (!usersByState[state]) usersByState[state] = [];
            usersByState[state].push(user.userId);
          }
        });
        
        console.log(`Processed batch of ${batch.length} users for disaster ${disaster.id}`);
      }, Math.floor(i/batchSize) * 100); // Stagger batches by 100ms
    }
    
    // Broadcast to city rooms (more efficient than individual messages)
    setTimeout(() => {
      // Broadcast to relevant city/state rooms
      if (disaster.location.city) {
        const cityRoom = `city-${disaster.location.city.toLowerCase()}`;
        this.io.to(cityRoom).emit('disaster-warning', {
          warning: warningData,
          attributes: attributes
        });
      }
      
      console.log(`Successfully sent notifications to ${successCount} out of ${affectedUsers.length} affected users`);
    }, 500);
  }
  
  /**
   * Send all active disasters to a specific user
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID
   */
  async sendActiveDisastersToUser(userId, socketId) {
    try {
      console.log(`Sending active disasters to user ${userId} (socket: ${socketId})`);
      
      // Get active disasters from Firestore
      const disastersSnapshot = await admin.firestore()
        .collection('disasters')
        .where('active', '==', true)
        .get();
      
      if (disastersSnapshot.empty) {
        console.log('No active disasters found to send');
        this.userManager.sendToUser(userId, 'active-disasters', { 
          count: 0,
          message: 'No active disasters in your area',
          disasters: []
        });
        return;
      }
      
      // Get user location
      const userInfo = this.userManager.getConnectedUsers().get(userId);
      if (!userInfo || !userInfo.location) {
        console.log(`No location information for user ${userId}`);
        return;
      }
      
      // Extract user location using our helper method
      const userLocation = this.userManager.extractUserLocation(userInfo);
      if (!userLocation) {
        console.log(`Could not extract valid location for user ${userId}`);
        return;
      }
      
      // Process each disaster
      const relevantDisasters = [];
      disastersSnapshot.forEach(doc => {
        const disaster = { id: doc.id, ...doc.data() };
        
        // Skip if disaster has no location
        if (!disaster.location || !disaster.location.latitude || !disaster.location.longitude) {
          return;
        }
        
        const disasterLocation = {
          latitude: disaster.location.latitude,
          longitude: disaster.location.longitude
        };
        
        const radius = disaster.radius || 50000; // Default 50km radius
        
        // Calculate distance between user and disaster
        const distance = geolib.getDistance(userLocation, disasterLocation);
        
        // If user is within disaster radius, add to relevant disasters
        if (distance <= radius) {
          relevantDisasters.push({
            ...disaster,
            distance: distance,
            distanceKm: (distance/1000).toFixed(2)
          });
        }
      });
      
      console.log(`Found ${relevantDisasters.length} relevant disasters for user ${userId}`);
      
      // Send relevant disasters to user
      if (relevantDisasters.length > 0) {
        // Send as a batch first
        this.userManager.sendToUser(userId, 'active-disasters', {
          count: relevantDisasters.length,
          message: `${relevantDisasters.length} active disasters in your area`,
          disasters: relevantDisasters,
          timestamp: new Date().toISOString()
        });
        
        // Process disasters in batches to prevent overwhelming the connection
        const batchSize = 2;
        for (let i = 0; i < relevantDisasters.length; i += batchSize) {
          const batch = relevantDisasters.slice(i, i + batchSize);
          
          // Use setTimeout to stagger notifications
          setTimeout(() => {
            batch.forEach(disaster => {
              // Prepare disaster warning data
              const warningData = {
                id: `disaster-${disaster.id}`,
                title: disaster.title || 'Disaster Warning',
                message: disaster.description || 'A disaster has been reported in your area',
                type: disaster.type || 'unknown',
                severity: disaster.severity || 'high',
                location: {
                  city: disaster.location.city || 'Unknown',
                  state: disaster.location.state || 'Unknown',
                  coordinates: {
                    latitude: disaster.location.latitude,
                    longitude: disaster.location.longitude
                  }
                },
                timestamp: new Date().toISOString(),
                instructions: disaster.instructions || 'Stay alert and follow official guidance'
              };
              
              const attributes = {
                severity: disaster.severity || 'high',
                region: `${disaster.location.city || ''},${disaster.location.state || ''}`,
                source: 'reconnection-update'
              };
              
              // Create personalized warning with distance information
              const personalizedWarning = {
                warning: warningData,
                attributes: attributes,
                distance: disaster.distance,
                personalMessage: `You are approximately ${disaster.distanceKm} km from this ${disaster.type || 'disaster'}.`
              };
              
              // Send the disaster alert - using the events the frontend is listening for
              this.userManager.sendToUser(userId, 'disaster-warning', personalizedWarning);
              
              // For severe disasters, also send as emergency alert
              if (disaster.severity === 'high' || disaster.severity === 'critical') {
                this.userManager.sendToUser(userId, 'emergency-alert', {
                  alert: warningData,
                  attributes: attributes,
                  distance: disaster.distance,
                  personalMessage: `URGENT: You are approximately ${disaster.distanceKm} km from this ${disaster.type || 'disaster'}.`
                });
              }
              
              // If evacuation is recommended, send evacuation notice
              if (disaster.evacuation) {
                this.userManager.sendToUser(userId, 'evacuation-notice', {
                  notice: {
                    ...warningData,
                    title: `Evacuation: ${warningData.title}`,
                    evacuationZone: disaster.evacuationZone || 'Affected area',
                    evacuationRoutes: disaster.evacuationRoutes || ['Follow official guidance']
                  },
                  attributes: attributes,
                  distance: disaster.distance
                });
              }
            });
          }, Math.floor(i/batchSize) * 500); // Stagger batches by 500ms
        }
      } else {
        // No relevant disasters found
        this.userManager.sendToUser(userId, 'active-disasters', {
          count: 0,
          message: 'No active disasters in your area',
          disasters: []
        });
      }
    } catch (error) {
      console.error(`Error sending active disasters to user ${userId}:`, error);
    }
  }
  
  /**
   * Set up periodic disaster checks
   * @param {number} intervalMinutes - Check interval in minutes
   */
  setupPeriodicChecks(intervalMinutes = 5) {
    // Clear any existing interval
    if (this.disasterCheckInterval) {
      clearInterval(this.disasterCheckInterval);
    }
    
    // Convert minutes to milliseconds
    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Set up new interval
    this.disasterCheckInterval = setInterval(() => {
      console.log(`Running scheduled disaster check (every ${intervalMinutes} minutes)`);
      this.checkForDisasters();
    }, intervalMs);
    
    console.log(`Scheduled disaster checks every ${intervalMinutes} minutes`);
    
    // Run an initial check
    this.checkForDisasters();
  }
  
  /**
   * Stop periodic disaster checks
   */
  stopPeriodicChecks() {
    if (this.disasterCheckInterval) {
      clearInterval(this.disasterCheckInterval);
      this.disasterCheckInterval = null;
      console.log('Stopped periodic disaster checks');
    }
  }
}

module.exports = DisasterManager;