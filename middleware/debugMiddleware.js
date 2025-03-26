const debug = (req, res, next) => {
  // Save original send
  const originalSend = res.send;
  
  // Get timestamp when the request started
  const startTime = new Date();
  
  // Log incoming request
  console.log(`[${startTime.toISOString()}] 🔍 ${req.method} ${req.originalUrl}`);
  
  if (Object.keys(req.body).length > 0) {
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2).substring(0, 200));
  }
  
  if (Object.keys(req.params).length > 0) {
    console.log('🔖 Request Params:', req.params);
  }
  
  if (Object.keys(req.query).length > 0) {
    console.log('❓ Request Query:', req.query);
  }
  
  // Override send
  res.send = function(data) {
    // Get duration
    const duration = new Date() - startTime;
    
    // Log response
    console.log(`[${new Date().toISOString()}] ✅ ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    
    // Actually send the response
    originalSend.apply(res, arguments);
  };
  
  // Go to next middleware
  next();
};

module.exports = debug;
