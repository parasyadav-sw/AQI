import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Mapped color markers depending on the CPCB AQI range
const getMarkerIcon = (aqi: number) => {
  let color = 'green';
  if (aqi > 400) color = 'black'; // severe/emergency
  else if (aqi > 300) color = 'violet'; // very poor
  else if (aqi > 200) color = 'red'; // poor
  else if (aqi > 100) color = 'orange'; // moderate
  else if (aqi > 50) color = 'yellow'; // satisfactory
  
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

interface SensorPoint {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  aqi: number;
  category: string;
  pm25?: number;
  pm10?: number;
  no2?: number;
  so2?: number;
}

interface MapViewProps {
  latitude: number;
  longitude: number;
  sensors: SensorPoint[];
}

// Helper component to handle center changes dynamically
const ChangeView: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 12);
  }, [center, map]);
  return null;
};

export const MapView: React.FC<MapViewProps> = ({ latitude, longitude, sensors }) => {
  const mapCenter: [number, number] = [latitude, longitude];

  return (
    <div className="w-full h-full relative min-h-[380px] rounded-xl overflow-hidden border border-slate-800 p-1">
      <MapContainer
        center={mapCenter}
        zoom={12}
        style={{ width: '100%', height: '100%', minHeight: '380px' }}
      >
        <ChangeView center={mapCenter} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {sensors.map((sensor, idx) => (
          <Marker 
            key={idx} 
            position={[sensor.latitude, sensor.longitude]}
            icon={getMarkerIcon(sensor.aqi)}
          >
            <Popup>
              <div className="text-xs p-1 flex flex-col gap-1.5 min-w-[180px]">
                <h4 className="font-bold text-slate-100 border-b border-slate-800 pb-1 truncate">{sensor.name}</h4>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-slate-400 font-medium">Current AQI:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                    sensor.aqi > 200 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>{sensor.aqi}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Category:</span>
                  <span className="font-semibold text-slate-200">{sensor.category}</span>
                </div>
                {sensor.pm25 !== undefined && (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 border-t border-slate-800/60 pt-2 text-[10px]">
                    <div className="flex justify-between"><span className="text-slate-400">PM2.5:</span> <span className="font-semibold text-slate-300">{sensor.pm25}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">PM10:</span> <span className="font-semibold text-slate-300">{sensor.pm10}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">NO2:</span> <span className="font-semibold text-slate-300">{sensor.no2 || 0}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">SO2:</span> <span className="font-semibold text-slate-300">{sensor.so2 || 0}</span></div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 bg-slate-950/80 border border-slate-850 px-3.5 py-2.5 rounded-xl backdrop-blur-md flex flex-wrap gap-x-3 gap-y-1 z-[1000] text-[10px] max-w-[280px]">
        <span className="font-bold uppercase text-slate-500 w-full mb-1">CPCB AQI Colors</span>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span><span>Good</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span><span>Satisfactory</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span><span>Moderate</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span><span>Poor</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span><span>V. Poor</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-black inline-block border border-slate-600"></span><span>Severe</span></div>
      </div>
    </div>
  );
};
