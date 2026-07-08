import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './TrafficMap.css';

// Fix for marker icons in Leaflet with React
// This is necessary because the default marker icon paths are not properly resolved in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different signal states
const normalIcon = new Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const alteredIcon = new Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const offlineIcon = new Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to fly to a specific position when selected
function FlyToSignal({ position }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15);
    }
  }, [map, position]);
  
  return null;
}

const TrafficMap = ({ signals = [], routes = [], occasions = [], selectedSignalId, onSignalSelect }) => {
  // Default center position (can be overridden when a signal is selected)
  const [center, setCenter] = useState([13.0827, 80.2707]); // Chennai, India as default
  
  // Find the selected signal
  const selectedSignal = signals.find(signal => signal?.signalId === selectedSignalId);

  const activeOccasionSignalIds = occasions
    .filter(occasion => occasion?.isActive)
    .flatMap(occasion => occasion?.affectedSignalIds || []);

  const selectedRouteIds = new Set(
    routes
      .filter(route => route?.signalIds?.includes(selectedSignalId))
      .map(route => route.routeId)
  );

  const affectedRouteIds = new Set(
    routes
      .filter(route => (route?.signalIds || []).some(signalId => activeOccasionSignalIds.includes(signalId)))
      .map(route => route.routeId)
  );
  
  // Get the marker icon based on signal status
  const getMarkerIcon = (status) => {
    switch (status) {
      case 'altered':
        return alteredIcon;
      case 'offline':
      case 'maintenance':
        return offlineIcon;
      default:
        return normalIcon;
    }
  };
  
  // Format the last updated time
  const formatLastUpdated = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Get status class for styling
  const getStatusClass = (status) => {
    switch (status) {
      case 'normal':
        return 'status-success';
      case 'altered':
        return 'status-warning';
      default:
        return 'status-error';
    }
  };
  
  // Calculate center position when selected signal changes
  useEffect(() => {
    if (selectedSignal?.location?.coordinates?.length >= 2) {
      setCenter([
        selectedSignal.location.coordinates[1],
        selectedSignal.location.coordinates[0]
      ]);
    }
  }, [selectedSignal]);

  return (
    <div className="map-container">
      <MapContainer 
        className="traffic-map"
        center={center} 
        zoom={13} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routes.map(route => {
          const isAffected = affectedRouteIds.has(route.routeId);
          const isSelected = selectedRouteIds.has(route.routeId);
          const routeColor = isAffected ? '#d32f2f' : route.color || '#1976d2';
          const routeWeight = isSelected || isAffected ? 6 : 4;

          return (
            <Polyline
              key={route.routeId}
              positions={(route.pathCoordinates || []).map(point => [point[0], point[1]])}
              pathOptions={{ color: routeColor, weight: routeWeight, opacity: isAffected ? 0.95 : 0.75, dashArray: isAffected ? '8 8' : undefined }}
            />
          );
        })}
        
        {signals
          .filter(signal => signal?.location?.coordinates?.length >= 2)
          .map(signal => (
          <Marker 
            key={signal.signalId}
            position={[signal.location.coordinates[1], signal.location.coordinates[0]]}
            icon={getMarkerIcon(signal.status)}
            eventHandlers={{
              click: () => {
                if (onSignalSelect) {
                  onSignalSelect(signal.signalId);
                }
              },
            }}
          >
            <Popup>
              <div className="signal-popup">
                <h3 className="popup-title">{signal.intersectionName}</h3>
                <p className="popup-id">ID: {signal.signalId}</p>
                
                <span className={`status-badge ${getStatusClass(signal.status)}`}>
                  {signal.status.toUpperCase()}
                </span>
                
                <p className="popup-info">Current Cycle: {signal.currentTiming.cycleLength}s</p>
                
                <p className="popup-timestamp">Last updated: {formatLastUpdated(signal.lastUpdated)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* When a signal is selected, fly to its position */}
        {selectedSignal?.location?.coordinates?.length >= 2 && (
          <FlyToSignal 
            position={[
              selectedSignal.location.coordinates[1],
              selectedSignal.location.coordinates[0]
            ]} 
          />
        )}
      </MapContainer>
      
      {/* Map Legend */}
      <div className="map-legend">
        <h4 className="legend-title">Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-dot legend-normal"></span>
            <span>Normal</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-altered"></span>
            <span>Altered</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-offline"></span>
            <span>Offline/Maintenance</span>
          </div>
          <div className="legend-item">
            <span className="legend-line legend-route-normal"></span>
            <span>Route</span>
          </div>
          <div className="legend-item">
            <span className="legend-line legend-route-affected"></span>
            <span>Affected route</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficMap; 