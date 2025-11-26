import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Helper function to safely parse the JSON result from the AI API
const parseResult = (jsonString, fallback) => {
    try {
        if (jsonString) return JSON.parse(jsonString);
    } catch (e) {
        console.warn("Could not parse AI JSON result:", jsonString);
        // Fallback for when AI returns plain text instead of JSON
        return { title: jsonString, url: null }; 
    }
    return { title: fallback, url: null };
};

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
            // Get AI advice for outfit (assuming this returns plain text/HTML)
            const outfitResponse = await axios.post(`${API_URL}/api/ai/advice`, {
                query: `Suggest an outfit for someone feeling ${mood}`,
                mood: mood.toLowerCase(),
                type: 'clothes'
            });

            // Get AI advice for food (ASSUMING JSON: { "title": "...", "url": "..." })
            const foodResponse = await axios.post(`${API_URL}/api/ai/advice`, {
                query: `Suggest a meal for someone feeling ${mood}`,
                mood: mood.toLowerCase(),
                type: 'meals'
            });

            // Get AI advice for music (ASSUMING JSON: { "title": "...", "url": "..." })
            const musicResponse = await axios.post(`${API_URL}/api/ai/advice`, {
                query: `Suggest music for someone feeling ${mood}`,
                mood: mood.toLowerCase(),
                type: 'activity'
            });

            setRecommendations({
                outfit: outfitResponse.data.result,
                // Parse the JSON results for food and music to get title/url
                food: parseResult(foodResponse.data.result, 'No food recommendation available'),
                music: parseResult(musicResponse.data.result, 'No music recommendation available')
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

            {/* Mood Selector (Unchanged) */}
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
                    {/* Outfit (Unchanged - Assumed plain text) */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold mb-3 text-gray-800">👔 Outfit</h3>
                        <p className="text-gray-600">{recommendations.outfit || 'No outfit recommendation available'}</p>
                    </div>

                    {/* Food (CRITICAL FIX: Using <a> tag) */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold mb-3 text-gray-800">🍽️ Food</h3>
                        {recommendations.food?.url ? (
                            <a 
                                href={recommendations.food.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:text-blue-800 font-semibold underline block"
                            >
                                {recommendations.food.title || 'View Food Recommendation'}
                            </a>
                        ) : (
                            <p className="text-gray-600">{recommendations.food?.title || 'No food recommendation available'}</p>
                        )}
                    </div>

                    {/* Music (CRITICAL FIX: Using <a> tag) */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold mb-3 text-gray-800">🎵 Music</h3>
                        {recommendations.music?.url ? (
                            <a 
                                href={recommendations.music.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:text-blue-800 font-semibold underline block"
                            >
                                {recommendations.music.title || 'View Music Recommendation'}
                            </a>
                        ) : (
                            <p className="text-gray-600">{recommendations.music?.title || 'No music recommendation available'}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}