// Detect if running in Cloud Run
const isCloudRun = process.env.K_SERVICE !== undefined;

if (isCloudRun) {
  // Use the simplified startup for Cloud Run
  console.log('Detected Cloud Run environment, using simplified startup');
  require('./cloud-run-startup');
} else {
  // Use the original startup code for local development
  console.log('Using standard startup for local development');
  const express = require('express');
  const cors = require('cors');
  const http = require('http');
  // ... other imports
  const path = require('path');
  const socketIO = require('socket.io');
  const bodyParser = require('body-parser');
  const morgan = require('morgan');
  const helmet = require('helmet');
  const compression = require('compression');
  
  // Route imports
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
  
  // Service imports
  const socketService = require('./services/socket/socketService'); // Fixed path

  const pubSubService = require('./services/pubSubService');
  
  const app = express();
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
  
  // Initialize socket service
  socketService.initialize(io);
  
  // Add your middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true })); 
  app.use(morgan('dev')); // Request logging
  app.use(helmet({ contentSecurityPolicy: false })); // Security headers
  app.use(compression()); // Response compression
  
  // Static files
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });
  
  // Root route - Landing page
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SafeEscape Emergency Management API</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
          }
          header {
            background-color: #e74c3c;
            color: white;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          h1 {
            margin: 0;
          }
          .status {
            background-color: #27ae60;
            color: white;
            padding: 10px;
            border-radius: 4px;
            display: inline-block;
            margin-top: 10px;
          }
          .endpoints {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .endpoint {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
          }
          .endpoint h3 {
            margin-bottom: 5px;
            color: #e74c3c;
          }
          code {
            background-color: #f1f1f1;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', Courier, monospace;
          }
          footer {
            margin-top: 30px;
            text-align: center;
            color: #777;
          }
        </style>
      </head>
      <body>
        <header>
          <h1>SafeEscape Emergency Management Platform</h1>
          <div class="status">Server running on port ${process.env.PORT || 5000}</div>
        </header>

        <div class="endpoints">
          <h2>Available API Endpoints:</h2>
          
          <div class="endpoint">
            <h3>Emergency Management</h3>
            <p><code>GET /api/emergency/reports</code> - Get disaster reports</p>
            <p><code>POST /api/emergency/report</code> - Submit a new emergency report</p>
          </div>
          
          <div class="endpoint">
            <h3>Evacuation Services</h3>
            <p><code>GET /api/evacuation/safe-locations?lat=19.076&lng=72.8777</code> - Find nearby safe locations</p>
            <p><code>POST /api/evacuation/optimize</code> - Get optimized evacuation route</p>
          </div>
          
          <div class="endpoint">
            <h3>AI-Powered Assistance</h3>
            <p><code>POST /api/chat/start</code> - Start an emergency chat session</p>
            <p><code>GET /api/predictions/risk-assessment?city=Mumbai</code> - Get disaster risk assessment</p>
          </div>
          
          <div class="endpoint">
            <h3>Alert System</h3>
            <p><code>GET /api/alerts/active</code> - Get active alerts for an area</p>
            <p><code>POST /api/alerts/subscribe</code> - Subscribe to alerts</p>
          </div>
          
          <div class="endpoint">
            <h3>Maps & Location</h3>
            <p><code>GET /api/maps/geocode?address=Mumbai</code> - Convert address to coordinates</p>
            <p><code>GET /api/maps/directions?origin=19.076,72.8777&destination=19.023,72.843</code> - Get directions</p>
          </div>
          
          <div class="endpoint">
            <h3>User Management</h3>
            <p><code>POST /api/users/register</code> - Register new user</p>
            <p><code>POST /api/users/login</code> - User login</p>
            <p><code>GET /api/users/profile</code> - Get user profile</p>
          </div>
        </div>

        <h2>Real-time Communication</h2>
        <p>This server supports real-time communication via Socket.IO on endpoint:</p>
        <code>ws://localhost:${process.env.PORT || 5000}</code>
        
        <footer>
          <p>SafeEscape - Smart Emergency Management Application | &copy; 2025</p>
        </footer>
      </body>
      </html>
    `);
  });
  
  // Register your routes
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
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
    });
  });
  
  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not found',
      message: `Route ${req.originalUrl} not found`
    });
  });
  
  // Start the server
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}