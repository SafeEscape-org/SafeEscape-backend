const admin = require('firebase-admin');

/**
 * User management component for socket service
 */
class UserManager {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
  }
  
  /**
   * Register a user for real-time updates
   * @param {Object} socket - Socket.IO socket
   * @param {Object} userData - User data
   */
  registerUser(socket, userData) {
    try {
      console.log(`Registering user: ${userData.userId}`);
      console.log('User data received:', JSON.stringify(userData));
      
      // Validate user data
      if (!userData || !userData.userId) {
        console.error('Invalid user data received:', userData);
        socket.emit('registered', {
          success: false,
          message: 'Invalid user data. userId is required.'
        });
        return;
      }
      
      // Store user data in socket
      socket.userData = userData;
      
      // Store user in connected users map with their location
      if (userData.location) {
        // Handle different location formats
        let locationCoordinates = null;
        
        if (userData.location.coordinates) {
          // Check if coordinates is an array [longitude, latitude] (GeoJSON format)
          if (Array.isArray(userData.location.coordinates) && userData.location.coordinates.length === 2) {
            locationCoordinates = {
              longitude: userData.location.coordinates[0],
              latitude: userData.location.coordinates[1]
            };
            console.log(`Parsed coordinates from array: ${JSON.stringify(locationCoordinates)}`);
          } 
          // Check if coordinates is an object with lat/lng properties
          else if (typeof userData.location.coordinates === 'object') {
            locationCoordinates = userData.location.coordinates;
            console.log(`Using coordinates object: ${JSON.stringify(locationCoordinates)}`);
          }
        }
        
        this.connectedUsers.set(userData.userId, {
          socketId: socket.id,
          location: locationCoordinates || userData.location,
          userData: userData
        });
        
        console.log(`Stored user location: ${JSON.stringify(this.connectedUsers.get(userData.userId).location)}`);
      }
      
      // Join user-specific room
      socket.join(`user-${userData.userId}`);
      
      // Join location-based rooms
      if (userData.location) {
        const city = userData.location.city?.toLowerCase();
        const state = userData.location.state?.toLowerCase();
        
        if (city) {
          socket.join(`city-${city}`);
          console.log(`User joined room: city-${city}`);
        }
        if (state) {
          socket.join(`state-${state}`);
          console.log(`User joined room: state-${state}`);
        }
        
        // Join country room
        socket.join('country-india');
        console.log(`User joined room: country-india`);
      }
      
      // Confirm registration - send this immediately and with multiple methods
      console.log(`Sending registration confirmation to user ${userData.userId}`);
      const registrationData = {
        success: true,
        message: 'Successfully registered for real-time updates',
        userId: userData.userId
      };
      
      // Method 1: Direct emit
      socket.emit('registered', registrationData);
      
      // Method 2: Emit to user-specific room
      this.io.to(`user-${userData.userId}`).emit('registered', registrationData);
      
      // Method 3: Delayed emit as backup
      setTimeout(() => {
        socket.emit('registered', {...registrationData, delayed: true});
      }, 1000);
      
      console.log('Registration confirmation sent via multiple methods');
      
      return userData.userId;
    } catch (error) {
      console.error('Error registering user:', error);
      socket.emit('registered', {
        success: false,
        message: 'Failed to register for real-time updates',
        error: error.message
      });
      return null;
    }
  }
  
  /**
   * Send a direct message to a specific user
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {Object} data - Message data
   * @returns {boolean} Success status
   */
  sendToUser(userId, event, data) {
    try {
      // Add debug logging to track message sending
      console.log(`Attempting to send ${event} to user ${userId}`);
      
      // Check if user exists in connected users map
      const userInfo = this.connectedUsers.get(userId);
      if (!userInfo) {
        console.warn(`User ${userId} not found in connected users map`);
        return false;
      }
      
      // Try sending to both user room and directly to socket if available
      this.io.to(`user-${userId}`).emit(event, data);
      
      // If we have the socket ID, also try sending directly to that socket
      if (userInfo.socketId) {
        const socket = this.io.sockets.sockets.get(userInfo.socketId);
        if (socket) {
          console.log(`Also sending ${event} directly to socket ${userInfo.socketId}`);
          socket.emit(event, data);
        } else {
          console.warn(`Socket ${userInfo.socketId} not found, but continuing with room emission`);
        }
      }
      
      console.log(`Successfully sent ${event} to user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error sending ${event} to user ${userId}:`, error);
      return false;
    }
  }
  
  /**
   * Extract user location from various possible formats
   * @param {Object} user - User object
   * @returns {Object|null} - Normalized location object or null
   */
  extractUserLocation(user) {
    if (!user || !user.location) return null;
    
    // If location already has latitude/longitude properties
    if (user.location.latitude !== undefined && user.location.longitude !== undefined) {
      return {
        latitude: user.location.latitude,
        longitude: user.location.longitude
      };
    }
    
    // If location has coordinates as an array [longitude, latitude] (GeoJSON format)
    if (Array.isArray(user.location.coordinates) && user.location.coordinates.length === 2) {
      return {
        latitude: user.location.coordinates[1],
        longitude: user.location.coordinates[0]
      };
    }
    
    // If userData has location with coordinates
    if (user.userData?.location?.coordinates) {
      // Handle array format
      if (Array.isArray(user.userData.location.coordinates) && 
          user.userData.location.coordinates.length === 2) {
        return {
          latitude: user.userData.location.coordinates[1],
          longitude: user.userData.location.coordinates[0]
        };
      }
    }
    
    return null;
  }
  
  /**
   * Get all connected users
   * @returns {Map} Map of connected users
   */
  getConnectedUsers() {
    return this.connectedUsers;
  }
  
  /**
   * Get user count
   * @returns {number} Number of connected users
   */
  getUserCount() {
    return this.connectedUsers.size;
  }
}

module.exports = UserManager;