import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function FoodRelax() {
  const [mood, setMood] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  const moods = ['Happy', 'Sad', 'Stressed', 'Energetic', 'Tired', 'Anxious'];

  const getRecommendations = async () => {
    if (!mood) {
      alert('Please select your mood first!');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/food/recommend`, {
        mood: mood
      });
      setRecommendations(response.data.recommendations || []);
    } catch (error) {
      console.error('Error getting food recommendations:', error);
      setRecommendations([
        { name: 'Comfort Food Bowl', description: 'Warm and satisfying' },
        { name: 'Fresh Salad', description: 'Light and energizing' },
        { name: 'Smoothie', description: 'Quick and nutritious' }
      ]);
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

      {/* Mood Selector */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">How are you feeling?</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {moods.map((m) => (
            <button
              key={m}
              onClick={() => setMood(m)}
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

        <button
          onClick={getRecommendations}
          disabled={loading || !mood}
          className="mt-4 w-full bg-yellow-400 text-white font-semibold px-6 py-3 rounded-md hover:bg-yellow-500 transition-colors disabled:bg-gray-300"
        >
          {loading ? 'Loading...' : 'Get Food Suggestions'}
        </button>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((item, index) => (
            <div key={index} className="bg-white p-5 rounded-lg shadow hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2 text-gray-800">{item.name}</h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}