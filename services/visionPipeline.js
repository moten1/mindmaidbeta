// backend/services/visionPipeline.js
const path = require('path');

/**
 * Process an uploaded wardrobe image to extract metadata.
 * Returns an object:
 * {
 *   id, name, category, color, material, pattern, moods, imageUrl
 * }
 */
async function processWardrobeFile(filePath) {
  const fileName = path.basename(filePath).toLowerCase();

  // --- Category Detection ---
  let category = 'uncategorized';
  if (/(shirt|tshirt|blouse|top)/.test(fileName)) category = 'tops';
  else if (/(pant|jeans|skirt|short)/.test(fileName)) category = 'bottoms';
  else if (/(shoe|sneaker|boot|heel|loafer)/.test(fileName)) category = 'shoes';
  else if (/(hat|bag|belt|scarf|accessory)/.test(fileName)) category = 'accessories';

  // --- Color Detection ---
  let color = 'unknown';
  const colors = [
    'white','black','red','blue','green','yellow','brown','gray','beige',
    'pink','purple','orange','navy','maroon','olive','teal'
  ];
  for (const c of colors) {
    if (fileName.includes(c)) {
      color = c;
      break;
    }
  }

  // --- Material Detection ---
  let material = 'unknown';
  const materials = ['cotton','denim','leather','wool','silk','polyester','linen','nylon','velvet','satin'];
  for (const m of materials) {
    if (fileName.includes(m)) {
      material = m;
      break;
    }
  }

  // --- Pattern Detection ---
  let pattern = 'solid';
  if (/striped/.test(fileName)) pattern = 'striped';
  else if (/checked|plaid/.test(fileName)) pattern = 'checked';
  else if (/floral/.test(fileName)) pattern = 'floral';
  else if (/polka/.test(fileName)) pattern = 'polka dot';
  else if (/graphic/.test(fileName)) pattern = 'graphic';
  else if (/animal|leopard|tiger|zebra/.test(fileName)) pattern = 'animal print';

  // --- Mood / Occasion Tagging ---
  const moods = [];
  if (category === 'tops' || category === 'bottoms') {
    if (fileName.includes('casual')) moods.push('casual');
    if (fileName.includes('formal')) moods.push('formal');
    if (fileName.includes('party')) moods.push('party');
    if (fileName.includes('sport')) moods.push('sporty');
    if (fileName.includes('chill')) moods.push('chill');
  } else if (category === 'shoes') {
    if (/sneaker/.test(fileName)) moods.push('casual','sporty');
    if (/heel/.test(fileName)) moods.push('formal','party');
    if (/boot/.test(fileName)) moods.push('casual','chill');
  } else if (category === 'accessories') {
    moods.push('all');
  }

  // --- Generate Unique ID ---
  const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  return {
    id,
    name: fileName,
    category,
    color,
    material,
    pattern,
    moods,
    imageUrl: `/uploads/wardrobe/${path.basename(filePath)}`,
  };
}

module.exports = { processWardrobeFile };
