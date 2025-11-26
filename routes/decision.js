// backend/routes/decision.js
const express = require("express");
const router = express.Router();

// ✅ Sample fallback options (can later be replaced with DB or ML logic)
const fallbackOptions = {
  clothes: ["T-Shirt 👕", "Jeans 👖", "Dress 👗", "Jacket 🧥"],
  meals: ["Pizza 🍕", "Salad 🥗", "Burger 🍔", "Sushi 🍣"],
  activities: ["Reading 📖", "Workout 🏋️", "Gaming 🎮", "Meditation 🧘"],
  quick: ["Yes ✅", "No ❌", "Maybe 🤔", "Later ⏳"],
};

// ✅ POST /api/decision
router.post("/", async (req, res) => {
  try {
    const { uid, emotion, type, option } = req.body;

    // Debug (optional): Log incoming requests in development
    if (process.env.NODE_ENV !== "production") {
      console.log("🧠 Decision Request:", { uid, emotion, type, option });
    }

    // ✅ If reroll, provide a random suggestion
    if (option === "reroll" && fallbackOptions[type]) {
      const random =
        fallbackOptions[type][
          Math.floor(Math.random() * fallbackOptions[type].length)
        ];
      return res.json({ result: random });
    }

    // ✅ If user picked something valid
    if (fallbackOptions[type] && fallbackOptions[type].includes(option)) {
      return res.json({ result: `👍 Great choice: ${option}` });
    }

    // ✅ If emotion data available, make contextual suggestion
    if (emotion) {
      const moodBased = {
        happy: "Try something vibrant like a yellow dress or a run in the park 🌞",
        sad: "Soft sweater and herbal tea might help 🧣☕",
        angry: "Deep breathing or a walk outdoors could calm you 🌿",
        neutral: "Perfect time to try something new — maybe sushi 🍣",
      };
      const suggestion =
        moodBased[emotion.toLowerCase()] ||
        "🤖 AI is still learning... but you’re doing great!";
      return res.json({ result: suggestion });
    }

    // ✅ Generic fallback
    return res.json({ result: "🤖 AI is still learning... try again!" });
  } catch (error) {
    console.error("❌ Decision API error:", error);
    res.status(500).json({ result: "Server error. Please try again later." });
  }
});

module.exports = router;
