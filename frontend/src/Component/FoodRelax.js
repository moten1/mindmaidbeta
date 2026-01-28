import React, { useState, useEffect } from "react";
import axios from "axios";
import { attachFoodLinks } from "../services/foodLinks"; // Frontend copy of universal module

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function FoodRelax({ dominantEmotion, ethnicity, foodPreferences }) {
  const [mood, setMood] = useState(dominantEmotion || "");
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  const moods = ["Happy", "Sad", "Stressed", "Energetic", "Tired", "Anxious"];

  // Fetch recommendations when dominant emotion changes
  useEffect(() => {
    if (dominantEmotion) {
      setMood(dominantEmotion);
      fetchRecommendations(dominantEmotion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dominantEmotion]);

  const fetchRecommendations = async (currentMood) => {
    if (!currentMood) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/food/recommend`, {
        mood: currentMood,
        ethnicity: ethnicity || null,
        preferences: foodPreferences || [],
      });

      const recsWithLinks = attachFoodLinks(response.data.recommendations || []);
      setRecommendations(recsWithLinks);
    } catch (error) {
      console.error("Error fetching recommendations:", error);

      // Fallback generic recommendations with links
      const fallback = [
        { name: "Comfort Food Bowl", description: "Warm and satisfying" },
        { name: "Fresh Salad", description: "Light and energizing" },
        { name: "Smoothie", description: "Quick and nutritious" },
      ];

      setRecommendations(attachFoodLinks(fallback));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 px-4 md:px-0">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-4xl font-extrabold text-gray-800">Food Recommendations</h1>
        <p className="text-lg text-gray-600">
          Let AI suggest meals based on your current mood!
        </p>
      </header>

      {/* Mood Selector */}
      <section className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-semibold mb-4">How are you feeling?</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {moods.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMood(m);
                fetchRecommendations(m);
              }}
              className={`p-3 rounded-lg border-2 transition-all text-center font-medium ${
                mood === m
                  ? "border-yellow-400 bg-yellow-50 text-yellow-700 shadow-inner"
                  : "border-gray-300 hover:border-yellow-300 hover:bg-yellow-50"
              }`}
              aria-pressed={mood === m}
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      {/* Recommendations */}
      <section>
        {loading ? (
          <p className="text-gray-500">Loading recommendations...</p>
        ) : recommendations.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((item, index) => (
              <div
                key={index}
                className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition-shadow duration-200"
              >
                <h3 className="text-xl font-semibold mb-2 text-gray-800">{item.name}</h3>
                <p className="text-gray-600 mb-4">{item.description}</p>

                {item.deliveryLinks && (
                  <div className="flex flex-wrap gap-2">
                    {Object.values(item.deliveryLinks).map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500 transition"
                        aria-label={`Order ${item.name} on ${link.provider}`}
                      >
                        Order on {link.provider}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No recommendations yet.</p>
        )}
      </section>
    </div>
  );
}
