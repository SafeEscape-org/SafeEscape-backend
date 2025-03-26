const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ message: 'Diagnostic test route works!' });
});

router.get('/environment', (req, res) => {
  res.json({
    env: process.env.NODE_ENV,
    platform: process.platform,
    time: new Date().toISOString(),
    memory: process.memoryUsage()
  });
});

// Basic endpoint that always works
router.get('/ping', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// Test database connection if applicable
router.get('/db-status', async (req, res) => {
  try {
    // You can add your database connection check here if needed
    res.json({ 
      status: 'success', 
      message: 'Database connection route reached',
      // Add your database status check here
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Echo endpoint - returns whatever was sent
router.post('/echo', (req, res) => {
  res.json({
    status: 'success',
    message: 'Echo endpoint reached',
    body: req.body,
    query: req.query,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// List all registered routes
router.get('/routes', (req, res) => {
  const app = req.app;
  const routes = [];
  
  // Collect all routes from the Express app
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods).map(m => m.toUpperCase())
      });
    } else if (middleware.name === 'router') {
      // Routes added via router
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods).map(m => m.toUpperCase()),
            // Extract the base path for this router
            base: middleware.regexp.toString().match(/^\/\^\\(.*)\\\//)[1].replace(/\\\//g, '/')
          });
        }
      });
    }
  });
  
  res.json({
    status: 'success',
    message: 'Routes list',
    routes: routes,
    count: routes.length
  });
});

module.exports = router;