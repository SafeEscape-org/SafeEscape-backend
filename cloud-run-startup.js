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

// After successful startup, load the full application
function loadFullApplication() {
  try {
    console.log('Loading full application from server-core.js...');
    const configureApp = require('./server-core');
    console.log('server-core.js loaded successfully, configuring app...');
    configureApp(app, server);
    
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