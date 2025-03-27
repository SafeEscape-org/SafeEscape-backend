const express = require('express');
const router = express.Router();
const os = require('os');

// Track API call counts during this instance's lifetime
const apiStats = {
  startTime: new Date(),
  calls: {},
  errors: 0,
  lastError: null
};

// Middleware to validate tracking data
const validateTrackingData = (req, res, next) => {
  const { path, success, error } = req.body;
  
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Invalid path provided' });
  }
  
  next();
};

// Main monitoring dashboard endpoint
router.get('/', (req, res) => {
  try {
    const totalCalls = Object.values(apiStats.calls).reduce((a, b) => a + b, 0);
    
    res.send(`
      <h1>SafeEscape API Monitor</h1>
      <p>Instance started: ${apiStats.startTime.toISOString()}</p>
      <p>Uptime: ${((Date.now() - apiStats.startTime) / 1000 / 60).toFixed(2)} minutes</p>
      <p>Total API calls: ${totalCalls}</p>
      <p>Errors: ${apiStats.errors}</p>
      <p>Last error: ${apiStats.lastError || 'None'}</p>
      <h2>API Call Distribution</h2>
      <ul>
        ${Object.entries(apiStats.calls).map(([path, count]) => `<li>${path}: ${count}</li>`).join('')}
      </ul>
      <h2>System Info</h2>
      <ul>
        <li>Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB</li>
        <li>CPU: ${os.loadavg()[0].toFixed(2)}</li>
        <li>Platform: ${os.platform()} ${os.release()}</li>
      </ul>
      <p><a href="/monitor/test-apis">Run API Tests</a></p>
    `);
  } catch (error) {
    res.status(500).send('Error generating monitoring dashboard');
  }
});

// Endpoint to track API usage with improved error handling
router.post('/track', validateTrackingData, (req, res) => {
  try {
    const { path, success, error } = req.body;
    
    if (path) {
      apiStats.calls[path] = (apiStats.calls[path] || 0) + 1;
    }
    
    if (!success && error) {
      apiStats.errors++;
      apiStats.lastError = `${new Date().toISOString()}: ${error}`;
    }
    
    res.status(200).json({ success: true });
  } catch (trackError) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to track API usage' 
    });
  }
});

// Get system diagnostics
router.get('/diagnostics', (req, res) => {
  const diagnostics = {
    system: {
      platform: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadAvg: os.loadavg(),
      memory: {
        total: os.totalmem(),
        free: os.freemem()
      },
      cpus: os.cpus().length
    },
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        K_SERVICE: process.env.K_SERVICE,
        K_REVISION: process.env.K_REVISION
      }
    },
    api: apiStats
  };
  
  res.json(diagnostics);
});

module.exports = router;
