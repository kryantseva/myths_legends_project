// frontend/myths_legends_app/src/pages/HomePage.js
import React, { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import axios from 'axios';
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../components/AuthContext';

// Исправление для иконок Leaflet по умолчанию
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

const customMarkerIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userLocationIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Функция для парсинга WKT строки в объект координат.
const parseWktPoint = (wktStringOrObject) => {
  if (typeof wktStringOrObject === 'object' && wktStringOrObject !== null && wktStringOrObject.type === 'Point' && Array.isArray(wktStringOrObject.coordinates)) {
    return { longitude: wktStringOrObject.coordinates[0], latitude: wktStringOrObject.coordinates[1] };
  }
  if (!wktStringOrObject || typeof wktStringOrObject !== 'string') return null;
  const match = wktStringOrObject.match(/POINT \(([^ ]+) ([^ ]+)\)/);
  if (match && match.length === 3) {
    const longitude = parseFloat(match[1]);
    const latitude = parseFloat(match[2]);
    return !isNaN(longitude) && !isNaN(latitude) ? { longitude, latitude } : null;
  }
  return null;
};

function LocationMarker({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, map.getZoom());
  }, [position, map]);
  return position === null ? null : (
    <Marker position={position} icon={userLocationIcon}>
      <Popup>Вы находитесь здесь!</Popup>
    </Marker>
  );
}

function MapClickListener({ isAddingPlaceMode, onMapClickForAdd }) {
  useMapEvents({
    click(e) {
      if (isAddingPlaceMode) onMapClickForAdd(e.latlng);
    },
    mousemove(e) {
      if (isAddingPlaceMode) e.originalEvent.target.style.cursor = 'crosshair';
      else e.originalEvent.target.style.cursor = '';
    },
  });
  return null;
}

function MapButtons({ onLocateMe, onAddPlaceModeToggle, isAddingPlaceMode, isAuthenticated }) {
  const map = useMapEvents({});
  return (
    <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <button
        onClick={() => onLocateMe(map)}
        style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#007bff', color: 'white', fontSize: '24px', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
        title="Моя геолокация"
      >
        📍
      </button>
      {isAuthenticated && (
        <button
          onClick={onAddPlaceModeToggle}
          style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: isAddingPlaceMode ? '#ffc107' : '#28a745', color: 'white', fontSize: '24px', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
          title={isAddingPlaceMode ? "Отменить добавление" : "Добавить новое место"}
        >
          {isAddingPlaceMode ? '✖' : '+'}
        </button>
      )}
    </div>
  );
}

