import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './Component/MainLayout';
import Dashboard from './Component/Dashboard';
import WardrobeUpload from './Component/WardrobeUpload';
import FoodRelax from './Component/FoodRelax';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="wardrobe" element={<WardrobeUpload />} />
          <Route path="food" element={<FoodRelax />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;