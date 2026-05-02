import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Custom Icons ───────────────────────────────────────────
const storeIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width:44px;height:44px;border-radius:14px;
    background:linear-gradient(135deg,#F59E0B,#D97706);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 4px 14px rgba(245,158,11,0.4);
    border:3px solid white;font-size:20px;
  ">🏪</div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  popupAnchor: [0, -46],
});

const customerIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width:44px;height:44px;border-radius:14px;
    background:linear-gradient(135deg,#3B82F6,#2563EB);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 4px 14px rgba(59,130,246,0.4);
    border:3px solid white;font-size:20px;
  ">📍</div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  popupAnchor: [0, -46],
});

const driverIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    width:48px;height:48px;border-radius:50%;
    background:linear-gradient(135deg,#10B981,#059669);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 4px 18px rgba(16,185,129,0.5);
    border:3px solid white;font-size:22px;
    animation: driverPulse 2s infinite;
  ">🛵</div>
  <style>
    @keyframes driverPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
  </style>`,
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  popupAnchor: [0, -50],
});

// ─── Auto-fit bounds helper ─────────────────────────────────
const FitBounds: React.FC<{ bounds: L.LatLngBoundsExpression }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [map, bounds]);
  return null;
};

// ─── Main Component ─────────────────────────────────────────
interface OrderTrackingMapProps {
  storeCoords: { lat: number; lng: number };
  customerCoords: { lat: number; lng: number };
  driverCoords?: { lat: number; lng: number } | null;
  showDriver?: boolean;
  isActive?: boolean;
  height?: string;
}

const OrderTrackingMap: React.FC<OrderTrackingMapProps> = ({
  storeCoords,
  customerCoords,
  driverCoords,
  showDriver = true,
  isActive = true,
  height = '400px',
}) => {
  const showDriverMarker = showDriver && isActive && driverCoords;

  const bounds = useMemo(() => {
    const points: L.LatLngExpression[] = [
      [storeCoords.lat, storeCoords.lng],
      [customerCoords.lat, customerCoords.lng],
    ];
    if (showDriverMarker) {
      points.push([driverCoords.lat, driverCoords.lng]);
    }
    return L.latLngBounds(points as [number, number][]);
  }, [storeCoords, customerCoords, driverCoords, showDriverMarker]);

  // Route line from store to customer
  const routeLine: [number, number][] = [
    [storeCoords.lat, storeCoords.lng],
    [customerCoords.lat, customerCoords.lng],
  ];

  // Driver to customer dashed line
  const driverLine: [number, number][] | null =
    showDriverMarker
      ? [
          [driverCoords.lat, driverCoords.lng],
          [customerCoords.lat, customerCoords.lng],
        ]
      : null;

  return (
    <div style={{ height, width: '100%', borderRadius: '24px', overflow: 'hidden' }} className="border border-gray-200 dark:border-gray-800 shadow-lg">
      <MapContainer
        center={[storeCoords.lat, storeCoords.lng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds bounds={bounds} />

        {/* Route: Store → Customer */}
        <Polyline
          positions={routeLine}
          pathOptions={{
            color: '#F59E0B',
            weight: 4,
            opacity: 0.7,
            dashArray: '12, 8',
          }}
        />

        {/* Driver → Customer dashed line */}
        {driverLine && (
          <Polyline
            positions={driverLine}
            pathOptions={{
              color: '#10B981',
              weight: 3,
              opacity: 0.6,
              dashArray: '6, 10',
            }}
          />
        )}

        {/* Store Marker */}
        <Marker position={[storeCoords.lat, storeCoords.lng]} icon={storeIcon}>
          <Popup>
            <div style={{ textAlign: 'center', fontWeight: 'bold', direction: 'rtl' }}>
              🏪 موقع المحل
            </div>
          </Popup>
        </Marker>

        {/* Customer Marker */}
        <Marker position={[customerCoords.lat, customerCoords.lng]} icon={customerIcon}>
          <Popup>
            <div style={{ textAlign: 'center', fontWeight: 'bold', direction: 'rtl' }}>
              📍 موقع الزبون
            </div>
          </Popup>
        </Marker>

        {/* Driver Marker (live) */}
        {showDriverMarker && (
          <Marker position={[driverCoords.lat, driverCoords.lng]} icon={driverIcon}>
            <Popup>
              <div style={{ textAlign: 'center', fontWeight: 'bold', direction: 'rtl' }}>
                🛵 موقع السائق الحالي
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default OrderTrackingMap;
