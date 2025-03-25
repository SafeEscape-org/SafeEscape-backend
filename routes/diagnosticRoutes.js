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

// List all registered routes
router.get('/routes', (req, res) => {
  const routes = [];
  
  // Get routes from the Express app
  const app = req.app;
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      // Routes added using Router
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  
  res.json({ routes });
});

module.exports = router;