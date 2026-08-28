import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import { Navigation, AlertCircle, Loader2 } from 'lucide-react';
import L from 'leaflet';
import { RiskLevel, MapLocationRisk } from '../types';
import { getRiskColor } from '../utils/risk';

// Fix leaflet default marker icon in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface RiskMapProps {
  center: [number, number];
  zoom?: number;
  locationName?: string;
  temperature?: number;
  humidity?: number;
  wbgt?: number;
  riskLevel?: RiskLevel;
  riskScore?: number;
  mapLocations?: MapLocationRisk[];
  isLoadingMap?: boolean;
  mapError?: string | null;
  onMapClick?: (lat: number, lon: number) => void;
}

// Helper to recenter map when center prop changes
const MapRecenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { duration: 1.2 });
  }, [center, map]);
  return null;
};

// Map click listener component
const MapClickHandler: React.FC<{ onMapClick?: (lat: number, lon: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

export const RiskMap: React.FC<RiskMapProps> = ({
  center,
  zoom = 6,
  locationName = 'Selected Coordinate',
  temperature,
  humidity,
  wbgt,
  riskLevel = 'LOW',
  riskScore,
  mapLocations = [],
  isLoadingMap = false,
  mapError = null,
  onMapClick,
}) => {
  const currentRiskColor = getRiskColor(riskLevel);

  return (
    <div className="rounded-2xl bg-slate-800/90 border border-slate-700/80 p-4 shadow-xl backdrop-blur-md relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-3 border-b border-slate-700/60 gap-2">
        <div className="flex items-center space-x-2">
          <Navigation className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-slate-100 font-sans">
            Interactive Thermal Risk GIS Map
          </h3>
          {isLoadingMap && (
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin ml-2" />
          )}
        </div>
        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Low</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Mod</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>High</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-red-400 font-bold">Extreme</span>
          </span>
        </div>
      </div>

      {/* Map Error Banner if /map/risk fails */}
      {mapError && (
        <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>Map risk layer unavailable: {mapError}. Displaying base geographic view.</span>
        </div>
      )}

      {/* Map Canvas */}
      <div className="relative h-[340px] sm:h-[420px] w-full rounded-xl overflow-hidden border border-slate-700 shadow-inner">
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <MapRecenter center={center} />
          <MapClickHandler onMapClick={onMapClick} />

          {/* CartoDB Voyager tile layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Primary selected location heat risk radius circle */}
          <Circle
            center={center}
            radius={25000}
            pathOptions={{
              color: currentRiskColor,
              fillColor: currentRiskColor,
              fillOpacity: 0.35,
              weight: 2,
            }}
          />

          {/* Selected Location Marker */}
          <Marker position={center}>
            <Popup className="custom-popup">
              <div className="p-1 min-w-[200px]">
                <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-2">
                  <span className="font-bold text-slate-100 text-sm">{locationName}</span>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white"
                    style={{ backgroundColor: currentRiskColor }}
                  >
                    {riskLevel}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-300">
                  {temperature !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Temperature:</span>
                      <span className="font-bold text-slate-100">{temperature.toFixed(1)}°C</span>
                    </div>
                  )}
                  {humidity !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Humidity:</span>
                      <span className="font-bold text-slate-100">{Math.round(humidity)}%</span>
                    </div>
                  )}
                  {wbgt !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Estimated WBGT:</span>
                      <span className="font-bold text-cyan-400">{wbgt.toFixed(1)}°C</span>
                    </div>
                  )}
                  {riskScore !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Thermal Score:</span>
                      <span className="font-bold text-slate-100">{riskScore.toFixed(2)} / 1.00</span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Real Backend /map/risk Location Hotspots */}
          {mapLocations.map((loc, idx) => {
            const locColor = getRiskColor(loc.risk_level);
            return (
              <React.Fragment key={`${loc.latitude}-${loc.longitude}-${idx}`}>
                <Circle
                  center={[loc.latitude, loc.longitude]}
                  radius={20000}
                  pathOptions={{
                    color: locColor,
                    fillColor: locColor,
                    fillOpacity: 0.25,
                    weight: 1.5,
                  }}
                />
                <Marker
                  position={[loc.latitude, loc.longitude]}
                  eventHandlers={{
                    click: () => {
                      if (onMapClick) onMapClick(loc.latitude, loc.longitude);
                    },
                  }}
                >
                  <Popup>
                    <div className="p-1 min-w-[180px]">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
                        <span className="font-bold text-xs text-slate-200">
                          {loc.latitude.toFixed(3)}°N, {loc.longitude.toFixed(3)}°E
                        </span>
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-bold text-white uppercase"
                          style={{ backgroundColor: locColor }}
                        >
                          {loc.risk_level}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        ML Health Risk Score: <span className="font-bold text-slate-100">{loc.risk_score.toFixed(1)} / 100</span>
                      </p>
                      <p className="text-[10px] text-cyan-400 mt-1 cursor-pointer">
                        Click to focus location
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>

      <div className="mt-2 text-right">
        <span className="text-[11px] text-slate-400">
          💡 Click anywhere on the map to query live weather and thermal stress for that coordinate.
        </span>
      </div>
    </div>
  );
};
