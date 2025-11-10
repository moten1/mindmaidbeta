const mongoose = require('mongoose');

const WardrobeItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'uncategorized' },
  color: { type: String, default: 'unknown' },
  material: { type: String, default: 'unknown' },
  pattern: { type: String, default: 'solid' },
  moods: { type: [String], default: ['casual'] },
  imageUrl: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('WardrobeItem', WardrobeItemSchema);
