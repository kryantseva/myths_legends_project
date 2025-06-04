import "./App.css";
import "leaflet/dist/leaflet.css"; // Стили Leaflet все еще нужны глобально
import React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Импорты для AuthProvider и Layout - РАСКОММЕНТИРОВАНЫ
import { AuthProvider } from './components/AuthContext';
// import Layout from './components/Layout';

// Импорты и исправление для иконок Leaflet по умолчанию
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Импорт страниц - только HomePage раскомментирован
// Путь './pages/HomePage' верен, если App.js находится в src/ и pages/ находится в src/
import HomePage from './pages/HomePage';
// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import ProfilePage from './pages/ProfilePage';
// import PlacesListPage from './pages/PlacesListPage';
// import AddEditPlacePage from './pages/AddEditPlacePage';
// import AddEditNotePage from './pages/AddEditNotePage';
// import ModerationPage from './pages/ModerationPage';


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
        {/* <Layout> */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* Остальные маршруты закомментированы, пока не будут готовы */}
            {/* <Route path="/login" element={<LoginPage />} /> */}
            {/* <Route path="/register" element={<RegisterPage />} /> */}
            {/* <Route path="/profile" element={<ProfilePage />} /> */}
            {/* <Route path="/places" element={<PlacesListPage />} /> */}
            {/* <Route path="/places/add" element={<AddEditPlacePage />} /> */}
            {/* <Route path="/places/:id/edit" element={<AddEditPlacePage />} /> */}
            {/* <Route path="/places/:placeId/add-note" element={<AddEditNotePage />} /> */}
            {/* <Route path="/notes/:noteId/edit" element={<AddEditNotePage />} /> */}
            {/* <Route path="/moderation" element={<ModerationPage />} /> */}
          </Routes>
        {/* </Layout> */}
      </AuthProvider>
    </Router>
  );
}

export default App;