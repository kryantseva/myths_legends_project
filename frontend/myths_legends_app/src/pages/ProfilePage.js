// frontend/myths_legends_app/src/pages/ProfilePage.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProfilePage.css';

function ProfilePage() {
  const { currentUser, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [userPlaces, setUserPlaces] = useState([]);
  const [userNotes, setUserNotes] = useState([]);
  const [favoritePlaces, setFavoritePlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    if (!currentUser) {
      console.log('Current user not loaded yet, waiting...');
      return;
    }

    const fetchUserData = async () => {
      try {
        const headers = { Authorization: `Token ${localStorage.getItem('authToken')}` };

        const placesResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/places/?owner=${currentUser.id}`, { headers });
        const placesData = placesResponse.data.features || placesResponse.data.results || placesResponse.data;
        setUserPlaces(Array.isArray(placesData) ? placesData : []);

        const notesResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/notes/?user=${currentUser.id}`, { headers });
        const notesData = notesResponse.data.results || notesResponse.data;
        setUserNotes(Array.isArray(notesData) ? notesData : []);

        const favoritesResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/places/`, { headers });
        const allPlaces = favoritesResponse.data.features || favoritesResponse.data.results || favoritesResponse.data;
        const userFavorites = allPlaces.filter(place =>
          place.favorites && place.favorites.some(fav => fav === currentUser.id)
        );
        setFavoritePlaces(userFavorites);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err.response?.data || err.message);
        setError('Не удалось загрузить данные профиля. Проверьте подключение или обратитесь к администратору.');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [isLoggedIn, currentUser, navigate]);

  const handleLogout = async () => {
    await logout();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Загрузка...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>{error}</div>;
  if (!isLoggedIn || !currentUser) return <div style={{ textAlign: 'center', padding: '20px' }}>Пожалуйста, войдите в систему.</div>;

  const role = currentUser.is_superuser ? 'Администратор' : currentUser.groups.includes('Moderators') ? 'Модератор' : 'Пользователь';

  return (
    <div className="profile-container">
      <div style={{ background: '#333', color: 'white', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate('/map')} style={{ marginRight: '10px' }}>Карта</button>
        <button onClick={handleLogout}>Выход</button>
        {currentUser.is_superuser && <button onClick={() => navigate('/moderation')} style={{ marginLeft: '10px' }}>Модерация</button>}
      </div>
      <h2>Профиль пользователя</h2>
      <div className="profile-info">
        <p><strong>Имя пользователя:</strong> {currentUser.username}</p>
        <p><strong>Email:</strong> {currentUser.email || 'Не указан'}</p>
        <p><strong>Роль:</strong> {role}</p>
      </div>

      <div className="profile-section">
        <h3>Ваши места ({userPlaces.length})</h3>
        {userPlaces.length > 0 ? (
          <ul>
            {userPlaces.map(place => (
              <li key={place.id}>
                {place.properties?.name || place.name} (Статус: {place.properties?.status || place.status})
              </li>
            ))}
          </ul>
        ) : (
          <p>Вы еще не добавили ни одного места.</p>
        )}
      </div>

      <div className="profile-section">
        <h3>Ваши заметки ({userNotes.length})</h3>
        {userNotes.length > 0 ? (
          <ul>
            {userNotes.map(note => (
              <li key={note.id}>
                {note.text} (Место: {note.place?.name || 'Неизвестно'}, Статус: {note.moderation_status})
              </li>
            ))}
          </ul>
        ) : (
          <p>Вы еще не оставили ни одной заметки.</p>
        )}
      </div>

      <div className="profile-section">
        <h3>Избранные места ({favoritePlaces.length})</h3>
        {favoritePlaces.length > 0 ? (
          <ul>
            {favoritePlaces.map(place => (
              <li key={place.id}>
                {place.properties?.name || place.name}
              </li>
            ))}
          </ul>
        ) : (
          <p>У вас нет избранных мест.</p>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;