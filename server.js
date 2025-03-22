const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const pubSubService = require('./services/pubsub/pubSubService');
const socketService = require('./services/socket/socketService');


// Load environment variables
dotenv.config();

// Initialize express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import Routes
const emergencyRoutes = require('./routes/emergencyRoutes');
const mapRoutes = require('./routes/mapRoutes');
const alertRoutes = require('./routes/alertroutes');
const userRoutes = require('./routes/userRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Register Routes
app.use('/api/emergency', emergencyRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);

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

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

