import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function Dashboard() {
  const [mood, setMood] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);

  const moods = ['Happy', 'Sad', 'Anxious', 'Excited', 'Tired', 'Energetic', 'Calm', 'Stressed'];

  const getRecommendations = async () => {
    if (!mood) {
      alert('Please select your mood first!');
      return;
    }

    setLoading(true);
    try {
      // Get AI advice for outfit
      const outfitResponse = await axios.post(`${API_URL}/api/ai/advice`, {
        query: `Suggest an outfit for someone feeling ${mood}`,
        mood: mood.toLowerCase(),
        type: 'clothes'
      });

      // Get AI advice for food
      const foodResponse = await axios.post(`${API_URL}/api/ai/advice`, {
        query: `Suggest a meal for someone feeling ${mood}`,
        mood: mood.toLowerCase(),
        type: 'meals'
      });

      // Get AI advice for music
      const musicResponse = await axios.post(`${API_URL}/api/ai/advice`, {
        query: `Suggest music for someone feeling ${mood}`,
        mood: mood.toLowerCase(),
        type: 'activity'
      });

      setRecommendations({
        outfit: outfitResponse.data.result,
        food: foodResponse.data.result,
        music: musicResponse.data.result
      });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      alert('Failed to get recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold text-gray-800">MindMaid Decision Helper</h1>
      
      <p className="text-lg text-gray-600">
        Struggling with decision paralysis? Tell us your mood and let AI help you decide what to wear, eat, and listen to!
      </p>

      {/* Mood Selector */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">How are you feeling today?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {moods.map((m) => (
            <button
              key={m}
              onClick={() => setMood(m)}
              className={`p-4 rounded-lg border-2 transition-all ${
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
          className="mt-6 w-full bg-yellow-400 text-white font-semibold px-6 py-3 rounded-md hover:bg-yellow-500 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Getting Recommendations...' : 'Get AI Recommendations'}
        </button>
      </div>

      {/* Recommendations Display */}
      {recommendations && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Outfit */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3 text-gray-800">👔 Outfit</h3>
            <p className="text-gray-600">{recommendations.outfit || 'No outfit recommendation available'}</p>
          </div>

          {/* Food */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3 text-gray-800">🍽️ Food</h3>
            <p className="text-gray-600">{recommendations.food || 'No food recommendation available'}</p>
          </div>

          {/* Music */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3 text-gray-800">🎵 Music</h3>
            <p className="text-gray-600">{recommendations.music || 'No music recommendation available'}</p>
          </div>
        </div>
      )}
    </div>
  );
}