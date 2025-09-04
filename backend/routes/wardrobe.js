const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processWardrobeFile } = require('../services/visionPipeline');
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'backend_uploads', 'wardrobe');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (req,file,cb)=>cb(null, UPLOAD_DIR),
  filename: (req,file,cb)=> cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

router.post('/upload', upload.single('image'), async (req,res)=>{
  try {
    if (!req.file) return res.status(400).json({ok:false,error:'no file'});
    const items = await processWardrobeFile(req.file.path);
    return res.json({ok:true, items});
  } catch (err) {
    console.error(err); res.status(500).json({ok:false,error:err.message});
  }
});

module.exports = router;
