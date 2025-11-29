import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function FoodRelax({ dominantEmotion, ethnicity, foodPreferences }) {
  const [mood, setMood] = useState(dominantEmotion || '');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  const moods = ['Happy', 'Sad', 'Stressed', 'Energetic', 'Tired', 'Anxious'];

  useEffect(() => {
    if (dominantEmotion) {
      setMood(dominantEmotion);
      fetchRecommendations(dominantEmotion);
    }
  }, [dominantEmotion]);

  const fetchRecommendations = async (currentMood) => {
    if (!currentMood) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/food/recommend`, {
        mood: currentMood,
        ethnicity: ethnicity || null,
        preferences: foodPreferences || []
      });

      setRecommendations(response.data.recommendations || []);
    } catch (error) {
      console.error('Error getting food recommendations:', error);

      // Fallback generic suggestions
      const fallback = [
        { name: 'Comfort Food Bowl', description: 'Warm and satisfying' },
        { name: 'Fresh Salad', description: 'Light and energizing' },
        { name: 'Smoothie', description: 'Quick and nutritious' }
      ];

      setRecommendations(fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold text-gray-800">Food Recommendations</h1>
      <p className="text-lg text-gray-600">
        Let AI suggest meals based on your current mood!
      </p>

      {/* Mood Selector (Optional manual override) */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">How are you feeling?</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {moods.map((m) => (
            <button
              key={m}
              onClick={() => { setMood(m); fetchRecommendations(m); }}
              className={`p-3 rounded-lg border-2 transition-all ${
                mood === m
                  ? 'border-yellow-400 bg-yellow-50 text-yellow-700 font-semibold'
                  : 'border-gray-300 hover:border-yellow-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {loading ? (
        <p className="text-gray-500">Loading recommendations...</p>
      ) : recommendations.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((item, index) => (
            <div key={index} className="bg-white p-5 rounded-lg shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2 text-gray-800">{item.name}</h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No recommendations yet.</p>
      )}
    </div>
  );
}
