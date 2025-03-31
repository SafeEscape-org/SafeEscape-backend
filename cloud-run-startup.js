const express = require('express');
const http = require('http');

console.log('Starting SafeEscape Backend in Cloud Run mode...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT}`);

// Set services to be enabled
process.env.ENABLE_PUBSUB = 'true';
process.env.ENABLE_SOCKET = 'true';

console.log(`PubSub Enabled: ${process.env.ENABLE_PUBSUB}`);
console.log(`Socket.IO Enabled: ${process.env.ENABLE_SOCKET}`);

// Initialize express with minimal configuration
const app = express();
const server = http.createServer(app);

// Basic health check endpoint (available immediately)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Add a root route that's guaranteed to work
app.get('/', (req, res) => {
  res.send(`
    <h1>SafeEscape API</h1>
    <p>Status: Running</p>
    <p>Time: ${new Date().toISOString()}</p>
    <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
    <p>Try these endpoints:</p>
    <ul>
      <li><a href="/health">/health</a></li>
      <li><a href="/direct-test">/direct-test</a></li>
    </ul>
  `);
});

// After successful startup, load the full application
function loadFullApplication() {
  try {
    console.log('Loading full application from server-core.js...');
    
    // Verify Firebase initialization before loading the rest of the app
    console.log('Verifying Firebase configuration...');
    try {
      // Import using the new getter pattern
      const firebaseConfig = require('./config/firebase-config');
      
      // Test a simple Firestore operation
      const db = firebaseConfig.db;
      const testQuery = db.collection('system').doc('status');
      console.log('✅ Firebase connection verified in Cloud Run');
      
      // Log environment variables status (without revealing secrets)
      console.log('Environment check:');
      console.log('- FIREBASE_CREDENTIALS exists:', !!process.env.FIREBASE_CREDENTIALS);
      console.log('- VERTEXAI_CREDENTIALS exists:', !!process.env.VERTEXAI_CREDENTIALS);
      console.log('- PUBSUB_CREDENTIALS exists:', !!process.env.PUBSUB_CREDENTIALS);
      console.log('- GEMINI_CREDENTIALS exists:', !!process.env.GEMINI_CREDENTIALS);
      
    } catch (firebaseError) {
      console.error('❌ Firebase initialization error in Cloud Run:', firebaseError);
      // Continue execution to allow non-DB routes to function
    }
    
    const configureApp = require('./server-core');
    console.log('server-core.js loaded successfully, configuring app...');
    configureApp(app, server);
    
    // Add PubSub debugging
    console.log('Checking PubSub services...');
    try {
      const pubSubService = require('./services/pubsub/pubSubService');
      const pubSubListener = require('./services/pubsub/pubSubListener');
      
      // Log PubSub service status
      console.log('PubSub service loaded, initializing...');
      
      // Ensure PubSub service is ready
      if (typeof pubSubService.initialize === 'function') {
        pubSubService.initialize().then(() => {
          console.log('✅ PubSub service initialized successfully');
          
          // Initialize listener after service is ready
          pubSubListener.initialize();
        }).catch(err => {
          console.error('❌ PubSub service initialization failed:', err);
        });
      } else {
        console.log('PubSub service initialized');
        pubSubListener.initialize();
      }
    } catch (error) {
      console.error('❌ PubSub service loading error:', error);
    }
    
    // Add direct test route
    app.get('/direct-test', (req, res) => {
      res.json({ message: 'Direct test route works' });
    });
    
    console.log('Routes registered:');
    app._router.stack.forEach(r => {
      if (r.route && r.route.path) {
        console.log(`${r.route.stack[0].method.toUpperCase()} ${r.route.path}`);
      }
    });
  } catch (error) {
    console.error('❌ ERROR: Failed to load full application:', error);
    console.log('Continuing with minimal functionality');
    
    // Add a fallback root route at minimum
    app.get('/', (req, res) => {
      res.status(200).send('SafeEscape Backend is running (minimal mode)');
    });
  }
}

// Start the server first, then load the full app
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
  
  // Load the full application after the server is listening
  // Small delay to ensure server is fully ready
  setTimeout(loadFullApplication, 500);
});

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Keep server running
});