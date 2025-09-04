import React,{useEffect,useState} from 'react';
import axios from 'axios';
export default function FoodRelax(){ const [menu,setMenu]=useState([]); useEffect(()=>{ axios.get((process.env.REACT_APP_API_URL||'/api') + '/food/menu').then(r=>setMenu(r.data)).catch(()=>{}); },[]); return (<div style={{marginTop:12}}><h3>Food</h3><ul>{menu.map(m=><li key={m.id}>{m.name}</li>)}</ul></div>); }
