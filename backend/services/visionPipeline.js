const fs = require('fs');
const uuidv4 = require('uuid').v4;

async function processWardrobeFile(filePath) {
  const id = 'wi-' + uuidv4();
  return [{ id, type: 'shirt', color: 'white', tags: ['auto'] }];
}

module.exports = { processWardrobeFile };
