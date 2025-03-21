const socketIO = require('socket.io');
const pubSubService = require('../pubsub/pubSubService');
const admin = require('firebase-admin');
const geolib = require('geolib'); // You'll need to install this: npm install geolib

// Import the UserManager component
const UserManager = require('./components/userManager');
const NotificationHandler = require('./components/notificationHandler');
const DisasterManager = require('./components/disasterManager');

/**
 * Socket.IO service for real-time communication
 */
const socketService = {
  io: null,
  connectedUsers: new Map(), // Store connected users with their locations
  userManager: null,
  notificationHandler: null,
  disasterManager: null,
  
  /**
   * Initialize Socket.IO server
   * @param {Object} io - Socket.IO instance
   */
  initialize(io) {
    // Store the provided io instance
    this.io = io;
    
    console.log('Socket.IO service initialized');
    
    // Initialize component managers
    this.userManager = new UserManager(io, this.connectedUsers);
    this.notificationHandler = new NotificationHandler(io, this.userManager);
    this.disasterManager = new DisasterManager(io, this.userManager);
    
    // Store reference to socketService for use in callbacks
    const self = this;
    
    // Set up connection handler
    this.io.on('connection', (socket) => {
      console.log(`Client connected to socketService: ${socket.id}`);
      
      // Add debug listener for all events
      socket.onAny((eventName, ...args) => {
        console.log(`[DEBUG] Socket ${socket.id} received event: ${eventName}`, JSON.stringify(args));
      });
      
      // Send welcome message to confirm connection
      socket.emit('welcome', { message: 'Connected to SafeEscape server' });
      
      // Add a test method to verify messaging is working
      socket.on('test-connection', (data) => {
        console.log(`Received test-connection from ${socket.id}:`, data);
        
        // Send direct response
        socket.emit('test-response', { 
          message: 'Direct socket response',
          timestamp: new Date().toISOString()
        });
        
        // If user ID is provided, test room-based messaging
        if (data && data.userId) {
          self.userManager.sendToUser(data.userId, 'test-user-message', {
            message: 'Room-based message test',
            timestamp: new Date().toISOString()
          });
        }
      });
      
      // Handle ping for testing
      socket.on('ping', (data) => {
        console.log(`Received ping from ${socket.id}:`, data);
        socket.emit('pong', { time: new Date().toISOString() });
      });
      
      // Add explicit event listeners for all expected events
      socket.on('emergency-alert', (data) => {
        console.log(`Received emergency-alert from ${socket.id}:`, JSON.stringify(data));
        socket.emit('emergency-alert-received', { received: true, timestamp: new Date().toISOString() });
      });
      
      socket.on('disaster-warning', (data) => {
        console.log(`Received disaster-warning from ${socket.id}:`, JSON.stringify(data));
        socket.emit('disaster-warning-received', { received: true, timestamp: new Date().toISOString() });
      });
      
      socket.on('evacuation-notice', (data) => {
        console.log(`Received evacuation-notice from ${socket.id}:`, JSON.stringify(data));
        socket.emit('evacuation-notice-received', { received: true, timestamp: new Date().toISOString() });
      });
      
      // Add test event to verify socket communication
      socket.on('test-notification', () => {
        console.log(`Received test notification request from ${socket.id}`);
        socket.emit('test-notification-response', { 
          success: true, 
          message: 'Test notification received and processed',
          timestamp: new Date().toISOString()
        });
      });
      
      // Handle user registration - use both 'register' and 'register_user' events for compatibility
      socket.on('register', handleUserRegistration);
      socket.on('register_user', handleUserRegistration);
      
      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        self.userManager.handleDisconnect(socket);
      });
      
      // Function to handle user registration (used by both register events)
      function handleUserRegistration(userData) {
        console.log(`Register event received from ${socket.id} with data:`, JSON.stringify(userData));
        
        // Check if userData is a string (from alternative format test)
        if (typeof userData === 'string') {
          try {
            userData = JSON.parse(userData);
          } catch (error) {
            console.error('Error parsing userData string:', error);
            socket.emit('registered', {
              success: false,
              message: 'Invalid user data format'
            });
            return;
          }
        }
        
        try {
          // Validate user data
          if (!userData || !userData.userId) {
            console.error('Invalid user data received:', userData);
            socket.emit('registered', {
              success: false,
              message: 'Invalid user data. userId is required.'
            });
            return;
          }
          
          // Register user with the userManager component
          const registeredUserId = self.userManager.registerUser(socket, userData);
          
          // If registration was successful and we have location data, send active disasters
          if (registeredUserId && userData.location) {
            console.log(`Immediately sending active disasters to newly registered user ${registeredUserId}`);
            self.disasterManager.sendActiveDisastersToUser(registeredUserId, socket.id);
          }
          
          // Start disaster checks if not already running
          self.disasterManager.startDisasterChecks();
        } catch (error) {
          console.error('Error registering user:', error);
          socket.emit('registered', {
            success: false,
            message: 'Failed to register for real-time updates',
            error: error.message
          });
        }
      }
    });
    
    // Subscribe to Pub/Sub topics
    this.setupPubSubSubscriptions();
  },
  
  /**
   * Set up Pub/Sub subscriptions
   */
  setupPubSubSubscriptions() {
    const subscriptions = pubSubService.getSubscriptions();
    
    // Subscribe to emergency alerts
    pubSubService.subscribeToTopic(
      subscriptions.EMERGENCY_ALERTS_SUB,
      (data, attributes) => this.notificationHandler.handleEmergencyAlert(data, attributes)
    );
    
    // Subscribe to disaster warnings
    pubSubService.subscribeToTopic(
      subscriptions.DISASTER_WARNINGS_SUB,
      (data, attributes) => this.notificationHandler.handleDisasterWarning(data, attributes)
    );
    
    // Subscribe to evacuation notices
    pubSubService.subscribeToTopic(
      subscriptions.EVACUATION_NOTICES_SUB,
      (data, attributes) => this.notificationHandler.handleEvacuationNotice(data, attributes)
    );
    
    // Subscribe to system notifications
    pubSubService.subscribeToTopic(
      subscriptions.SYSTEM_NOTIFICATIONS_SUB,
      (data, attributes) => this.notificationHandler.handleSystemNotification(data, attributes)
    );
  },
  
  /**
   * Broadcast a message to all connected clients
   * @param {string} event - Event name
   * @param {Object} data - Message data
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  },
  
  /**
   * Send a message to a specific user
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {Object} data - Message data
   */
  sendToUser(userId, event, data) {
    if (this.userManager) {
      this.userManager.sendToUser(userId, event, data);
    } else {
      console.error('UserManager not initialized');
      this.io.to(`user-${userId}`).emit(event, data);
    }
  }
};

module.exports = socketService;