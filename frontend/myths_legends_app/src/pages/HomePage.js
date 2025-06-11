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
import { FaMapMarkedAlt, FaFilter, FaSearch, FaStar, FaPlus, FaTimes, FaLocationArrow, FaListUl, FaImage, FaTag, FaAlignLeft, FaStickyNote, FaCommentDots } from 'react-icons/fa';

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
        <FaLocationArrow />
      </button>
      {isAuthenticated && (
        <button
          onClick={onAddPlaceModeToggle}
          style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: isAddingPlaceMode ? '#ffc107' : '#28a745', color: 'white', fontSize: '24px', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
          title={isAddingPlaceMode ? "Отменить добавление" : "Добавить новое место"}
        >
          {isAddingPlaceMode ? <FaTimes /> : <FaPlus />}
        </button>
      )}
    </div>
  );
}

// --- Lightbox для предпросмотра изображений ---
function ImageLightbox({ src, alt, onClose }) {
  if (!src) return null;
  return (
    <div style={{ position: 'fixed', zIndex: 9999, top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <img src={src} alt={alt} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 4px 32px #0008' }} onClick={e => e.stopPropagation()} />
      <button onClick={onClose} style={{ position: 'fixed', top: 30, right: 40, fontSize: 36, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', zIndex: 10000 }}>×</button>
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
  // --- state для lightbox ---
  const [lightboxImg, setLightboxImg] = useState(null);
  // --- state для множественных файлов заметки ---
  const [noteImages, setNoteImages] = useState([]); // File[]
  const [noteImagePreviews, setNoteImagePreviews] = useState([]); // string[]

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
    if (name === 'images') {
      let selectedFiles = Array.from(files).slice(0, 5);
      setNoteImages(selectedFiles);
      setNoteImagePreviews(selectedFiles.map(file => URL.createObjectURL(file)));
    } else {
      setNoteForm(f => ({ ...f, [name]: value }));
    }
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
        noteImages.slice(0, 5).forEach(file => formData.append('image_files', file));
        await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/notes/`, formData, {
          headers: { Authorization: `Token ${authToken}` }
        });
        setNoteForm({ text: '', image: null });
        setNoteImages([]);
        setNoteImagePreviews([]);
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

  const handleRemoveNoteImage = (idx) => {
    setNoteImages(prev => prev.filter((_, i) => i !== idx));
    setNoteImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  if (!place) return null;
  const properties = place.properties || {};
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 32px #0002', padding: 32, minWidth: 350, maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 18, background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: '#888' }} title="Закрыть"><FaTimes /></button>
        {/* Кнопка избранное в левом верхнем углу */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, justifyContent: 'flex-start' }}>
          <button onClick={handleToggleFavorite} disabled={favoriteLoading} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 28 }} title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}>
            <FaStar color={isFavorite ? '#FFD600' : '#bbb'} />
          </button>
          <span style={{ fontWeight: 500, color: isFavorite ? '#FFD600' : '#888', fontSize: 16 }}>
            {isFavorite ? 'В избранном!' : 'Добавить в избранное'}
          </span>
        </div>
        <h2 style={{ display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: 26, marginBottom: 10 }}><FaMapMarkedAlt style={{ marginRight: 10, color: '#007bff' }} /> {properties.name}</h2>
        {/* Дата создания и владелец места */}
        <div style={{ color: '#888', fontSize: 15, marginBottom: 8 }}>
          {properties.created_at && <span>Создано: {new Date(properties.created_at).toLocaleString()} </span>}
          {properties.owner && properties.owner.username && <span> | Владелец: {properties.owner.username}</span>}
        </div>
        {distanceToUser !== null && (
          <p style={{ color: '#d32f2f', fontWeight: 600, marginBottom: 8 }}><FaLocationArrow style={{ marginRight: 6 }} />Расстояние до вас: {distanceToUser < 1000 ? `${distanceToUser} м` : `${(distanceToUser/1000).toFixed(2)} км`}</p>
        )}
        <div style={{ marginBottom: 10, color: '#444', fontSize: 16 }}><FaAlignLeft style={{ marginRight: 7, color: '#888' }} /><strong>Описание:</strong> {properties.description}</div>
        <div style={{ marginBottom: 10, color: '#444', fontSize: 16 }}><FaTag style={{ marginRight: 7, color: '#888' }} /><strong>Категории:</strong> {properties.categories}</div>
        {/* Галерея изображений места */}
        {Array.isArray(properties.images) && properties.images.length > 0 && (
          <div style={{ display: 'flex', gap: 12, margin: '12px 0', flexWrap: 'wrap' }}>
            {properties.images.map((img, idx) => (
              <img key={idx} src={img.image} alt={`place-img-${idx}`} style={{ width: properties.images.length === 1 ? 400 : 120, height: properties.images.length === 1 ? 'auto' : 120, maxWidth: '100%', objectFit: 'cover', borderRadius: 10, boxShadow: '0 2px 8px #0001', cursor: 'pointer' }} onClick={() => setLightboxImg(img.image)} />
            ))}
          </div>
        )}
        <ImageLightbox src={lightboxImg} alt="preview" onClose={() => setLightboxImg(null)} />
        <div style={{ marginTop: 18 }}>
          <h4 style={{ display: 'flex', alignItems: 'center', fontSize: 18, margin: 0, marginBottom: 8 }}><FaStickyNote style={{ marginRight: 7, color: '#43a047' }} /> Заметки</h4>
          {notes.length === 0 ? <p style={{ color: '#888' }}>Нет заметок</p> : (
            <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
              {notes.map(note => (
                <li key={note.id} style={{ marginBottom: 12, fontSize: 15, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                  <div style={{ color: '#888', fontSize: 13, marginBottom: 2 }}>
                    {note.user && note.user.username && <span>Автор: {note.user.username}</span>}
                    {note.created_at && <span> | {new Date(note.created_at).toLocaleString()}</span>}
                  </div>
                  <span style={{ fontWeight: 400 }}>{note.text}</span>
                  {/* Галерея для заметок */}
                  {Array.isArray(note.images) && note.images.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, margin: '8px 0', flexWrap: 'wrap' }}>
                      {note.images.map((img, idx) => (
                        <img key={idx} src={img.image} alt={`note-img-${idx}`} style={{ width: note.images.length === 1 ? 250 : 100, height: note.images.length === 1 ? 'auto' : 100, objectFit: 'cover', borderRadius: 8, boxShadow: '0 2px 8px #0001', cursor: 'pointer' }} onClick={() => setLightboxImg(img.image)} />
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Визуальный разделитель */}
        <hr style={{ margin: '18px 0', border: 0, borderTop: '1.5px solid #e0e0e0' }} />
        <div style={{ marginTop: 0 }}>
          <h4 style={{ display: 'flex', alignItems: 'center', fontSize: 18, margin: 0, marginBottom: 8 }}><FaCommentDots style={{ marginRight: 7, color: '#ff9800' }} /> Комментарии</h4>
          {comments.length === 0 ? <p style={{ color: '#888' }}>Нет комментариев</p> : (
            <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
              {comments.map(comment => (
                <li key={comment.id} style={{ marginBottom: 6, fontSize: 15 }}>
                  <div style={{ color: '#888', fontSize: 13, marginBottom: 2 }}>
                    {comment.user && comment.user.username && <span>Автор: {comment.user.username}</span>}
                    {comment.created_at && <span> | {new Date(comment.created_at).toLocaleString()}</span>}
                  </div>
                  <span style={{ fontWeight: 400 }}>{comment.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {isLoggedIn && (
          <form onSubmit={handleFormSubmit} style={{ marginTop: 24, background: '#f7f8fa', borderRadius: 12, padding: 18, boxShadow: '0 2px 8px #0001' }}>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="formType" style={{ fontWeight: 600, marginRight: 8 }}>Что вы хотите добавить?</label>
              <select id="formType" value={formType} onChange={e => { setFormType(e.target.value); setFormMsg(''); }} style={{ borderRadius: 8, padding: 6, fontSize: 15 }}>
                <option value="note">Заметка</option>
                <option value="comment">Комментарий</option>
              </select>
            </div>
            {formType === 'note' ? (
              <>
                <h3 style={{ display: 'flex', alignItems: 'center', fontSize: 18, margin: '10px 0' }}><FaStickyNote style={{ marginRight: 7, color: '#43a047' }} /> Добавить заметку</h3>
                <textarea
                  name="text"
                  value={noteForm.text}
                  onChange={handleNoteFormChange}
                  placeholder="Текст заметки"
                  rows={4}
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #ccc', padding: 10, fontSize: 15, marginBottom: 8 }}
                />
                <div style={{ margin: '10px 0' }}>
                  <FaImage style={{ marginRight: 6, color: '#888' }} /> Картинки (до 5):
                  <input type="file" name="images" accept="image/*" multiple onChange={handleNoteFormChange} />
                  {noteImagePreviews.length > 0 && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                      {noteImagePreviews.map((src, idx) => (
                        <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                          <img src={src} alt={`preview-${idx}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, boxShadow: '0 2px 8px #0001', cursor: 'pointer' }} onClick={() => setLightboxImg(src)} />
                          <button type="button" onClick={() => handleRemoveNoteImage(idx)} style={{ position: 'absolute', top: -8, right: -8, background: '#fff', border: '1px solid #888', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: '#d32f2f', fontWeight: 700, fontSize: 16, lineHeight: '18px', padding: 0 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <h3 style={{ display: 'flex', alignItems: 'center', fontSize: 18, margin: '10px 0' }}><FaCommentDots style={{ marginRight: 7, color: '#ff9800' }} /> Добавить комментарий</h3>
                <textarea
                  name="text"
                  value={commentForm.text}
                  onChange={handleCommentFormChange}
                  placeholder="Текст комментария"
                  rows={3}
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #ccc', padding: 10, fontSize: 15, marginBottom: 8 }}
                />
              </>
            )}
            <button type="submit" disabled={formLoading} style={{ width: '100%', padding: 10, background: '#007bff', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 17, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {formLoading ? 'Отправка...' : formType === 'note' ? <><FaPlus /> Добавить заметку</> : <><FaPlus /> Добавить комментарий</>}
            </button>
            {formMsg && <div style={{ color: formMsg.startsWith('Ошибка') ? 'red' : 'orange', marginTop: 8 }}>{formMsg}</div>}
          </form>
        )}
        {showToast && (
          <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: '#4caf50', color: 'white', padding: '12px 24px', borderRadius: 8, zIndex: 9999, fontSize: 18 }}>
            {formType === 'note' ? 'Заметка' : 'Комментарий'} отправлен на модерацию!
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

function extractCategories(places) {
  const set = new Set();
  places.forEach(place => {
    const cats = (place.properties?.categories || place.categories || "").split(',').map(c => c.trim()).filter(Boolean);
    cats.forEach(c => set.add(c));
  });
  return Array.from(set).sort();
}

// --- ДОБАВЛЯЮ ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ДЛЯ ЧИПОВ ---
function Chip({ label, onDelete }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', background: '#e0e0e0', borderRadius: 16, padding: '2px 10px', marginRight: 6, fontSize: 14
    }}>
      {label}
      {onDelete && <span onClick={onDelete} style={{ marginLeft: 6, cursor: 'pointer', color: '#888', fontWeight: 700 }}>&times;</span>}
    </span>
  );
}

// --- ДОБАВЛЯЮ КОМПОНЕНТ ДЛЯ КАРТОЧКИ СЕКЦИИ ---
function SectionCard({ icon, title, children, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px #0001', margin: '18px 0', padding: 20, ...style }}>
      <h2 style={{ display: 'flex', alignItems: 'center', fontSize: 22, margin: 0, marginBottom: 12 }}>
        <span style={{ marginRight: 10, fontSize: 22 }}>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function HomePage() {
  const { authToken } = useAuth();
  const [places, setPlaces] = useState([]);
  const [filteredPlaces, setFilteredPlaces] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [nearMe, setNearMe] = useState(false);
  const [radius, setRadius] = useState(10);
  const [userLocation, setUserLocation] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAddingPlaceMode, setIsAddingPlaceMode] = useState(false);
  const [newPlaceCoordinates, setNewPlaceCoordinates] = useState(null);
  const [newPlaceData, setNewPlaceData] = useState({
    name: '',
    description: '',
    categories: '',
    images: [],
  });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [formMessage, setFormMessage] = useState('');
  const [showModerationAlert, setShowModerationAlert] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [addToFavorite, setAddToFavorite] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

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
    if (name === 'images') {
      let selectedFiles = Array.from(files).slice(0, 5);
      setNewPlaceData(prevData => ({ ...prevData, images: selectedFiles }));
      // генерируем превью
      const previews = selectedFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(previews);
    } else {
      setNewPlaceData(prevData => ({ ...prevData, [name]: value }));
    }
  };

  const handleRemoveImage = (idx) => {
    setNewPlaceData(prevData => {
      const newImages = prevData.images.filter((_, i) => i !== idx);
      return { ...prevData, images: newImages };
    });
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
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
    // добавляем до 5 файлов
    (newPlaceData.images || []).slice(0, 5).forEach(file => {
      formData.append('image_files', file);
    });
    try {
      const headers = {
        Authorization: `Token ${authToken}`,
      };
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/places/`, formData, { headers });
      if (response.status === 201) {
        setFormMessage('Место успешно добавлено и ожидает модерации!');
        setNewPlaceCoordinates(null);
        setNewPlaceData({ name: '', description: '', categories: '', images: [] });
        setImagePreviews([]);
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

  // Сбор всех категорий при загрузке мест
  useEffect(() => {
    setAllCategories(extractCategories(places));
  }, [places]);

  // --- МУЛЬТИВЫБОР КАТЕГОРИЙ, ОТОБРАЖЕНИЕ ЧИПОВ ---
  const handleCategoryToggle = cat => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
    setNearMe(false);
    setShowSearch(false);
    setSearchResults([]);
  };
  const handleClearCategories = () => setSelectedCategories([]);

  // --- handleNearMeToggle теперь не сбрасывает категории ---
  const handleNearMeToggle = useCallback((checked) => {
    setNearMe(checked);
    setShowSearch(false);
    setSearchResults([]);
    if (checked) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });
          },
          (error) => {
            alert("Не удалось определить вашу геолокацию. Возможно, вы запретили доступ или функция недоступна.");
            setNearMe(false);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        alert("Ваш браузер не поддерживает геолокацию.");
        setNearMe(false);
      }
    } else {
      setUserLocation(null);
    }
  }, []);

  // --- ФИЛЬТРАЦИЯ: категории и радиус могут работать одновременно ---
  useEffect(() => {
    let filtered = places;
    // Сначала фильтруем по категориям, если выбраны
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(place => {
        const cats = (place.properties?.categories || place.categories || "").split(',').map(c => c.trim());
        return cats.some(cat => selectedCategories.includes(cat));
      });
    }
    // Затем, если включён радиус и есть userLocation, ДОПОЛНИТЕЛЬНО фильтруем по расстоянию
    if (nearMe && userLocation) {
      filtered = filtered.filter(place => {
        const coords = place.geometry ? parseWktPoint(place.geometry) : null;
        if (!coords) return false;
        const toRad = deg => deg * Math.PI / 180;
        const R = 6371; // км
        const dLat = toRad(coords.latitude - userLocation.lat);
        const dLon = toRad(coords.longitude - userLocation.lng);
        const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(userLocation.lat)) * Math.cos(toRad(coords.latitude)) * Math.sin(dLon/2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const dist = R * c;
        return dist <= radius;
      });
    }
    // Фильтрация по избранным
    if (showOnlyFavorites) {
      filtered = filtered.filter(place => place.properties?.is_favorite || place.is_favorite);
    }
    setFilteredPlaces(filtered);
  }, [places, selectedCategories, nearMe, radius, userLocation, showOnlyFavorites]);

  // --- ПОИСК ПО НАЗВАНИЮ И КАТЕГОРИЯМ ---
  const handleSearch = () => {
    if (!searchValue.trim()) return;
    const val = searchValue.trim().toLowerCase();
    const found = places.filter(place => {
      const name = (place.properties?.name || place.name || "").toLowerCase();
      const cats = (place.properties?.categories || place.categories || "").toLowerCase();
      return name.includes(val) || cats.includes(val);
    });
    setSearchResults(found);
    setShowSearch(true);
  };
  const handleReset = () => {
    setSelectedCategories([]);
    setNearMe(false);
    setRadius(10);
    setSearchValue("");
    setSearchResults([]);
    setShowSearch(false);
    setFilteredPlaces(places);
    setUserLocation(null);
  };
  const handleResetFilters = () => {
    setSelectedCategories([]);
    setNearMe(false);
    setRadius(10);
    setFilteredPlaces(places);
    setUserLocation(null);
  };

  // --- UI ФИЛЬТРОВ ---
  const renderFilters = () => (
    <div style={{ background: '#fff', padding: 20, borderRadius: 14, boxShadow: '0 2px 12px #0001', minWidth: 260, maxWidth: 340 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Поиск по названию или категории..."
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc', minWidth: 180 }}
        />
        <button onClick={handleSearch} style={{ padding: '6px 14px', borderRadius: 4, background: '#007bff', color: 'white', border: 'none' }}>Поиск</button>
        <button onClick={handleReset} style={{ padding: '6px 14px', borderRadius: 4, background: '#e0e0e0', color: '#333', border: 'none' }}>Сбросить всё</button>
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <b>Категории:</b>
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryToggle(cat)}
              style={{
                marginLeft: 8, marginRight: 4, padding: '3px 10px', borderRadius: 12, border: selectedCategories.includes(cat) ? '2px solid #007bff' : '1px solid #ccc',
                background: selectedCategories.includes(cat) ? '#e3f0ff' : '#fff', color: selectedCategories.includes(cat) ? '#007bff' : '#333', cursor: 'pointer', fontWeight: selectedCategories.includes(cat) ? 600 : 400
              }}
              disabled={nearMe}
            >{cat}</button>
          ))}
          {selectedCategories.length > 0 && (
            <button onClick={handleClearCategories} style={{ marginLeft: 10, color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Снять все</button>
          )}
        </div>
        <div style={{ marginLeft: 24 }}>
          <label>
            <input
              type="checkbox"
              checked={nearMe}
              onChange={e => handleNearMeToggle(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            Поближе ко мне
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={radius}
            onChange={e => setRadius(Number(e.target.value))}
            disabled={!nearMe}
            style={{ marginLeft: 10, verticalAlign: 'middle' }}
          />
          <span style={{ marginLeft: 6, color: nearMe ? '#007bff' : '#888' }}>{radius} км</span>
        </div>
        <div style={{ marginLeft: 24 }}>
          <label>
            <input
              type="checkbox"
              checked={showOnlyFavorites}
              onChange={e => setShowOnlyFavorites(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            Только избранные
          </label>
        </div>
        {(selectedCategories.length > 0 || nearMe) && (
          <button onClick={handleResetFilters} style={{ marginLeft: 18, color: '#333', background: '#f0f0f0', border: '1px solid #bbb', borderRadius: 8, padding: '3px 12px', cursor: 'pointer' }}>Сбросить фильтры</button>
        )}
      </div>
      <div style={{ marginTop: 8 }}>
        {selectedCategories.map(cat => <Chip key={cat} label={cat} onDelete={() => handleCategoryToggle(cat)} />)}
        {nearMe && <Chip label={`Поближе ко мне (${radius} км)`} onDelete={() => handleNearMeToggle(false)} />}
      </div>
    </div>
  );

  return (
    <div style={{ background: '#f7f8fa', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      <div style={{ display: 'flex', height: 'calc(100vh - 70px)', maxWidth: '100vw', margin: 0, padding: 0, position: 'relative' }}>
        {/* --- Фильтры поверх карты с затемнением --- */}
        {filtersOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.18)',
            zIndex: 1001,
          }} onClick={() => setFiltersOpen(false)} />
        )}
        <div style={{ position: 'relative', zIndex: 1020 }}>
          <button
            onClick={() => setFiltersOpen(f => !f)}
            style={{
              position: 'fixed',
              left: 24,
              top: '60%',
              transform: 'translateY(-50%)',
              zIndex: 1022,
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '0 12px 12px 0',
              padding: '14px 20px',
              fontWeight: 700,
              fontSize: 20,
              boxShadow: '0 4px 24px #0003',
              cursor: 'pointer',
              transition: 'left 0.2s',
              outline: '3px solid #fff',
            }}
          >
            {filtersOpen ? '⟨' : 'Фильтры'}
          </button>
          <div style={{
            position: 'fixed',
            left: filtersOpen ? 0 : -340,
            top: 0,
            height: '100vh',
            width: 300,
            background: '#fff',
            boxShadow: '2px 0 16px #0002',
            borderRadius: '0 14px 14px 0',
            padding: filtersOpen ? 20 : 0,
            overflowY: 'auto',
            transition: 'left 0.25s cubic-bezier(.4,2,.6,1)',
            zIndex: 1025
          }}>
            {filtersOpen && renderFilters()}
          </div>
        </div>
        {/* --- Карта с рамкой, уменьшена на 20% --- */}
        <div style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
          <div style={{
            borderRadius: 22,
            boxShadow: '0 4px 32px #0002',
            border: '4px solid #007bff',
            overflow: 'hidden',
            width: '80%',
            height: '80%',
            minWidth: 320,
            minHeight: 320,
            background: '#fff',
            position: 'relative',
            transition: 'width 0.2s, height 0.2s',
          }}>
            <MapContainer
              center={kazanCoordinates}
              zoom={initialZoom}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {/* Отметка пользователя, если включён фильтр "Поближе ко мне" */}
              {nearMe && userLocation && (
                <Marker position={userLocation} icon={userLocationIcon}>
                  <Popup>Вы находитесь здесь!</Popup>
                </Marker>
              )}
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
              {showSearch && searchResults.length > 0 ? (
                searchResults.map(place => {
                  const coords = place.geometry ? parseWktPoint(place.geometry) : null;
                  if (!coords) return null;
                  return (
                    <Marker
                      position={[coords.latitude, coords.longitude]}
                      icon={customMarkerIcon}
                      key={place.id || place.properties.id}
                      eventHandlers={{
                        click: () => setSelectedPlace(place)
                      }}
                    >
                      <Popup>{place.properties?.name || place.name}</Popup>
                    </Marker>
                  );
                })
              ) : (
                filteredPlaces.map(place => {
                  const coords = place.geometry ? parseWktPoint(place.geometry) : null;
                  if (!coords) return null;
                  return (
                    <Marker
                      position={[coords.latitude, coords.longitude]}
                      icon={customMarkerIcon}
                      key={place.id || place.properties.id}
                      eventHandlers={{
                        click: () => setSelectedPlace(place)
                      }}
                    >
                      <Popup>{place.properties?.name || place.name}</Popup>
                    </Marker>
                  );
                })
              )}
            </MapContainer>
          </div>
        </div>
      </div>
      {/* Модалка информации о месте (оставляю как есть) */}
      {selectedPlace && (
        <PlaceInfoModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          userLocation={userLocation}
        />
      )}
      {/* Модалка добавления нового места (оставляю как есть) */}
      {newPlaceCoordinates && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleNewPlaceSubmit} style={{ background: 'white', borderRadius: 18, boxShadow: '0 4px 32px #0002', padding: 32, minWidth: 320, maxWidth: 400, position: 'relative' }}>
            <button type="button" onClick={() => { setIsAddingPlaceMode(false); setNewPlaceCoordinates(null); }} style={{ position: 'absolute', top: 14, right: 18, background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: '#888' }} title="Отмена"><FaTimes /></button>
            <h3 style={{ display: 'flex', alignItems: 'center', fontSize: 22, fontWeight: 700, marginBottom: 18 }}><FaMapMarkedAlt style={{ marginRight: 10, color: '#007bff' }} /> Новое место</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}><FaMapMarkedAlt style={{ marginRight: 6, color: '#007bff' }} /> Название:</label>
              <input type="text" name="name" value={newPlaceData.name} onChange={handleFormChange} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16 }} required />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}><FaAlignLeft style={{ marginRight: 6, color: '#888' }} /> Описание:</label>
              <textarea name="description" value={newPlaceData.description} onChange={handleFormChange} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16 }} rows={3} required />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}><FaTag style={{ marginRight: 6, color: '#888' }} /> Категории (через запятую):</label>
              <input type="text" name="categories" value={newPlaceData.categories} onChange={handleFormChange} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 16 }} required />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}><FaImage style={{ marginRight: 6, color: '#888' }} /> Картинки (до 5):</label>
              <input type="file" name="images" accept="image/*" multiple onChange={handleFormChange} />
              {imagePreviews.length > 0 && (
                <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={src} alt={`preview-${idx}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, boxShadow: '0 2px 8px #0001' }} />
                      <button type="button" onClick={() => handleRemoveImage(idx)} style={{ position: 'absolute', top: -8, right: -8, background: '#fff', border: '1px solid #888', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: '#d32f2f', fontWeight: 700, fontSize: 16, lineHeight: '18px', padding: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" style={{ width: '100%', padding: 12, background: '#28a745', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><FaPlus /> Сохранить</button>
            {formMessage && <div style={{ color: formMessage.startsWith('Ошибка') ? 'red' : 'orange', marginTop: 8 }}>{formMessage}</div>}
          </form>
        </div>
      )}
      {/* Уведомление о модерации */}
      {showModerationAlert && (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: '#ff9800', color: 'white', padding: '12px 24px', borderRadius: 8, zIndex: 9999, fontSize: 18 }}>
          Место отправлено на модерацию!
          <button onClick={handleModerationAlertClose} style={{ marginLeft: 18, background: 'none', border: 'none', color: 'white', fontWeight: 700, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
      )}
    </div>
  );
}

export default HomePage;