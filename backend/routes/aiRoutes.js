// ============================================
// 🧠 MindMaid AI Routes — Emotionally Intelligent Version (REVISED)
// ============================================

import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

// === 🔑 Load API Keys ===
const {
    GEMINI_API_KEY,
    HUME_API_KEY,
    DEEPSEEK_API_KEY,
    OPENROUTER_API_KEY,
    SPOONACULAR_API_KEY,
} = process.env;

// === 🔮 Initialize Gemini if available ===
let geminiModel = null;
if (GEMINI_API_KEY) {
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });
        console.log("✅ Gemini initialized");
    } catch (err) {
        console.warn("⚠️ Gemini initialization failed:", err.message);
    }
}

// === 🧠 Mood-Adaptive Tone Map ===
const toneModifiers = {
    happy: "Match their upbeat vibe — be playful, confident, and fun.",
    sad: "Be gentle, kind, and hopeful — warmth over logic.",
    tired: "Be soft and grounding — short, calm sentences, like a deep breath.",
    anxious: "Be reassuring and steady — help them slow down.",
    angry: "Be neutral but validating — let calmness lead clarity.",
    neutral: "Be balanced, thoughtful, slightly witty but not loud.",
};

// ====================================================
// NEW: Dedicated Handler for Clickable Recommendations
// ====================================================
const handleLinkedAdvice = async (mood, type) => {
    let title = "";
    let url = "";

    // --- MUSIC (Activity) Logic ---
    if (type === 'activity') {
        const query = `Suggest a public Spotify or YouTube playlist URL and a short, inviting title for someone feeling ${mood}.`;
        const musicPrompt = `
            You are a music curator. Based on the user's mood (${mood}), suggest a single playlist and respond ONLY with a JSON object.
            
            JSON Format: { "title": "Your Playlist Title", "url": "A link to Spotify, YouTube, or another public music platform" }
            
            Example: { "title": "Calm Study Beats", "url": "https://spotify.com/playlist/..." }
            User Query: ${query}
        `;
        
        // This is where you would call the AI model (Gemini or OpenRouter) with the musicPrompt
        // --- For simplicity and reliability, we'll use a smart fallback for music: ---
        try {
            const aiResult = await geminiModel.generateContent(musicPrompt);
            const aiText = aiResult.response.text().trim();
            const musicData = JSON.parse(aiText);
            title = musicData.title;
            url = musicData.url;
        } catch (err) {
            // Fallback if AI fails to generate JSON
            title = `A ${mood} Music Vibe Check`;
            url = "https://www.youtube.com/results?search_query=music+for+" + mood; // Generic YouTube search link
        }
    }

    // --- FOOD (Meals) Logic ---
    else if (type === 'meals' && SPOONACULAR_API_KEY) {
        try {
            console.log("🍽️ Fetching Spoonacular recipe...");
            const dietQuery = mood === 'tired' ? 'easy, comfort food' : 'healthy, vibrant';
            const resp = await fetch(
                `https://api.spoonacular.com/recipes/random?number=1&tags=${dietQuery}&apiKey=${SPOONACULAR_API_KEY}`
            );
            const data = await resp.json();
            const recipe = data?.recipes?.[0];

            if (recipe) {
                title = `Recipe: ${recipe.title}`;
                url = recipe.sourceUrl;
            }
        } catch (err) {
            console.warn("⚠️ Spoonacular failed:", err.message);
        }
    }
    
    // Final check and unified structured JSON output
    if (title && url) {
        return JSON.stringify({ title, url });
    }
    // Fallback if APIs fail
    return JSON.stringify({ 
        title: `Go with a classic ${type === 'meals' ? 'comfort food' : 'song'}!`, 
        url: null 
    });
};

// === 💡 AI Advice Route (MODIFIED) ===
router.post("/advice", async (req, res) => {
    const { query, mood = "neutral", type = "decision" } = req.body || {};

    if (!query) {
        return res.status(400).json({
            success: false,
            error: "Missing query",
        });
    }

    try {
        // CRITICAL: Handle linked types (Music and Food) separately to enforce JSON
        if (type === 'meals' || type === 'activity') {
            const result = await handleLinkedAdvice(mood, type);
            // The result here is already a JSON string required by Dashboard.js
            return res.json({
                success: true,
                type,
                mood,
                query,
                result: result,
                timestamp: new Date().toISOString(),
            });
        }
        
        // --- Generic (Clothes/Decision) Advice Logic Follows ---
        
        let aiResponse = "";
        const systemPrompt = `
            You are MindMaid — an emotionally intelligent, witty companion that helps users make micro-decisions with calm clarity.
            
            Context:
            - User mood: ${mood}
            - Decision type: ${type}
            
            Tone guide: ${toneModifiers[mood] || toneModifiers.neutral}
            Guidelines:
            - Sound like a mindful friend, not a chatbot.
            - Always make the user feel understood before suggesting anything.
            - Use subtle emojis if they fit naturally.
            - Keep under 60 words.
            - DO NOT output JSON. Output only plain text.
        `;

        // === 1️⃣ Try Gemini === (Remains the same, just with the new system prompt)
        if (!aiResponse && geminiModel) {
            // ... (Gemini logic)
            // ... (OpenRouter logic)
            // ... (DeepSeek logic)
            // ... (Fallback logic)
        }

        // ... (The rest of the original logic for Gemini, OpenRouter, DeepSeek, and Fallback goes here)

        // The entire original code block for sections 1, 2, 3, and 4 (including the fallbacks) 
        // should be pasted back here, ensuring the systemPrompt variable is used.
        
        // ... (END OF ORIGINAL LOGIC PASTED HERE) ...

        // The simplified response structure is good for generic text advice
        return res.json({
            success: true,
            type,
            mood,
            query,
            result: aiResponse,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error("❌ AI route error:", error);
        return res.status(500).json({
            success: false,
            type: req.body?.type || "decision",
            mood: req.body?.mood || "neutral",
            query: req.body?.query || "",
            result: "AI service is offline 😅 — please try again later.",
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

// The existing /meal-suggestion route is redundant now, as meal suggestions are handled by /advice
// You can remove the existing /meal-suggestion route entirely.

export default router;