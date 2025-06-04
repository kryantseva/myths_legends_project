import "./App.css";
import "leaflet/dist/leaflet.css";
import { Icon } from "leaflet";
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
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

function LocationMarker() {
  const [position, setPosition] = useState(null);
  const map = useMap();

  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    }).on("locationerror", function (e) {
      console.error("Location access denied or error:", e.message);
      alert("Не удалось определить вашу геолокацию. Возможно, вы не дали разрешение или функция недоступна.");
    });
  }, [map]);

  return position === null ? null : (
    <Marker position={position} icon={userLocationIcon}>
      <Popup>Вы находитесь здесь!</Popup>
    </Marker>
  );
}

// --- НОВАЯ ФУНКЦИЯ: Парсинг строки WKT для извлечения координат ---
const parseWktPoint = (wktString) => {
  if (!wktString || typeof wktString !== 'string') {
    return null;
  }
  // Регулярное выражение для извлечения чисел из "POINT (X Y)"
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
// --- Конец НОВОЙ ФУНКЦИИ ---

function App() {
  const [places, setPlaces] = useState([]);

  const kazanCoordinates = [55.7961, 49.1064];
  const initialZoom = 15;

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/places/`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Обработка ответа GeoJSON FeatureCollection
        if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
            setPlaces(data.features);
        } else {
            console.error("API response is not a valid GeoJSON FeatureCollection:", data);
            setPlaces([]);
        }
      })
      .catch(error => {
        console.error("Error fetching places:", error);
        setPlaces([]);
      });
  }, []);

  return (
    <div className="main">
      <MapContainer
        center={kazanCoordinates}
        zoom={initialZoom}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <LocationMarker />

        {places.map(place => {
          // --- ИЗМЕНЕНИЕ: Используем новую функцию для парсинга WKT ---
          const coords = parseWktPoint(place.geometry);

          if (!coords) {
            console.warn("Пропускаем место из-за отсутствующих или некорректных координат (WKT):", place);
            return null; // Пропускаем рендеринг маркера для этого места
          }

          return (
            <Marker
              // Leaflet/React-Leaflet ожидает: [широта, долгота]
              position={[coords.latitude, coords.longitude]}
              icon={customMarkerIcon}
              key={place.id || place.properties.id} // Используем place.id или place.properties.id для ключа
            >
              <Popup>
                {/* Доступ к свойствам места через place.properties */}
                <b>{place.properties.name}</b><br />
                {place.properties.description}<br />
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

export default App;
