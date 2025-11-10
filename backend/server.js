// Load environment variables
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');

// Routes
const wardrobeRoutes = require('./routes/wardrobe');
const spotifyRoutes = require('./routes/spotify');
const foodRoutes = require('./routes/food');
const adminRoutes = require('./routes/admin');

const app = express();

// === Middleware ===
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));

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

// === Version Endpoint ===
app.get('/api/version', (req, res) => {
  try {
    const pkgPath = path.join(__dirname, 'package.json');
    let version = 'unknown';

    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      version = pkg.version || 'unknown';
    }

    res.json({
      version,
      commit: process.env.COMMIT_HASH || 'unknown',
    });
  } catch (err) {
    console.error('Version check failed:', err.message);
    res.status(500).json({ error: 'Failed to read version info' });
  }
});

// === Serve Frontend in Production ===
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '..', 'frontend', 'build');
  app.use(express.static(buildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// === Error Handling ===
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

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