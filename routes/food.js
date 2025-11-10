const express = require('express');
const router = express.Router();

router.get('/menu', (req,res)=>{
  res.json([
    { id: 'm1', name: 'Halal Chicken Salad', dietary: ['halal','healthy'] },
    { id: 'm2', name: 'Kosher Veggie Bowl', dietary: ['kosher','healthy'] }
  ]);
});

router.post('/order', (req,res)=>{
  res.json({ ok:true, orderId: 'ord-' + Date.now() });
});

module.exports = router;
