import React from "react";

const About = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold text-gray-800">About MindMaid</h1>

      <p className="text-lg text-gray-600">
        MindMaid is dedicated to providing holistic healing services that restore balance to your mind, body, and spirit. 
        Our expert team combines energy healing, relaxation techniques, and personalized wellness programs to help you 
        achieve optimal well-being.
      </p>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-2">Our Mission</h2>
        <p className="text-gray-600">
          To empower individuals to feel their best, reduce stress, and enhance overall wellness through safe, 
          effective, and personalized holistic therapies.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-2">Our Approach</h2>
        <p className="text-gray-600">
          We combine a variety of holistic techniques including energy healing, guided meditation, and therapeutic 
          practices designed to create a balanced and harmonious life experience.
        </p>
      </div>
    </div>
  );
};

export default About;