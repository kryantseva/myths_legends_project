import React, { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import axios from 'axios';
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
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

function MapEventsHandler({ onLocateMe }) {
  const map = useMapEvents({});
  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      right: '20px',
      zIndex: 1000
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
    </div>
  );
}

function HomePage() {
  console.log("HomePage is rendering!");

  const [places, setPlaces] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  const kazanCoordinates = [55.7961, 49.1064];
  const initialZoom = 15;
  const radiusKm = 2;

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

  return (
    <div className="main">
      <MapContainer
        center={kazanCoordinates}
        zoom={initialZoom}
        scrollWheelZoom={true}
        style={{ height: 'calc(100vh - 80px)', width: '100%' }} // Removed backgroundColor for debugging
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={userLocation} />
        <MapEventsHandler onLocateMe={handleLocateMe} />
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
    </div>
  );
}

export default HomePage;