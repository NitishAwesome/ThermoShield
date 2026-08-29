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
            Regional Thermal Risk Map
          </h3>
          {isLoadingMap && (
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin ml-2" />
          )}
        </div>
        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>LOW</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>MODERATE</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>HIGH</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-red-400 font-bold">EXTREME</span>
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
              <div className="p-1 min-w-[210px]">
                <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-2">
                  <span className="font-bold text-slate-100 text-sm">{locationName}</span>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white"
                    style={{ backgroundColor: currentRiskColor }}
                  >
                    {riskLevel}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300">
                  {riskScore !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Risk Severity Score:</span>
                      <span className="font-bold text-slate-100">{riskScore.toFixed(2)} / 1.00</span>
                    </div>
                  )}
                  {temperature !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Air Temperature:</span>
                      <span className="font-bold text-slate-100">{temperature.toFixed(1)}°C</span>
                    </div>
                  )}
                  {humidity !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Relative Humidity:</span>
                      <span className="font-bold text-slate-100">{Math.round(humidity)}%</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-slate-700 text-[11px] text-cyan-300">
                    <strong>Action: </strong>
                    {riskLevel === 'EXTREME' || riskLevel === 'HIGH'
                      ? 'Drink water regularly and limit direct outdoor physical labor.'
                      : 'Maintain routine hydration during daytime activities.'}
                  </div>
                  {wbgt !== undefined && (
                    <div className="pt-1 text-[10px] text-slate-400">
                      Estimated WBGT: {wbgt.toFixed(1)}°C
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Additional Map Regional Locations */}
          {mapLocations.map((loc, idx) => {
            const locColor = getRiskColor(loc.risk_level);
            return (
              <React.Fragment key={idx}>
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
                <Marker position={[loc.latitude, loc.longitude]}>
                  <Popup className="custom-popup">
                    <div className="p-1 min-w-[190px]">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
                        <span className="font-bold text-slate-100 text-xs">
                          {loc.latitude.toFixed(3)}°N, {loc.longitude.toFixed(3)}°E
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase text-white"
                          style={{ backgroundColor: locColor }}
                        >
                          {loc.risk_level}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Risk Score:</span>
                          <span className="font-mono font-bold text-slate-100">
                            {loc.risk_score.toFixed(1)} / 100
                          </span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
        <span>Click anywhere on the map to inspect location coordinates</span>
        <span className="hidden sm:inline">Map Data © OpenStreetMap</span>
      </div>
    </div>
  );
};
