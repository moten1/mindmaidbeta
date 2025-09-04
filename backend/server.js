// Load environment variables
require('dotenv').config();

// Core dependencies
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan'); // for HTTP request logging

// Import routes
const wardrobeRoutes = require('./routes/wardrobe');
const spotifyRoutes = require('./routes/spotify');
const foodRoutes = require('./routes/food');
const adminRoutes = require('./routes/admin');

const app = express();

// === Middleware ===
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev')); // log all requests in console (dev only)

// === API Routes ===
app.use('/api/wardrobe', wardrobeRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/admin', adminRoutes);

// === Health Check ===
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// === Serve Frontend in Production ===
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '..', 'frontend', 'build');
  app.use(express.static(buildPath));

  // Catch-all for React Router
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// === Error Handling ===
// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// General error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack || err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// === Start Server ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(
    `🚀 Backend running on port ${PORT} (mode: ${process.env.NODE_ENV || 'development'})`
  );
});
