import React from "react";

const Home = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold text-gray-800">Welcome to MindMaid</h1>

      <p className="text-lg text-gray-600">
        MindMaid provides holistic healing services to help you relax, rejuvenate, and restore balance in your life. 
        Explore our offerings and experience a new level of wellness.
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="text-2xl font-semibold mb-2">Energy Healing</h2>
          <p className="text-gray-600">
            Restore your energy balance through personalized sessions designed for your wellbeing.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="text-2xl font-semibold mb-2">Stress Relief</h2>
          <p className="text-gray-600">
            Experience deep relaxation and techniques to reduce stress effectively.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="text-2xl font-semibold mb-2">Holistic Wellness</h2>
          <p className="text-gray-600">
            Combine mind, body, and spirit therapies to achieve full wellness and mental clarity.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;