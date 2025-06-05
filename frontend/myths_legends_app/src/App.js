import "./App.css";
import "leaflet/dist/leaflet.css"; 
import React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';


import { AuthProvider } from './components/AuthContext';



import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';



import HomePage from './pages/HomePage';









delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
});

function App() {
  return (
    <Router>
      <AuthProvider>
        {}
          <Routes>
            <Route path="/" element={<HomePage />} />
            {}
            {}
            {}
            {}
            {}
            {}
            {}
            {}
            {}
            {}
          </Routes>
        {}
      </AuthProvider>
    </Router>
  );
}

export default App;