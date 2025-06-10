// frontend/myths_legends_app/src/pages/ProfilePage.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProfilePage.css';
import { FaUserCircle, FaMapMarkedAlt, FaSignOutAlt, FaStar, FaCheckCircle, FaClock, FaTimesCircle, FaStickyNote, FaCommentDots, FaHeart, FaArrowDown, FaArrowUp, FaListUl } from 'react-icons/fa';

function Chip({ label, color = '#007bff', icon }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', background: color + '22', color, borderRadius: 14, padding: '2px 10px', marginRight: 6, fontSize: 13, fontWeight: 500
    }}>
      {icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}
    </span>
  );
}

function ProfileSection({ icon, title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px #0001', margin: '18px 0', padding: 20 }}>
      <h3 style={{ display: 'flex', alignItems: 'center', fontSize: 22, margin: 0, marginBottom: 12 }}>
        <span style={{ marginRight: 10, fontSize: 22 }}>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

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

  // Быстрая навигация по секциям
  const navSections = [
    { id: 'section-places', label: 'Ваши места', icon: <FaMapMarkedAlt /> },
    { id: 'section-notes', label: 'Заметки', icon: <FaStickyNote /> },
    { id: 'section-comments', label: 'Комментарии', icon: <FaCommentDots /> },
    { id: 'section-favorites', label: 'Избранные', icon: <FaHeart /> },
    { id: 'section-moderation', label: 'На модерации', icon: <FaClock /> },
  ];
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Функция для извлечения id места из заметки или комментария
  function extractPlaceId(item) {
    if (!item) return null;
    if (item.place && typeof item.place === 'object' && item.place !== null && 'id' in item.place) return item.place.id;
    if (typeof item.place === 'number' || typeof item.place === 'string') return item.place;
    return item.place_id || null;
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
        const userFavorites = allPlaces.filter(place => place.properties && place.properties.is_favorite);
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
  const roleColor = currentUser.is_superuser ? '#d32f2f' : currentUser.groups.includes('Moderators') ? '#ff9800' : '#007bff';

  return (
    <div className="profile-container" style={{ maxWidth: 700, margin: '0 auto', padding: 16, position: 'relative' }}>
      {/* --- Диагностика для админа --- */}
      {currentUser.is_superuser && (
        <div style={{ background: '#fffbe6', color: '#b26a00', border: '1px solid #ffe58f', borderRadius: 10, padding: 12, marginBottom: 18, fontSize: 13 }}>
          <b>DEBUG:</b> allPlaceIds: <code>{JSON.stringify(Object.keys(allPlacesById))}</code><br/>
          placesById: <code>{JSON.stringify(allPlacesById)}</code>
        </div>
      )}
      {/* --- Быстрая навигация справа --- */}
      <div style={{
        position: 'fixed',
        top: 110,
        right: 'max(calc((100vw - 700px)/2 - 80px), 16px)',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 14,
        boxShadow: '0 2px 12px #0001',
        padding: '10px 8px',
        alignItems: 'center',
        minWidth: 56,
      }}>
        {navSections.map(sec => (
          <button key={sec.id} onClick={() => scrollToSection(sec.id)} style={{ background: '#f7f8fa', color: '#007bff', border: 'none', borderRadius: 8, padding: '7px 10px', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', minWidth: 40, justifyContent: 'center' }} title={sec.label}>
            {sec.icon}
          </button>
        ))}
      </div>
      {/* --- Шапка профиля --- */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px #0001', padding: 24, marginBottom: 24, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <FaUserCircle size={54} color="#007bff" style={{ marginRight: 18 }} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{currentUser.username}</div>
            <div style={{ color: '#888', fontSize: 15 }}>{currentUser.email || 'Email не указан'}</div>
            <Chip label={role} color={roleColor} />
          </div>
        </div>
      </div>

      {/* --- Ваши места --- */}
      <div id="section-places">
        <ProfileSection icon={<FaMapMarkedAlt />} title="Ваши места">
          {userPlaces.length > 0 ? (
            <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
              {userPlaces.map(place => (
                <li key={place.id} style={{ marginBottom: 10, padding: '10px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: 17 }}>{place.properties?.name || place.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                    {place.properties?.categories && place.properties.categories.split(',').map(cat => <Chip key={cat} label={cat.trim()} color="#007bff" />)}
                    <span style={{ color: '#888', fontSize: 13 }}>{place.properties?.created_at || place.created_at ? new Date(place.properties?.created_at || place.created_at).toLocaleString() : ''}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: '#888', display: 'flex', alignItems: 'center', gap: 8 }}><FaMapMarkedAlt /> Нет добавленных мест.</div>
          )}
        </ProfileSection>
      </div>

      {/* --- Заметки --- */}
      <div id="section-notes">
        <ProfileSection icon={<FaStickyNote />} title="Заметки">
          {userNotes.length > 0 ? (
            <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
              {userNotes.map(note => {
                let placeName = '';
                const placeId = extractPlaceId(note);
                if (placeId && allPlacesById[placeId]) {
                  placeName = allPlacesById[placeId];
                }
                return (
                  <li key={note.id} style={{ marginBottom: 10, padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontWeight: 500 }}>{note.text}</span>
                    {placeId && (
                      <span style={{ color: placeName ? '#007bff' : '#d32f2f', marginLeft: 8, fontSize: 14 }}>
                        (Место: {placeName || `неизвестно (id: ${placeId})`})
                      </span>
                    )}
                    {currentUser.is_superuser && (
                      <div style={{ color: '#b26a00', fontSize: 12, marginTop: 2 }}>
                        place: <code>{JSON.stringify(note.place)}</code>
                      </div>
                    )}
                    <span style={{ color: '#888', marginLeft: 8, fontSize: 13 }}>{note.created_at ? new Date(note.created_at).toLocaleString() : ''}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div style={{ color: '#888', display: 'flex', alignItems: 'center', gap: 8 }}><FaStickyNote /> Нет одобренных заметок.</div>
          )}
        </ProfileSection>
      </div>

      {/* --- Комментарии --- */}
      <div id="section-comments">
        <ProfileSection icon={<FaCommentDots />} title="Комментарии">
          {userComments.length > 0 ? (
            <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
              {userComments.map(comment => {
                let placeName = '';
                const placeId = extractPlaceId(comment);
                if (placeId && allPlacesById[placeId]) {
                  placeName = allPlacesById[placeId];
                }
                return (
                  <li key={comment.id} style={{ marginBottom: 10, padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontWeight: 500 }}>{comment.text}</span>
                    {placeId && (
                      <span style={{ color: placeName ? '#007bff' : '#d32f2f', marginLeft: 8, fontSize: 14 }}>
                        (Место: {placeName || `неизвестно (id: ${placeId})`})
                      </span>
                    )}
                    {currentUser.is_superuser && (
                      <div style={{ color: '#b26a00', fontSize: 12, marginTop: 2 }}>
                        place: <code>{JSON.stringify(comment.place)}</code>
                      </div>
                    )}
                    <span style={{ color: '#888', marginLeft: 8, fontSize: 13 }}>{comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div style={{ color: '#888', display: 'flex', alignItems: 'center', gap: 8 }}><FaCommentDots /> Нет одобренных комментариев.</div>
          )}
        </ProfileSection>
      </div>

      {/* --- Избранные места --- */}
      <div id="section-favorites">
        <ProfileSection icon={<FaHeart color="#d32f2f" />} title={`Избранные места (${favoritePlaces.length})`}>
          {favoritePlaces.length > 0 ? (
            <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
              {favoritePlaces.map(place => (
                <li key={place.id} style={{ marginBottom: 10, padding: '10px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: 17 }}><FaStar color="#FFD600" style={{ marginRight: 6, verticalAlign: 'middle' }} />{place.properties?.name || place.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                    {place.properties?.categories && place.properties.categories.split(',').map(cat => <Chip key={cat} label={cat.trim()} color="#007bff" />)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: '#888', display: 'flex', alignItems: 'center', gap: 8 }}><FaHeart /> У вас нет избранных мест.</div>
          )}
        </ProfileSection>
      </div>

      {/* --- На модерации --- */}
      <div id="section-moderation">
        <ProfileSection icon={<FaClock color="#ff9800" />} title="На модерации">
          {moderationPlaces.length === 0 && moderationNotes.length === 0 && moderationComments.length === 0 ? (
            <div style={{ color: '#888', display: 'flex', alignItems: 'center', gap: 8 }}><FaClock /> Нет объектов на модерации.</div>
          ) : (
            <>
              {moderationPlaces.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Места:</strong>
                  <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
                    {moderationPlaces.map(place => (
                      <li key={place.id} style={{ marginBottom: 8, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <span style={{ fontWeight: 600 }}>{place.properties?.name || place.name}</span>
                        <Chip
                          label={place.properties?.status === 'rejected' || place.status === 'rejected' ? 'Отклонено' : place.properties?.status === 'pending' || place.status === 'pending' ? 'На рассмотрении' : 'Одобрено'}
                          color={place.properties?.status === 'rejected' || place.status === 'rejected' ? '#d32f2f' : place.properties?.status === 'pending' || place.status === 'pending' ? '#ff9800' : '#007bff'}
                          icon={place.properties?.status === 'rejected' || place.status === 'rejected' ? <FaTimesCircle /> : place.properties?.status === 'pending' || place.status === 'pending' ? <FaClock /> : <FaCheckCircle />}
                        />
                        {place.properties?.rejection_reason && (
                          <span style={{ color: '#d32f2f', marginLeft: 8, fontSize: 13 }}>Причина: {place.properties.rejection_reason}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {moderationNotes.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Заметки:</strong>
                  <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
                    {moderationNotes.map(note => (
                      <li key={note.id} style={{ marginBottom: 8, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <span style={{ fontWeight: 500 }}>{note.text}</span>
                        <Chip
                          label={note.moderation_status === 'rejected' ? 'Отклонено' : note.moderation_status === 'pending' ? 'На рассмотрении' : 'Одобрено'}
                          color={note.moderation_status === 'rejected' ? '#d32f2f' : note.moderation_status === 'pending' ? '#ff9800' : '#007bff'}
                          icon={note.moderation_status === 'rejected' ? <FaTimesCircle /> : note.moderation_status === 'pending' ? <FaClock /> : <FaCheckCircle />}
                        />
                        {note.rejection_reason && (
                          <span style={{ color: '#d32f2f', marginLeft: 8, fontSize: 13 }}>Причина: {note.rejection_reason}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {moderationComments.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Комментарии:</strong>
                  <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
                    {moderationComments.map(comment => (
                      <li key={comment.id} style={{ marginBottom: 8, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <span style={{ fontWeight: 500 }}>{comment.text}</span>
                        <Chip
                          label={comment.moderation_status === 'rejected' ? 'Отклонено' : comment.moderation_status === 'pending' ? 'На рассмотрении' : 'Одобрено'}
                          color={comment.moderation_status === 'rejected' ? '#d32f2f' : comment.moderation_status === 'pending' ? '#ff9800' : '#007bff'}
                          icon={comment.moderation_status === 'rejected' ? <FaTimesCircle /> : comment.moderation_status === 'pending' ? <FaClock /> : <FaCheckCircle />}
                        />
                        {comment.rejection_reason && (
                          <span style={{ color: '#d32f2f', marginLeft: 8, fontSize: 13 }}>Причина: {comment.rejection_reason}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </ProfileSection>
      </div>
    </div>
  );
}

export default ProfilePage;