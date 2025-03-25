const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const helmet = require('helmet');
const compression = require('compression');

// Load environment variables
dotenv.config();

// Initialize express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

// Root route for browser testing // remove at deployment time
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>SafeEscape API</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #e74c3c; }
          .endpoint { background: #f8f9fa; padding: 10px; margin-bottom: 10px; border-radius: 5px; }
          code { background: #eee; padding: 2px 5px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>SafeEscape API - Running Successfully</h1>
        <p>The backend server is running correctly. Use the following endpoints for testing:</p>
        
        <div class="endpoint">
          <strong>Get Safe Locations:</strong>
          <br>
          <code>GET /api/evacuation/safe-locations?lat=19.076&lng=72.8777</code>
        </div>
        
        <div class="endpoint">
          <strong>Start Emergency Chat:</strong>
          <br>
          <code>POST /api/chat/start</code>
        </div>
        
        <div class="endpoint">
          <strong>Get Disaster Reports:</strong>
          <br>
          <code>GET /api/emergency/reports</code>
        </div>
        
        <p>For full API documentation, refer to the project documentation.</p>
      </body>
    </html>
  `);
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Import Routes
const aiRoutes = require('./routes/aiRoutes');
const alertRoutes = require('./routes/alertRoutes');
const disasterRoutes = require('./routes/disasterRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const evacuationRoutes = require('./routes/evacuationRoutes');
const geminiRoutes = require('./routes/geminiRoutes');
const mapRoutes = require('./routes/mapRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const pushNotificationRoutes = require('./routes/pushNotificationAPI');
const routeRoutes = require('./routes/routeRoutes');
const safeZoneRoutes = require('./routes/safeZoneRoutes');
const userRoutes = require('./routes/userRoutes');

// Register Routes
app.use('/api/ai', aiRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/disasters', disasterRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/evacuation', evacuationRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/notifications', pushNotificationRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/safe-zones', safeZoneRoutes);
app.use('/api/users', userRoutes);

// Remove direct server initialization and move to module.exports function

module.exports = function(app, server) {
  console.log('Configuring full server application...');
  
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
  
  console.log('Full server configuration complete');
  return app;
};

