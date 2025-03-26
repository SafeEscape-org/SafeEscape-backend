const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const socketIO = require('socket.io');
const helmet = require('helmet');
const compression = require('compression');

// Load environment variables
dotenv.config();

// Export the configuration function
module.exports = function(app, server) {
  console.log('Configuring full server application...');
  
  // Add middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  
  // Add a health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });
  
  console.log('Loading route modules...');
  
  // Try loading each route module separately with error handling
  let aiRoutes, alertRoutes, mapRoutes; // etc.

  try {
    console.log('Loading AI routes...');
    aiRoutes = require('./routes/aiRoutes');
  } catch (error) {
    console.error('Failed to load AI routes:', error.message);
    // Provide a simple fallback route
    aiRoutes = express.Router();
    aiRoutes.get('/*', (req, res) => res.status(503).json({error: 'AI service unavailable'}));
  }

  // Import Routes
  const disasterRoutes = require('./routes/disasterRoutes');
  const emergencyRoutes = require('./routes/emergencyRoutes');
  const evacuationRoutes = require('./routes/evacuationRoutes');
  const geminiRoutes = require('./routes/geminiRoutes');
  const predictionRoutes = require('./routes/predictionRoutes');
  const pushNotificationRoutes = require('./routes/pushNotificationAPI');
  const routeRoutes = require('./routes/routeRoutes');
  const safeZoneRoutes = require('./routes/safeZoneRoutes');
  const userRoutes = require('./routes/userRoutes');
  const diagnosticRoutes = require('./routes/diagnosticRoutes');
  
  console.log('Registering API routes...');
  
  // Register Routes with logging
  console.log('Registering /api/diagnostic routes');
  app.use('/api/diagnostic', diagnosticRoutes);

  console.log('Registering /api/ai routes');
  app.use('/api/ai', aiRoutes);
  
  console.log('Registering /api/alerts routes');
  app.use('/api/alerts', alertRoutes);
  
  console.log('Registering /api/disasters routes');
  app.use('/api/disasters', disasterRoutes);
  
  console.log('Registering /api/emergency routes');
  app.use('/api/emergency', emergencyRoutes);
  
  console.log('Registering /api/evacuation routes');
  app.use('/api/evacuation', evacuationRoutes);
  
  console.log('Registering /api/gemini routes');
  app.use('/api/gemini', geminiRoutes);
  
  console.log('Registering /api/maps routes');
  app.use('/api/maps', mapRoutes);
  
  console.log('Registering /api/predictions routes');
  app.use('/api/predictions', predictionRoutes);
  
  console.log('Registering /api/notifications routes');
  app.use('/api/notifications', pushNotificationRoutes);
  
  console.log('Registering /api/routes routes');
  app.use('/api/routes', routeRoutes);
  
  console.log('Registering /api/safe-zones routes');
  app.use('/api/safe-zones', safeZoneRoutes);
  
  console.log('Registering /api/users routes');
  app.use('/api/users', userRoutes);
  
  // Add a direct API test route
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'online',
      message: 'API is working!',
      timestamp: new Date(),
      environment: process.env.NODE_ENV
    });
  });

  // Initialize Socket.IO if not already initialized
  let io = app.get('io');
  if (!io) {
    io = socketIO(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      pingTimeout: 30000,
      pingInterval: 5000
    });
    app.set('io', io);
  }

  // Initialize socket service with the io instance
  const socketService = require('./services/socket/socketService');
  socketService.initialize(io);

  // Add socket event listeners
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    // Handle emergency alerts from clients
    socket.on('send-emergency-alert', (data) => {
      console.log('Received emergency alert:', data);
      socketService.broadcast('emergency-alert', {
        alert: data,
        attributes: { severity: data.severity || 'high' }
      });
    });

    // Handle evacuation notices from clients
    socket.on('send-evacuation-notice', (data) => {
      console.log('Received evacuation notice:', data);
      socketService.broadcast('evacuation-notice', {
        notice: data,
        attributes: { severity: data.severity || 'high' }
      });
    });

    // Handle disaster warnings from clients
    socket.on('send-disaster-warning', (data) => {
      console.log('Received disaster warning:', data);
      socketService.broadcast('disaster-warning', {
        warning: data,
        attributes: { severity: data.severity || 'high' }
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Initialize Pub/Sub service conditionally
  const pubSubService = require('./services/pubsub/pubSubService');
  if (process.env.ENABLE_PUBSUB === 'true') {
    pubSubService.initialize().then(() => {
      console.log('Pub/Sub service initialized');
      // Subscribe to topics
      const subscriptions = pubSubService.getSubscriptions();
      console.log("Subscriptions:", JSON.stringify(subscriptions, null, 2));
      
      // Set up message handlers
      pubSubService.subscribeToTopic(
        subscriptions.EMERGENCY_ALERTS_SUB,
        (data, attributes) => socketService.handleEmergencyAlert(data, attributes)
      );

      pubSubService.subscribeToTopic(
        subscriptions.EVACUATION_NOTICES_SUB,
        (data, attributes) => socketService.handleEvacuationNotice(data, attributes)
      );

      pubSubService.subscribeToTopic(
        subscriptions.DISASTER_WARNINGS_SUB,
        (data, attributes) => socketService.handleDisasterWarning(data, attributes)
      );

      pubSubService.subscribeToTopic(
        subscriptions.SYSTEM_NOTIFICATIONS_SUB,
        (data, attributes) => socketService.handleSystemNotification(data, attributes)
      );
    }).catch(error => {
      console.error('Failed to initialize PubSub service:', error);
      console.log('Continuing without PubSub integration');
    });
  } else {
    console.log('PubSub service disabled via environment variable');
  }

  // Serve static files for testing
  app.use(express.static('public'));

  // Serve the test client
  app.get('/test-pubsub', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/test-pubsub-client.html'));
  });
  app.get('/test-socket', (req, res) => {
    const testAlert = {
      id: `test-${Date.now()}`,
      title: 'Direct Socket.IO Test',
      message: 'This is a direct test from the server',
      severity: 'high',
      location: {
        city: 'Mumbai',
        state: 'Maharashtra'
      }
    };

    console.log('Sending test alert:', testAlert);
    socketService.broadcast('emergency-alert', {
      alert: testAlert,
      attributes: { severity: 'high' }
    });

    res.json({
      success: true,
      message: 'Test message sent to all clients',
      clientCount: io.engine.clientsCount,
      alert: testAlert
    });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      error: 'Something went wrong!'
    });
  });
  
  console.log('Routes registered:', 
    app._router.stack
      .filter(r => r.route)
      .map(r => `${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`)
  );

  console.log('Full server configuration complete');
  return app;
};

