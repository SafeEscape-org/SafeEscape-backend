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
  
  const app = express();
  const server = http.createServer(app);
  
  // Add your middleware
  app.use(cors());
  app.use(express.json());
  
  // Register your routes
  app.use('/api/emergency', emergencyRoutes);
  // ... other routes
  
  // Start the server
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}