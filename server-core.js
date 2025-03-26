const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const socketIO = require('socket.io');
const helmet = require('helmet');
const compression = require('compression');

// Load environment variables
dotenv.config();

// Import debug middleware
const debugMiddleware = require('./middleware/debugMiddleware');

// Export the configuration function
module.exports = function(app, server) {
  console.log('Configuring full server application...');
  
  // Add middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  
  // Add debug middleware to all routes (ONLY for development)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 Debug middleware enabled');
    app.use(debugMiddleware);
  }
  
  // Add a health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });
  
  console.log('Loading route modules...');
  
  // Import diagnostics first (this is guaranteed to work)
  let diagnosticRoutes;
  try {
    // Initialize each one with proper error handling
    let aiRoutes, alertRoutes, disasterRoutes, emergencyRoutes, evacuationRoutes, 
        geminiRoutes, mapRoutes, predictionRoutes, pushNotificationRoutes, 
        routeRoutes, safeZoneRoutes, userRoutes;

    // Initialize each one with proper error handling
    aiRoutes = require('./routes/aiRoutes');
    alertRoutes = require('./routes/alertRoutes');
    mapRoutes = require('./routes/mapRoutes');
    disasterRoutes = require('./routes/disasterRoutes');
    emergencyRoutes = require('./routes/emergencyRoutes');
    evacuationRoutes = require('./routes/evacuationRoutes');
    geminiRoutes = require('./routes/geminiRoutes');
    predictionRoutes = require('./routes/predictionRoutes');
    userRoutes = require('./routes/userRoutes');
    diagnosticRoutes = require('./routes/diagnosticRoutes');
  } catch (error) {
    console.error('⚠️ Failed to load diagnostic routes:', error.message);
    // Create an emergency diagnostics endpoint
    diagnosticRoutes = express.Router();
    diagnosticRoutes.get('/ping', (req, res) => {
      res.json({ status: 'ok', message: 'Emergency diagnostic endpoint' });
    });
  }

  // Register emergency diagnostic routes first
  app.use('/api/diagnostic', diagnosticRoutes);
  console.log('✅ Registered emergency diagnostic endpoints');

  // Define all route variables
  let aiRoutes, alertRoutes, disasterRoutes, emergencyRoutes, evacuationRoutes, 
      geminiRoutes, mapRoutes, predictionRoutes, pushNotificationRoutes, 
      routeRoutes, safeZoneRoutes, userRoutes;

  // Initialize each one with proper error handling

  // AI Routes

  try {
    aiRoutes = require('./routes/aiRoutes');
  } catch (error) {
    console.error('Failed to load AI routes:', error.message);
    aiRoutes = express.Router();
    aiRoutes.get('/*', (req, res) => res.status(503).json({error: 'AI service unavailable'}));
  }

  // Alert Routes
  try {
    alertRoutes = require('./routes/alertRoutes');
  } catch (error) {
    console.error('Failed to load Alert routes:', error.message);
    alertRoutes = express.Router();
    alertRoutes.get('/*', (req, res) => res.status(503).json({error: 'Alert service unavailable'}));
  }

  // Map Routes
  try {
    mapRoutes = require('./routes/mapRoutes');
  } catch (error) {
    console.error('Failed to load Map routes:', error.message);
    mapRoutes = express.Router();
    mapRoutes.get('/*', (req, res) => res.status(503).json({error: 'Map service unavailable'}));
  }

  // Initialize remaining route modules with the same pattern
  try {
    disasterRoutes = require('./routes/disasterRoutes');
  } catch (error) {
    console.error('Failed to load Disaster routes:', error.message);
    disasterRoutes = express.Router();
    disasterRoutes.get('/*', (req, res) => res.status(503).json({error: 'Disaster service unavailable'}));
  }

  try {
    emergencyRoutes = require('./routes/emergencyRoutes');
  } catch (error) {
    console.error('Failed to load Emergency routes:', error.message);
    emergencyRoutes = express.Router();
    emergencyRoutes.get('/*', (req, res) => res.status(503).json({error: 'Emergency service unavailable'}));
  }

  try {
    evacuationRoutes = require('./routes/evacuationRoutes');
  } catch (error) {
    console.error('Failed to load Evacuation routes:', error.message);
    evacuationRoutes = express.Router();
    evacuationRoutes.get('/*', (req, res) => res.status(503).json({error: 'Evacuation service unavailable'}));
  }

  // Continue with the same pattern for the remaining routes
  try {
    geminiRoutes = require('./routes/geminiRoutes');
  } catch (error) {
    console.error('Failed to load Gemini routes:', error.message);
    geminiRoutes = express.Router();
    geminiRoutes.get('/*', (req, res) => res.status(503).json({error: 'Gemini service unavailable'}));
  }

  try {
    predictionRoutes = require('./routes/predictionRoutes');
  } catch (error) {
    console.error('Failed to load Prediction routes:', error.message);
    predictionRoutes = express.Router();
    predictionRoutes.get('/*', (req, res) => res.status(503).json({error: 'Prediction service unavailable'}));
  }

  try {
    userRoutes = require('./routes/userRoutes');
  } catch (error) {
    console.error('Failed to load User routes:', error.message);
    userRoutes = express.Router();
    userRoutes.get('/*', (req, res) => res.status(503).json({error: 'User service unavailable'}));
  }

  try {
    diagnosticRoutes = require('./routes/diagnosticRoutes');
  } catch (error) {
    console.error('Failed to load Diagnostic routes:', error.message);
    diagnosticRoutes = express.Router();
    diagnosticRoutes.get('/*', (req, res) => res.status(503).json({error: 'Diagnostic service unavailable'}));
  }
  
  console.log('Registering API routes...');
  
  // Safe route registration function
  function registerRoutes(app, path, router, name) {
    try {
      if (router && typeof router === 'function') {
        console.log(`Registering ${path} routes`);
        app.use(path, router);
        return true;
      } else {
        console.error(`⚠️ ${name || path} is not a valid router`);
        return false;
      }
    } catch (error) {
      console.error(`⚠️ Failed to register ${name || path} routes:`, error.message);
      return false;
    }
  }

  // Register Routes with logging
  console.log('Registering /api/diagnostic routes');
  app.use('/api/diagnostic', diagnosticRoutes);

  console.log('Registering /api/ai routes');
  app.use('/api/ai', aiRoutes);
  
  console.log('Loading alertRoutes...');
  registerRoutes(app, '/api/alerts', alertRoutes, 'alertRoutes');
  registerRoutes(app, '/api/disasters', disasterRoutes, 'disasterRoutes');
  registerRoutes(app, '/api/emergency', emergencyRoutes, 'emergencyRoutes');
  registerRoutes(app, '/api/evacuation', evacuationRoutes, 'evacuationRoutes');
  registerRoutes(app, '/api/gemini', geminiRoutes, 'geminiRoutes');
  registerRoutes(app, '/api/maps', mapRoutes, 'mapRoutes');
  registerRoutes(app, '/api/predictions', predictionRoutes, 'predictionRoutes');
  registerRoutes(app, '/api/notifications', pushNotificationRoutes, 'pushNotificationRoutes');
  registerRoutes(app, '/api/routes', routeRoutes, 'routeRoutes');
  registerRoutes(app, '/api/safe-zones', safeZoneRoutes, 'safeZoneRoutes');
  registerRoutes(app, '/api/users', userRoutes, 'userRoutes');
  
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

