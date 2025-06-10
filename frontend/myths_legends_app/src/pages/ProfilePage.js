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
  const [moderationPlaces, setModerationPlaces] = useState([]);
  const [moderationNotes, setModerationNotes] = useState([]);
  const [moderationComments, setModerationComments] = useState([]);
  const [userComments, setUserComments] = useState([]);
  const [allPlacesById, setAllPlacesById] = useState({});

  // Функция для извлечения id места из заметки или комментария
  function extractPlaceId(item) {
    if (!item) return null;
    if (typeof item.place === 'object' && item.place !== null) return item.place.id;
    return item.place_id || item.place;
  }

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
        // Места пользователя (approved)
        const placesResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/places/?owner=${currentUser.id}&status=approved`, { headers });
        const placesData = placesResponse.data.features || placesResponse.data.results || placesResponse.data;
        setUserPlaces(Array.isArray(placesData) ? placesData : []);
        // Места пользователя на модерации (pending)
        const moderationPlacesPendingResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/places/?owner=${currentUser.id}&status=pending`, { headers });
        const moderationPlacesPendingData = moderationPlacesPendingResponse.data.features || moderationPlacesPendingResponse.data.results || moderationPlacesPendingResponse.data;
        // Места пользователя на модерации (rejected)
        const moderationPlacesRejectedResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/places/?owner=${currentUser.id}&status=rejected`, { headers });
        const moderationPlacesRejectedData = moderationPlacesRejectedResponse.data.features || moderationPlacesRejectedResponse.data.results || moderationPlacesRejectedResponse.data;
        setModerationPlaces([
          ...(Array.isArray(moderationPlacesPendingData) ? moderationPlacesPendingData : []),
          ...(Array.isArray(moderationPlacesRejectedData) ? moderationPlacesRejectedData : [])
        ]);
        // Заметки (approved, все пользователи)
        const notesResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/notes/?moderation_status=approved&page_size=1000`, { headers });
        const notesData = notesResponse.data.results || notesResponse.data;
        setUserNotes(Array.isArray(notesData) ? notesData : []);
        // Заметки пользователя на модерации (pending)
        const moderationNotesPendingResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/notes/?user=${currentUser.id}&moderation_status=pending`, { headers });
        const moderationNotesPendingData = moderationNotesPendingResponse.data.results || moderationNotesPendingResponse.data;
        // Заметки пользователя на модерации (rejected)
        const moderationNotesRejectedResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/notes/?user=${currentUser.id}&moderation_status=rejected`, { headers });
        const moderationNotesRejectedData = moderationNotesRejectedResponse.data.results || moderationNotesRejectedResponse.data;
        setModerationNotes([
          ...(Array.isArray(moderationNotesPendingData) ? moderationNotesPendingData : []),
          ...(Array.isArray(moderationNotesRejectedData) ? moderationNotesRejectedData : [])
        ]);
        // Комментарии (approved, все пользователи)
        const commentsResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/comments/?moderation_status=approved&page_size=1000`, { headers });
        const commentsData = commentsResponse.data.results || commentsResponse.data;
        setUserComments(Array.isArray(commentsData) ? commentsData : []);
        // Комментарии пользователя на модерации (pending)
        const moderationCommentsPendingResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/comments/?user=${currentUser.id}&moderation_status=pending`, { headers });
        const moderationCommentsPendingData = moderationCommentsPendingResponse.data.results || moderationCommentsPendingResponse.data;
        // Комментарии пользователя на модерации (rejected)
        const moderationCommentsRejectedResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/comments/?user=${currentUser.id}&moderation_status=rejected`, { headers });
        const moderationCommentsRejectedData = moderationCommentsRejectedResponse.data.results || moderationCommentsRejectedResponse.data;
        setModerationComments([
          ...(Array.isArray(moderationCommentsPendingData) ? moderationCommentsPendingData : []),
          ...(Array.isArray(moderationCommentsRejectedData) ? moderationCommentsRejectedData : [])
        ]);
        // --- Подгружаем названия всех мест, к которым есть заметки и комментарии ---
        // Собираем уникальные placeId из заметок и комментариев
        const notePlaceIds = (Array.isArray(notesData) ? notesData : []).map(extractPlaceId).filter(Boolean);
        const commentPlaceIds = (Array.isArray(commentsData) ? commentsData : []).map(extractPlaceId).filter(Boolean);
        const allPlaceIds = Array.from(new Set([...notePlaceIds, ...commentPlaceIds]));
        // Получаем все эти места одним запросом (если есть хотя бы один id)
        let placesById = {};
        if (allPlaceIds.length > 0) {
          const placesByIdResp = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/places/?id__in=${allPlaceIds.join(',')}&page_size=1000`, { headers });
          const placesArr = placesByIdResp.data.features || placesByIdResp.data.results || placesByIdResp.data;
          (Array.isArray(placesArr) ? placesArr : []).forEach(p => {
            const name = p.properties?.name || p.name;
            if (name) placesById[p.id] = name;
          });
        }
        // Диагностика
        console.log('notePlaceIds', notePlaceIds);
        console.log('commentPlaceIds', commentPlaceIds);
        console.log('allPlaceIds', allPlaceIds);
        console.log('placesById', placesById);
        setAllPlacesById(placesById);
        // Избранные места
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
    window.location.reload();
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
        <h3>Ваши места</h3>
        {userPlaces.length > 0 ? (
          <ul>
            {userPlaces.map(place => (
              <li key={place.id}>
                {place.properties?.name || place.name}
                <span style={{ color: '#888', marginLeft: 8 }}>
                  {place.properties?.created_at || place.created_at ? new Date(place.properties?.created_at || place.created_at).toLocaleString() : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Нет добавленных мест.</p>
        )}
      </div>

      <div className="profile-section">
        <h3>Заметки</h3>
        {userNotes.length > 0 ? (
          <ul>
            {userNotes.map(note => {
              let placeName = '';
              const placeId = extractPlaceId(note);
              if (placeId && allPlacesById[placeId]) {
                placeName = allPlacesById[placeId];
              }
              return (
                <li key={note.id}>
                  {note.text}
                  {placeName && (
                    <> (Место: {placeName})</>
                  )}
                  <span style={{ color: '#888', marginLeft: 8 }}>
                    {note.created_at ? new Date(note.created_at).toLocaleString() : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>Нет одобренных заметок.</p>
        )}
      </div>

      <div className="profile-section">
        <h3>Комментарии</h3>
        {userComments.length > 0 ? (
          <ul>
            {userComments.map(comment => {
              let placeName = '';
              const placeId = extractPlaceId(comment);
              if (placeId && allPlacesById[placeId]) {
                placeName = allPlacesById[placeId];
              }
              return (
                <li key={comment.id}>
                  {comment.text}
                  {placeName && (
                    <> (Место: {placeName})</>
                  )}
                  <span style={{ color: '#888', marginLeft: 8 }}>
                    {comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>Нет одобренных комментариев.</p>
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

      <div className="profile-section">
        <h3>На модерации</h3>
        {moderationPlaces.length === 0 && moderationNotes.length === 0 && moderationComments.length === 0 ? (
          <p>Нет объектов на модерации.</p>
        ) : (
          <>
            {moderationPlaces.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Места:</strong>
                <ul>
                  {moderationPlaces.map(place => (
                    <li key={place.id}>
                      {place.properties?.name || place.name} (Статус: {place.properties?.status || place.status})
                      {place.properties?.status === 'rejected' || place.status === 'rejected' ? (
                        <span style={{ color: 'red', marginLeft: 8 }}>
                          — Отклонено{(place.properties?.rejection_reason || place.rejection_reason) ? `: ${place.properties?.rejection_reason || place.rejection_reason}` : ''}
                        </span>
                      ) : place.properties?.status === 'pending' || place.status === 'pending' ? (
                        <span style={{ color: '#ff9800', marginLeft: 8 }}>— На рассмотрении</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {moderationNotes.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Заметки:</strong>
                <ul>
                  {moderationNotes.map(note => (
                    <li key={note.id}>
                      {note.text} (Статус: {note.moderation_status})
                      {note.moderation_status === 'rejected' ? (
                        <span style={{ color: 'red', marginLeft: 8 }}>
                          — Отклонено{note.rejection_reason ? `: ${note.rejection_reason}` : ''}
                        </span>
                      ) : note.moderation_status === 'pending' ? (
                        <span style={{ color: '#ff9800', marginLeft: 8 }}>— На рассмотрении</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {moderationComments.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Комментарии:</strong>
                <ul>
                  {moderationComments.map(comment => (
                    <li key={comment.id}>
                      {comment.text} (Статус: {comment.moderation_status})
                      {comment.moderation_status === 'rejected' ? (
                        <span style={{ color: 'red', marginLeft: 8 }}>
                          — Отклонено{comment.rejection_reason ? `: ${comment.rejection_reason}` : ''}
                        </span>
                      ) : comment.moderation_status === 'pending' ? (
                        <span style={{ color: '#ff9800', marginLeft: 8 }}>— На рассмотрении</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;