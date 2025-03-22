/**
 * Notification handler component for socket service
 */
class NotificationHandler {
  constructor(io, userManager) {
    this.io = io;
    this.userManager = userManager;
  }
  
  /**
   * Handle emergency alert
   * @param {Object} data - Alert data
   * @param {Object} attributes - Message attributes
   */
  handleEmergencyAlert(data, attributes) {
    console.log('Received emergency alert:', data.id || 'unknown');
    console.log('Alert data:', JSON.stringify(data));
    console.log('Alert attributes:', JSON.stringify(attributes));
    
    // Broadcast to all clients for testing
    this.io.emit('emergency-alert', {
      alert: data,
      attributes: attributes
    });
    
    // Determine target rooms based on location
    if (data.location) {
      const targetRooms = this.getTargetRooms(data.location, attributes.region);
      console.log('Broadcasting to rooms:', targetRooms);
      
      // Broadcast to target rooms
      targetRooms.forEach(room => {
        this.io.to(room).emit('emergency-alert', {
          alert: data,
          attributes: attributes
        });
      });
    }
    
    // Broadcast to all clients for critical alerts
    if (attributes.severity === 'critical') {
      this.io.emit('critical-alert', {
        alert: data,
        attributes: attributes
      });
    }
  }
  
  /**
   * Handle disaster warning
   * @param {Object} data - Warning data
   * @param {Object} attributes - Message attributes
   */
  handleDisasterWarning(data, attributes) {
    console.log('Received disaster warning:', data.id || 'unknown');
    
    // Broadcast to all clients for testing
    this.io.emit('disaster-warning', {
      warning: data,
      attributes: attributes
    });
    
    // Determine target rooms based on location
    if (data.location) {
      const targetRooms = this.getTargetRooms(data.location, attributes.region);
      
      // Broadcast to target rooms
      targetRooms.forEach(room => {
        this.io.to(room).emit('disaster-warning', {
          warning: data,
          attributes: attributes
        });
      });
    }
  }
  
  /**
   * Handle evacuation notice
   * @param {Object} data - Notice data
   * @param {Object} attributes - Message attributes
   */
  handleEvacuationNotice(data, attributes) {
    console.log('Received evacuation notice:', data.id || 'unknown');
    
    // Broadcast to all clients for testing
    this.io.emit('evacuation-notice', {
      notice: data,
      attributes: attributes
    });
    
    // Determine target rooms based on location
    if (data.area) {
      const targetRooms = this.getTargetRooms(data.area, attributes.region);
      
      // Broadcast to target rooms
      targetRooms.forEach(room => {
        this.io.to(room).emit('evacuation-notice', {
          notice: data,
          attributes: attributes
        });
      });
    }
    
    // Broadcast to all clients for critical evacuations
    if (attributes.severity === 'critical') {
      this.io.emit('critical-evacuation', {
        notice: data,
        attributes: attributes
      });
    }
  }
  
  /**
   * Handle system notification
   * @param {Object} data - Notification data
   * @param {Object} attributes - Message attributes
   */
  handleSystemNotification(data, attributes) {
    console.log('Received system notification:', data.id || 'unknown');
    
    // Broadcast to all clients
    this.io.emit('system-notification', {
      notification: data,
      attributes: attributes
    });
  }
  
  /**
   * Get target rooms based on location
   * @param {Object} location - Location data
   * @param {string} region - Region string
   * @returns {Array} List of room names
   */
  getTargetRooms(location, region) {
    const rooms = [];
    
    // Add country room
    rooms.push('country-india');
    
    // Add state room if available
    if (location && location.state) {
      rooms.push(`state-${location.state.toLowerCase()}`);
    }
    
    // Add city room if available
    if (location && location.city) {
      rooms.push(`city-${location.city.toLowerCase()}`);
    }
    
    // Add region room if specified
    if (region && region !== 'all') {
      const regionParts = region.split(',');
      if (regionParts.length > 0) {
        rooms.push(`city-${regionParts[0].toLowerCase()}`);
      }
      if (regionParts.length > 1) {
        rooms.push(`state-${regionParts[1].toLowerCase()}`);
      }
    }
    
    return rooms;
  }
  
  /**
   * Broadcast a message to all connected clients
   * @param {string} event - Event name
   * @param {Object} data - Message data
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  }
}

module.exports = NotificationHandler;