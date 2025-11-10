const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processWardrobeFile } = require('../services/visionPipeline');
const WardrobeItem = require('../models/WardrobeItem');

// Upload directory
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'wardrobe');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// === Upload new item ===
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded' });

    let tags = {};
    try {
      tags = await processWardrobeFile(req.file.path);
    } catch (e) {
      console.warn('Vision pipeline failed, using defaults:', e.message);
      tags = {};
    }

    const newItem = new WardrobeItem({
      name: req.file.originalname,
      category: tags.category || 'uncategorized',
      color: tags.color || 'unknown',
      material: tags.material || 'unknown',
      pattern: tags.pattern || 'solid',
      moods: tags.moods && tags.moods.length ? tags.moods : ['casual'],
      imageUrl: `/uploads/wardrobe/${req.file.filename}`,
    });

    await newItem.save();
    return res.json({ ok: true, item: newItem });
  } catch (err) {
    console.error('❌ Upload error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// === Get all wardrobe items ===
router.get('/', async (req, res) => {
  try {
    const items = await WardrobeItem.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error('❌ Fetch error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// === Recommend outfits ===
router.post('/recommend', async (req, res) => {
  try {
    const { mood, category, color } = req.body;
    let query = {};

    if (category) query.category = category;
    if (color) query.color = color;
    if (mood) query.moods = mood;

    let results = await WardrobeItem.find(query);
    results = results.sort(() => Math.random() - 0.5); // shuffle

    const outfits = [];
    for (let i = 0; i < results.length; i += 3) {
      outfits.push(results.slice(i, i + 3));
    }

    res.json(outfits);
  } catch (err) {
    console.error('❌ Recommendation error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;