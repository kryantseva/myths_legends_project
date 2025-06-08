import React, { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import axios from 'axios';
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png'; // <-- Corrected line
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css'; // Ensure Leaflet CSS is imported

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
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const parseWktPoint = (wktString) => {
  if (!wktString || typeof wktString !== 'string') {
    return null;
  }
  const match = wktString.match(/POINT \(([^ ]+) ([^ ]+)\)/);
  if (match && match.length === 3) {
    const longitude = parseFloat(match[1]);
    const latitude = parseFloat(match[2]);
    if (!isNaN(longitude) && !isNaN(latitude)) {
      return { longitude, latitude };
    }
  }
  return null;
};

function LocationMarker({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
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
      if (isAddingPlaceMode) {
        onMapClickForAdd(e.latlng);
      }
    },
    mousemove(e) {
      if (isAddingPlaceMode) {
        e.originalEvent.target.style.cursor = 'crosshair';
      } else {
        e.originalEvent.target.style.cursor = '';
      }
    }
  });
  return null;
}

function MapButtons({ onLocateMe, onAddPlaceModeToggle, isAddingPlaceMode, isAuthenticated }) { // Добавляем isAuthenticated
  const map = useMapEvents({});

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <button
        onClick={() => onLocateMe(map)}
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#007bff',
          color: 'white',
          fontSize: '24px',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}
        title="Моя геолокация"
      >
        📍
      </button>
      {isAuthenticated && ( // Условный рендеринг кнопки добавления места
        <button
          onClick={onAddPlaceModeToggle}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: isAddingPlaceMode ? '#ffc107' : '#28a745',
            color: 'white',
            fontSize: '24px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}
          title={isAddingPlaceMode ? "Отменить добавление" : "Добавить новое место"}
        >
          {isAddingPlaceMode ? '✖' : '+'}
        </button>
      )}
    </div>
  );
}

function HomePage() {
  console.log("HomePage is rendering!");

  const [places, setPlaces] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Новое состояние для авторизации

  // Состояния для добавления места
  const [isAddingPlaceMode, setIsAddingPlaceMode] = useState(false);
  const [newPlaceCoordinates, setNewPlaceCoordinates] = useState(null);
  const [newPlaceData, setNewPlaceData] = useState({
    name: '',
    description: '',
    categories: '',
    image: null,
  });
  const [formMessage, setFormMessage] = useState('');

  const kazanCoordinates = [55.7961, 49.1064];
  const initialZoom = 15;
  const radiusKm = 2;

  // Проверка авторизации при загрузке компонента
  useEffect(() => {
    const token = localStorage.getItem('authToken'); // Или как вы храните токен
    setIsAuthenticated(!!token); // Устанавливаем true, если токен есть, иначе false
  }, []);

  const fetchPlaces = useCallback(async (latitude = null, longitude = null) => {
    let url = `${process.env.REACT_APP_API_BASE_URL}/api/places/`;
    if (latitude !== null && longitude !== null) {
      url = `${process.env.REACT_APP_API_BASE_URL}/api/places/nearest/?lat=${latitude}&lon=${longitude}&radius_km=${radiusKm}`;
    }

    try {
      const response = await axios.get(url);
      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
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
          fetchPlaces(latitude, longitude);
        },
        (error) => {
          console.error("Error getting user location:", error);
          alert("Не удалось определить вашу геолокацию. Возможно, вы запретили доступ или функция недоступна.");
          fetchPlaces();
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      alert("Ваш браузер не поддерживает геолокацию.");
      fetchPlaces();
    }
  }, [fetchPlaces]);

  const handleAddPlaceModeToggle = useCallback(() => {
    if (!isAuthenticated) { // Защита от неавторизованных пользователей
      alert("Для добавления места необходимо авторизоваться.");
      return;
    }
    setIsAddingPlaceMode(prevMode => !prevMode);
    setNewPlaceCoordinates(null);
    setFormMessage('');
  }, [isAuthenticated]); // Добавляем isAuthenticated в зависимости

  const handleMapClickForNewPlace = useCallback((latlng) => {
    if (!isAuthenticated) { // Защита от неавторизованных пользователей
      alert("Для добавления места необходимо авторизоваться.");
      return;
    }
    setNewPlaceCoordinates(latlng);
    setIsAddingPlaceMode(false);
    setFormMessage('Координаты выбраны. Заполните информацию о месте.');
  }, [isAuthenticated]); // Добавляем isAuthenticated в зависимости

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

    if (!isAuthenticated) {
      setFormMessage('Ошибка: Для добавления места необходимо авторизоваться.');
      return;
    }

    if (!newPlaceCoordinates) {
      setFormMessage('Ошибка: Сначала выберите координаты на карте.');
      return;
    }

    // Имитация ошибки 400
    try {
      throw new Error("Имитация ошибки 400: Неверный запрос или отсутствующие данные.");
    } catch (error) {
      console.error('Error adding new place:', error.message);
      setFormMessage('Ошибка при добавлении места: ' + error.message);
    }
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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

        {newPlaceCoordinates && isAuthenticated && ( // Маркер только для авторизованных
          <Marker position={newPlaceCoordinates} icon={customMarkerIcon}>
            <Popup>Координаты нового места</Popup>
          </Marker>
        )}

        {places.map(place => {
          const coords = parseWktPoint(place.geometry);
          if (!coords) {
            console.warn("Пропускаем место из-за отсутствующих или некорректных координат (WKT):", place);
            return null;
          }
          const distanceInfo = place.properties.distance !== null && place.properties.distance !== undefined
            ? `<br/>Расстояние: ${place.properties.distance.toFixed()} метров`
            : '';
          return (
            <Marker
              position={[coords.latitude, coords.longitude]}
              icon={customMarkerIcon}
              key={place.id || place.properties.id}
            >
              <Popup>
                <b>{place.properties.name}</b><br />
                {place.properties.description}
                {distanceInfo}
                {place.properties.image && (
                  <img
                    src={place.properties.image}
                    alt={place.properties.name}
                    style={{ maxWidth: '100px', maxHeight: '100px', marginTop: '5px' }}
                  />
                )}
                <p>Категории: {place.properties.categories}</p>
                <p>Рейтинг: {place.properties.avg_rating ? place.properties.avg_rating.toFixed(1) : 'Нет'}</p>
                <p>Заметок: {place.properties.notes_count}</p>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {newPlaceCoordinates && isAuthenticated && ( // Форма только для авторизованных
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
    </div>
  );
}

export default HomePage;