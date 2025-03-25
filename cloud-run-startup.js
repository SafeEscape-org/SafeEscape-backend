const express = require('express');
const http = require('http');

console.log('Starting SafeEscape Backend in Cloud Run mode...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT}`);

// Initialize express with minimal configuration
const app = express();
const server = http.createServer(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).send('SafeEscape Backend is running');
});

// After successful startup, load the full application
let fullAppLoaded = false;
function loadFullApplication() {
  try {
    console.log('Loading full application...');
    // Import routes and middleware here
    require('./server-core');
    fullAppLoaded = true;
    console.log('Full application loaded successfully');
  } catch (error) {
    console.error('Failed to load full application:', error);
    console.log('Continuing with minimal application');
  }
}

// Start the server first, then load the full app
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
  
  // Load the full application after the server is listening
  setTimeout(loadFullApplication, 100);
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