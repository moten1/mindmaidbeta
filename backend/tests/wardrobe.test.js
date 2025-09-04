test('wardrobe stub returns array', async ()=>{
  const wf = require('../services/visionPipeline');
  const items = await wf.processWardrobeFile(__filename);
  expect(Array.isArray(items)).toBe(true);
});
