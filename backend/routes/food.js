import express from "express";
import { attachFoodLinks } from "../services/foodLinks.js";

const router = express.Router();

// Static menu (can also be used for recommendations)
const MENU = [
  { id: "m1", name: "Halal Chicken Salad", dietary: ["halal", "healthy"] },
  { id: "m2", name: "Kosher Veggie Bowl", dietary: ["kosher", "healthy"] },
  { id: "m3", name: "Vegan Smoothie", dietary: ["vegan"] },
];

// Mood-based recommendations
const MOOD_RECOMMENDATIONS = {
  Happy: ["Fruit Salad", "Smoothie Bowl", "Ice Cream Sundae"],
  Sad: ["Chocolate Cake", "Comfort Soup", "Mac & Cheese"],
  Stressed: ["Green Smoothie", "Herbal Tea", "Oatmeal Bowl"],
  Energetic: ["Protein Shake", "Granola Bar", "Veggie Wrap"],
  Tired: ["Coffee Latte", "Avocado Toast", "Energy Balls"],
  Anxious: ["Chamomile Tea", "Dark Chocolate", "Yogurt Parfait"],
};

// GET /api/food/menu
router.get("/menu", (req, res) => {
  res.json(MENU);
});

// POST /api/food/order
router.post("/order", (req, res) => {
  res.json({ ok: true, orderId: "ord-" + Date.now() });
});

// POST /api/food/recommend
router.post("/recommend", (req, res) => {
  const { mood } = req.body;

  const items = MOOD_RECOMMENDATIONS[mood] || ["Comfort Food Bowl", "Fresh Salad", "Smoothie"];

  const recommendations = items.map((name) => ({
    name,
    description: `${name} for ${mood ? mood.toLowerCase() : "your"} mood`,
  }));

  const recommendationsWithLinks = attachFoodLinks(recommendations);

  res.json({ recommendations: recommendationsWithLinks });
});

export default router;
