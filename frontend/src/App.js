import React from 'react';
import WardrobeUpload from './components/WardrobeUpload';
import FoodRelax from './components/FoodRelax';
import Dashboard from './components/Dashboard';
export default function App(){ return (
  <div style={{padding:20,fontFamily:'sans-serif'}}>
    <h1>MindMaid Beta</h1>
    <WardrobeUpload/>
    <FoodRelax/>
    <Dashboard/>
  </div>
); }
