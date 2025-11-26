const fs = require('fs');
const DB_FILE = __dirname + '/../../data/token_store.json';
function _read(){ try { return JSON.parse(fs.readFileSync(DB_FILE)); } catch(e){ return {}; } }
function _write(j){ fs.mkdirSync(__dirname + '/../../data', {recursive:true}); fs.writeFileSync(DB_FILE, JSON.stringify(j,null,2)); }
async function storeSpotifyTokens(userId, tokenData){ const d=_read(); d[userId]=tokenData; _write(d); }
async function getSpotifyTokens(userId){ const d=_read(); return d[userId]||null; }
module.exports = { storeSpotifyTokens, getSpotifyTokens };
