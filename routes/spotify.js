const express = require('express');
const router = express.Router();
const querystring = require('querystring');
const fetch = require('node-fetch');
const { storeSpotifyTokens, getSpotifyTokens } = require('../services/tokenStore');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/spotify/callback';

router.get('/auth', (req,res)=>{
  const state = req.query.state || 'u_demo';
  const scope = 'user-read-private user-read-email playlist-read-private';
  const qs = querystring.stringify({ response_type: 'code', client_id: CLIENT_ID, scope, redirect_uri: REDIRECT_URI, state });
  res.redirect('https://accounts.spotify.com/authorize?' + qs);
});

router.get('/callback', async (req,res)=>{
  const code = req.query.code; const state = req.query.state || 'u_demo';
  if (!code) return res.status(400).send('missing code');
  const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
    method:'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'), 'Content-Type':'application/x-www-form-urlencoded' },
    body: querystring.stringify({ grant_type:'authorization_code', code, redirect_uri:REDIRECT_URI })
  });
  const tokenData = await tokenResp.json();
  await storeSpotifyTokens(state, tokenData);
  res.send('spotify connected');
});

module.exports = router;