function PlaceInfoModal({ place, onClose, userLocation }) {
  const { currentUser, isLoggedIn, authToken } = useAuth();
  const [notes, setNotes] = useState([]);
  const [comments, setComments] = useState([]);
  const [formType, setFormType] = useState('note'); // note или comment
  const [noteForm, setNoteForm] = useState({ text: '', image: null });
  const [commentForm, setCommentForm] = useState({ text: '' });
  const [formMsg, setFormMsg] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [distanceToUser, setDistanceToUser] = useState(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!place) return;
    const fetchNotesAndComments = async () => {
      try {
        const notesResp = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/notes/?place=${place.id}&moderation_status=approved&page_size=1000`);
        const notesArr = Array.isArray(notesResp.data.results) ? notesResp.data.results : notesResp.data;
        setNotes(notesArr);
        const commentsResp = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/comments/?place=${place.id}&moderation_status=approved&page_size=1000`);
        const commentsArr = Array.isArray(commentsResp.data.results) ? commentsResp.data.results : commentsResp.data;
        setComments(commentsArr);
      } catch (e) {
        setNotes([]);
        setComments([]);
      }
    };
    fetchNotesAndComments();
  }, [place]);

  useEffect(() => {
    if (userLocation && place.geometry) {
      const coords = parseWktPoint(place.geometry);
      if (coords) {
        const toRad = deg => deg * Math.PI / 180;
        const R = 6371e3; // радиус Земли в метрах
        const φ1 = toRad(userLocation.lat);
        const φ2 = toRad(coords.latitude);
        const Δφ = toRad(coords.latitude - userLocation.lat);
        const Δλ = toRad(coords.longitude - userLocation.lng);
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        setDistanceToUser(Math.round(R * c));
      }
    }
  }, [userLocation, place.geometry]);

  useEffect(() => {
    setIsFavorite(place?.properties?.is_favorite ?? place?.is_favorite ?? false);
  }, [place]);

  const handleNoteFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') setNoteForm(f => ({ ...f, image: files[0] }));
    else setNoteForm(f => ({ ...f, [name]: value }));
  };
  const handleCommentFormChange = (e) => {
    const { name, value } = e.target;
    setCommentForm(f => ({ ...f, [name]: value }));
  };
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) { setFormMsg('Требуется вход'); return; }
    if (formType === 'note') {
      if (!noteForm.text.trim()) { setFormMsg('Введите текст заметки'); return; }
      setFormLoading(true); setFormMsg('Отправка...');
      try {
        const formData = new FormData();
        formData.append('place', place.id);
        formData.append('text', noteForm.text);
        if (noteForm.image) formData.append('image', noteForm.image);
        await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/notes/`, formData, {
          headers: { Authorization: `Token ${authToken}` }
        });
        setNoteForm({ text: '', image: null });
        setFormMsg('');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } catch (err) {
        setFormMsg('Ошибка при отправке');
      } finally {
        setFormLoading(false);
      }
    } else if (formType === 'comment') {
      if (!commentForm.text.trim()) { setFormMsg('Введите текст комментария'); return; }
      setFormLoading(true); setFormMsg('Отправка...');
      try {
        await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/comments/`, {
          place: place.id,
          text: commentForm.text
        }, {
          headers: { Authorization: `Token ${authToken}` }
        });
        setCommentForm({ text: '' });
        setFormMsg('');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } catch (err) {
        setFormMsg('Ошибка при отправке');
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleToggleFavorite = async () => {
    if (!isLoggedIn || !place) return;
    setFavoriteLoading(true);
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/places/${place.id}/toggle_favorite/`, {}, { headers: { Authorization: `Token ${authToken}` } });
      console.log('toggle_favorite response:', response.status, response.data);
      setIsFavorite(f => !f);
    } catch (e) {
      console.error('toggle_favorite error:', e.response?.status, e.response?.data || e.message);
    }
    setFavoriteLoading(false);
  };

  if (!place) return null;
  const properties = place.properties || {};
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 10, padding: 24, minWidth: 350, maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
        <h2>{properties.name}</h2>
        {distanceToUser !== null && (
          <p style={{ color: '#d32f2f', fontWeight: 600 }}>Расстояние до вас: {distanceToUser < 1000 ? `${distanceToUser} м` : `${(distanceToUser/1000).toFixed(2)} км`}</p>
        )}
        <p><strong>Описание:</strong> {properties.description}</p>
        <p><strong>Категории:</strong> {properties.categories}</p>
        {properties.image && <img src={properties.image} alt={properties.name} style={{ maxWidth: '100%', margin: '10px 0' }} />}
        {isLoggedIn && (
          <form onSubmit={handleFormSubmit} style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="formType">Что вы хотите добавить? </label>
              <select id="formType" value={formType} onChange={e => { setFormType(e.target.value); setFormMsg(''); }}>
                <option value="note">Заметка</option>
                <option value="comment">Комментарий</option>
              </select>
            </div>
            {formType === 'note' ? (
              <>
                <h3>Добавить заметку</h3>
                <textarea
                  name="text"
                  value={noteForm.text}
                  onChange={handleNoteFormChange}
                  placeholder="Текст заметки"
                  rows={4}
                  style={{ width: '100%' }}
                />
                <div style={{ margin: '10px 0' }}>
                  Картинка: <input type="file" name="image" accept="image/*" onChange={handleNoteFormChange} />
                </div>
              </>
            ) : (
              <>
                <h3>Добавить комментарий</h3>
                <textarea
                  name="text"
                  value={commentForm.text}
                  onChange={handleCommentFormChange}
                  placeholder="Текст комментария"
                  rows={3}
                  style={{ width: '100%' }}
                />
              </>
            )}
            <button type="submit" disabled={formLoading} style={{ width: '100%', padding: 8, background: '#eee', border: 'none', fontSize: 18 }}>
              {formLoading ? 'Отправка...' : 'Добавить'}
            </button>
            {formMsg && <div style={{ color: formMsg.startsWith('Ошибка') ? 'red' : 'orange', marginTop: 8 }}>{formMsg}</div>}
          </form>
        )}
        {showToast && (
          <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: '#4caf50', color: 'white', padding: '12px 24px', borderRadius: 8, zIndex: 9999, fontSize: 18 }}>
            {formType === 'note' ? 'Заметка' : 'Комментарий'} отправлен на модерацию!
          </div>
        )}
        <div style={{ marginTop: 20 }}>
          <h4>Заметки</h4>
          {notes.length === 0 ? <p>Нет заметок</p> : (
            <ul>
              {notes.map(note => (
                <li key={note.id}>
                  <b>{note.text}</b>
                  {note.image && <img src={note.image} alt="note" style={{ maxWidth: 60, marginLeft: 8 }} />}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div style={{ marginTop: 20 }}>
          <h4>Комментарии</h4>
          {comments.length === 0 ? <p>Нет комментариев</p> : (
            <ul>
              {comments.map(comment => (
                <li key={comment.id}>{comment.text}</li>
              ))}
            </ul>
          )}
        </div>
        {isLoggedIn && (
          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={handleToggleFavorite} disabled={favoriteLoading} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}>
              <StarIcon filled={isFavorite} />
            </button>
            <span style={{ fontWeight: 500, color: isFavorite ? '#FFD600' : '#888', fontSize: 15 }}>
              {isFavorite ? 'В избранном!' : 'Добавь в избранное!'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// 1. Импорт иконки звезды (SVG)
const StarIcon = ({ filled, ...props }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={filled ? '#FFD600' : 'none'} stroke="#FFD600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

function HomePage() {
  const { authToken } = useAuth();
  const [places, setPlaces] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAddingPlaceMode, setIsAddingPlaceMode] = useState(false);
  const [newPlaceCoordinates, setNewPlaceCoordinates] = useState(null);
  const [newPlaceData, setNewPlaceData] = useState({
    name: '',
    description: '',
    categories: '',
    image: null,
  });
  const [formMessage, setFormMessage] = useState('');
  const [showModerationAlert, setShowModerationAlert] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [addToFavorite, setAddToFavorite] = useState(false);

  const kazanCoordinates = [55.7961, 49.1064];
  const initialZoom = 15;
  const radiusKm = 2;

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);
  }, []);

  const fetchPlaces = useCallback(async (latitude = null, longitude = null) => {
    let url = `${process.env.REACT_APP_API_BASE_URL}/api/places/`;
    if (latitude !== null && longitude !== null) {
      url = `${process.env.REACT_APP_API_BASE_URL}/api/places/nearest/?lat=${latitude}&lon=${longitude}&radius_km=${radiusKm}`;
    }
    try {
      const response = await axios.get(url);
      if (response.status !== 200) throw new Error(`HTTP error! status: ${response.status}`);
      const data = response.data;
      if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
        setPlaces(data.features);
      } else {
        console.error("API response is not a valid GeoJSON FeatureCollection:", data);
        setPlaces([]);
      }
    } catch (error) {
      console.error("Error fetching places:", error);
      setPlaces([]);
    }
  }, [radiusKm]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const handleLocateMe = useCallback((mapInstance) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const currentLatLng = L.latLng(latitude, longitude);
          setUserLocation(currentLatLng);
          mapInstance.flyTo(currentLatLng, mapInstance.getZoom());
        },
        (error) => {
          console.error("Error getting user location:", error);
          alert("Не удалось определить вашу геолокацию. Возможно, вы запретили доступ или функция недоступна.");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      alert("Ваш браузер не поддерживает геолокацию.");
    }
  }, []);

  const handleAddPlaceModeToggle = useCallback(() => {
    if (!isAuthenticated) {
      alert("Для добавления места необходимо авторизоваться.");
      return;
    }
    setIsAddingPlaceMode(prevMode => !prevMode);
    setNewPlaceCoordinates(null);
    setFormMessage('');
  }, [isAuthenticated]);

  const handleMapClickForNewPlace = useCallback((latlng) => {
    if (!isAuthenticated) {
      alert("Для добавления места необходимо авторизоваться.");
      return;
    }
    setNewPlaceCoordinates(latlng);
    setIsAddingPlaceMode(false);
    setFormMessage('Координаты выбраны. Заполните информацию о месте.');
  }, [isAuthenticated]);

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setNewPlaceData(prevData => ({ ...prevData, image: files[0] }));
    } else {
      setNewPlaceData(prevData => ({ ...prevData, [name]: value }));
    }
  };

  const handleNewPlaceSubmit = async (e) => {
    e.preventDefault();
    setFormMessage('Сохранение места...');

    if (!authToken) {
      setFormMessage('Ошибка: Необходимо авторизоваться.');
      return;
    }

    if (!newPlaceCoordinates) {
      setFormMessage('Ошибка: Сначала выберите координаты на карте.');
      return;
    }

    const formData = new FormData();
    const geometryObject = {
        type: "Point",
        coordinates: [newPlaceCoordinates.lng, newPlaceCoordinates.lat]
    };
    formData.append('geometry', JSON.stringify(geometryObject));
    const propertiesObject = {
        name: newPlaceData.name,
        description: newPlaceData.description,
        categories: newPlaceData.categories,
    };
    formData.append('properties', JSON.stringify(propertiesObject));
    if (newPlaceData.image) formData.append('image', newPlaceData.image);

    try {
      const headers = {
        Authorization: `Token ${authToken}`,
      };
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/places/`, formData, { headers });

      if (response.status === 201) {
        setFormMessage('Место успешно добавлено и ожидает модерации!');
        setNewPlaceCoordinates(null);
        setNewPlaceData({ name: '', description: '', categories: '', image: null });
        fetchPlaces();
        setShowModerationAlert(true);
        setAddToFavorite(false);
      } else {
        throw new Error('Неожиданный ответ сервера');
      }
    } catch (error) {
      console.error('Error adding new place:', error.response?.data || error.message);
      let errorMessage = 'Неизвестная ошибка.';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else {
          errorMessage = JSON.stringify(error.response.data, null, 2);
        }
      } else {
        errorMessage = error.message;
      }
      setFormMessage('Ошибка при добавлении места: ' + errorMessage);
    }
  };

  const handleModerationAlertClose = () => {
    setShowModerationAlert(false);
  };

  return (
    <div className="main">
      <MapContainer
        center={kazanCoordinates}
        zoom={initialZoom}
        scrollWheelZoom={true}
        style={{ height: 'calc(100vh - 80px)', width: '100%' }}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={userLocation} />
        <MapButtons
          onLocateMe={handleLocateMe}
          onAddPlaceModeToggle={handleAddPlaceModeToggle}
          isAddingPlaceMode={isAddingPlaceMode}
          isAuthenticated={isAuthenticated}
        />
        <MapClickListener
          isAddingPlaceMode={isAddingPlaceMode && isAuthenticated}
          onMapClickForAdd={handleMapClickForNewPlace}
        />
        {newPlaceCoordinates && isAuthenticated && (
          <Marker position={newPlaceCoordinates} icon={customMarkerIcon}>
            <Popup>Координаты нового места</Popup>
          </Marker>
        )}
        {places.map(place => {
          const coords = place.geometry ? parseWktPoint(place.geometry) : null;
          if (!coords) {
            console.warn("Пропускаем место из-за отсутствующих или некорректных координат:", place);
            return null;
          }
          return (
            <Marker
              position={[coords.latitude, coords.longitude]}
              icon={customMarkerIcon}
              key={place.id || place.properties.id}
              eventHandlers={{
                click: () => setSelectedPlace(place)
              }}
            />
          );
        })}
      </MapContainer>

      {newPlaceCoordinates && isAuthenticated && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
          zIndex: 1001,
          width: '90%',
          maxWidth: '400px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Добавить новое место</h3>
          <form onSubmit={handleNewPlaceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label htmlFor="newPlaceName" style={{ display: 'block', marginBottom: '5px' }}>Название:</label>
              <input
                type="text"
                id="newPlaceName"
                name="name"
                value={newPlaceData.name}
                onChange={handleFormChange}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
              />
            </div>
            <div>
              <label htmlFor="newPlaceDescription" style={{ display: 'block', marginBottom: '5px' }}>Описание:</label>
              <textarea
                id="newPlaceDescription"
                name="description"
                value={newPlaceData.description}
                onChange={handleFormChange}
                required
                rows="4"
                style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
              ></textarea>
            </div>
            <div>
              <label htmlFor="newPlaceCategories" style={{ display: 'block', marginBottom: '5px' }}>Категории (через запятую):</label>
              <input
                type="text"
                id="newPlaceCategories"
                name="categories"
                value={newPlaceData.categories}
                onChange={handleFormChange}
                style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
                placeholder="Например: миф, легенда, история"
              />
            </div>
            <div>
              <label htmlFor="newPlaceImage" style={{ display: 'block', marginBottom: '5px' }}>Изображение:</label>
              <input
                type="file"
                id="newPlaceImage"
                name="image"
                accept="image/*"
                onChange={handleFormChange}
                style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
              <button
                type="button"
                onClick={() => setNewPlaceCoordinates(null)}
                style={{ padding: '8px 15px', borderRadius: '5px', border: '1px solid #6c757d', backgroundColor: '#6c757d', color: 'white', cursor: 'pointer' }}
              >
                Отмена
              </button>
              <button
                type="submit"
                style={{ padding: '8px 15px', borderRadius: '5px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}
              >
                Сохранить место
              </button>
            </div>
          </form>
          {formMessage && <p style={{ marginTop: '10px', textAlign: 'center', color: formMessage.startsWith('Ошибка') ? 'red' : 'green' }}>{formMessage}</p>}
        </div>
      )}

      {showModerationAlert && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
          zIndex: 1002,
          textAlign: 'center',
        }}>
          <p>Ваше место появится на карте после модерации администратором.</p>
          <button
            onClick={handleModerationAlertClose}
            style={{ padding: '8px 15px', marginTop: '10px', borderRadius: '5px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}
          >
            ОК
          </button>
        </div>
      )}

      {selectedPlace && (
        <PlaceInfoModal place={selectedPlace} onClose={() => setSelectedPlace(null)} userLocation={userLocation} />
      )}
    </div>
  );
}

export default HomePage;