import React, { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import axios from 'axios'; // Используем axios для запросов
import L from 'leaflet'; // Импорт Leaflet для L.latLng
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetinaUrl,
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
});

// Кастомные иконки маркеров
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

// Вспомогательная функция для парсинга строки WKT (Well-Known Text) в координаты
const parseWktPoint = (wktString) => {
  if (!wktString || typeof wktString !== 'string') {
    return null;
  }
  // Регулярное выражение для извлечения чисел из строки "POINT (X Y)"
  const match = wktString.match(/POINT \(([^ ]+) ([^ ]+)\)/);
  if (match && match.length === 3) {
    const longitude = parseFloat(match[1]); // X - это долгота
    const latitude = parseFloat(match[2]);  // Y - это широта
    if (!isNaN(longitude) && !isNaN(latitude)) {
      return { longitude, latitude };
    }
  }
  return null;
};

// Компонент для отображения маркера геолокации пользователя
function LocationMarker({ position }) {
  const map = useMap(); // Получаем доступ к экземпляру карты

  // При изменении позиции, если она задана, центрируем карту
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position} icon={userLocationIcon}>
      <Popup>Вы находитесь здесь!</Popup> {/* Изменено сообщение */}
    </Marker>
  );
}

// Вспомогательный компонент для размещения кнопки "Моя геолокация"
function MapEventsHandler({ onLocateMe }) {
  const map = useMapEvents({}); // Просто получаем доступ к карте

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      right: '20px',
      zIndex: 1000 // Убедимся, что кнопка поверх карты
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
        📍 {/* Или иконка компаса/прицела */}
      </button>
    </div>
  );
}


// Основной компонент HomePage
function HomePage() {
  console.log("HomePage is rendering!"); // Для отладки

  const [places, setPlaces] = useState([]); // Состояние для хранения списка мест
  const [userLocation, setUserLocation] = useState(null); // Состояние для хранения координат пользователя

  const kazanCoordinates = [55.7961, 49.1064]; // Примерные координаты центра Казани (используются по умолчанию)
  const initialZoom = 15;
  const radiusKm = 1; // Радиус поиска ближайших мест в км

  // ФИКСИРОВАННЫЕ КООРДИНАТЫ ДЛЯ ТЕСТИРОВАНИЯ - УДАЛЕНЫ
  // const fixedTestLatitude = 55.7961;
  // const fixedTestLongitude = 49.1064;


  // Функция для получения мест из API
  const fetchPlaces = useCallback(async (latitude = null, longitude = null) => {
    let url = `${process.env.REACT_APP_API_BASE_URL}/api/places/`;
    if (latitude !== null && longitude !== null) {
      url = `${process.env.REACT_APP_API_BASE_URL}/api/places/nearest/?lat=${latitude}&lon=${longitude}&radius_km=${radiusKm}`;
    }

    try {
      const response = await axios.get(url); // Используем axios
      if (response.status !== 200) { // Проверка статуса ответа
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = response.data; // Axios уже парсит JSON

      // Обработка ответа GeoJSON FeatureCollection
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
  }, [radiusKm]); // Добавили radiusKm в зависимости useCallback

  // Начальная загрузка ВСЕХ мест при монтировании компонента
  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  // Обработчик для кнопки "Моя геолокация"
  const handleLocateMe = useCallback((mapInstance) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const currentLatLng = L.latLng(latitude, longitude);
          setUserLocation(currentLatLng); // Устанавливаем реальную позицию для маркера геолокации
          mapInstance.flyTo(currentLatLng, mapInstance.getZoom()); // Центрируем карту на реальных координатах
          fetchPlaces(latitude, longitude); // Запрашиваем ближайшие места по реальным координатам
        },
        (error) => {
          console.error("Error getting user location:", error);
          alert("Не удалось определить вашу геолокацию. Возможно, вы запретили доступ или функция недоступна.");
          // Если геолокация не удалась, загружаем все места (по умолчанию)
          fetchPlaces();
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 } // Опции для геолокации
      );
    } else {
      alert("Ваш браузер не поддерживает геолокацию.");
      fetchPlaces(); // Загружаем все места
    }
  }, [fetchPlaces]);


  return (
    // Оставляем div с className="main" и стилем calc(100vh - 80px) по вашему запросу.
    // Однако, напоминаю, что это может быть причиной того, что карта не отображается.
    <div className="main">
      <MapContainer
        center={kazanCoordinates}
        zoom={initialZoom}
        scrollWheelZoom={true}
        style={{ height: 'calc(100vh - 80px)', width: '100%', backgroundColor: 'lightcoral' }} // Временный фон оставлен для отладки
      >
        {/* Слой с картой OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Передаем текущую позицию пользователя в LocationMarker */}
        <LocationMarker position={userLocation} />

        {/* Кнопка "Моя геолокация" */}
        <MapEventsHandler onLocateMe={handleLocateMe} />

        {/* Отображаем маркеры для каждого места, полученного из API */}
        {places.map(place => {
          const coords = parseWktPoint(place.geometry);

          if (!coords) {
            console.warn("Пропускаем место из-за отсутствующих или некорректных координат (WKT):", place);
            return null;
          }

          // Если у места есть 'distance', отображаем его в Popup
          const distanceInfo = place.properties.distance !== null && place.properties.distance !== undefined
            ? `<br/>Расстояние: ${place.properties.distance.toFixed()} метров`
            : '';

          return (
            <Marker
              position={[coords.latitude, coords.longitude]}
              icon={customMarkerIcon}
              key={place.id || place.properties.id} // Используем place.id или place.properties.id для ключа
            >
              <Popup>
                {/* Доступ к свойствам места через place.properties */}
                <b>{place.properties.name}</b><br />
                {place.properties.description}
                {distanceInfo} {/* Добавляем информацию о расстоянии */}
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
    </div>
  );
}

export default HomePage;
