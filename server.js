const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const pubSubService = require('./services/pubsub/pubSubService');
const socketService = require('./services/socket/socketService');
const PushNotificationService = require('./services/notificationServices/pushNotifications/pushNotification')
const evacuationController = require('./controllers/evacuationController');


// Load environment variables
dotenv.config();

// Initialize express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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

// Import Routes
const emergencyRoutes = require('./routes/emergencyRoutes');
const mapRoutes = require('./routes/mapRoutes');
const alertRoutes = require('./routes/alertroutes');
const userRoutes = require('./routes/userRoutes');
const aiRoutes = require('./routes/aiRoutes');
const evacuationRoutes = require('./routes/evacuationRoutes'); 

// Register Routes
app.use('/api/emergency', emergencyRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/evacuation', evacuationRoutes);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,
  pingInterval: 5000
});

// Initialize socket service with the io instance
socketService.initialize(io);
PushNotificationService.notifyUsersOfDisaster();

// Add socket event listeners
io.on('connection', (socket) => {
  PushNotificationService.notifyUsersOfDisaster();
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

// Make io available to routes
app.set('io', io);

// Initialize Pub/Sub service
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
});

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

// Wrap the server startup in a try-catch
try {
  // Start the server
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1); // Exit with error code
}

// Add global unhandled exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Keep process running but log the error
});

