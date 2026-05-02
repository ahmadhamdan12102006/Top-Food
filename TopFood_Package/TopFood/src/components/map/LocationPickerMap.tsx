import React, { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pinIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width:48px;height:48px;border-radius:50%;
    background:linear-gradient(135deg,#F59E0B,#D97706);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 6px 20px rgba(245,158,11,0.5);
    border:3px solid white;font-size:24px;
    cursor:pointer;
  ">📌</div>`,
  iconSize: [48, 48],
  iconAnchor: [24, 48],
});

interface LocationPickerMapProps {
  initialCoords?: { lat: number; lng: number } | null;
  onLocationSelect: (coords: { lat: number; lng: number }) => void;
  height?: string;
}

const ClickHandler: React.FC<{ onClick: (lat: number, lng: number) => void }> = ({ onClick }) => {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  initialCoords,
  onLocationSelect,
  height = '350px',
}) => {
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
    initialCoords || null
  );

  const handleClick = useCallback((lat: number, lng: number) => {
    const coords = { lat, lng };
    setSelectedCoords(coords);
    onLocationSelect(coords);
  }, [onLocationSelect]);

  const center: [number, number] = selectedCoords
    ? [selectedCoords.lat, selectedCoords.lng]
    : [31.5, 34.47]; // Default: Gaza area

  return (
    <div style={{ height, width: '100%', borderRadius: '20px', overflow: 'hidden' }} className="border border-gray-200 dark:border-gray-700 shadow-md">
      <MapContainer
        center={center}
        zoom={selectedCoords ? 16 : 12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onClick={handleClick} />

        {selectedCoords && (
          <Marker position={[selectedCoords.lat, selectedCoords.lng]} icon={pinIcon} />
        )}
      </MapContainer>
    </div>
  );
};

export default LocationPickerMap;
