require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const wardrobeRoutes = require('./routes/wardrobe');
const spotifyRoutes = require('./routes/spotify');
const foodRoutes = require('./routes/food');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/wardrobe', wardrobeRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req,res)=>res.json({ok:true}));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html')));
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=> console.log(`Backend running on ${PORT}`));
