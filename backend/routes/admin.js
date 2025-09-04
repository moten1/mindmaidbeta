const express = require('express');
const router = express.Router();
router.get('/stats', (req,res)=> res.json({ users: 10, uploads: 24 }));
router.get('/export/users', (req,res)=> res.send('id,email\nuser1,user1@example.com'));
module.exports = router;
