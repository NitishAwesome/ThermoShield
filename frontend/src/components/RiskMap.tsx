import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import { Navigation, AlertCircle, Loader2, Info } from 'lucide-react';
import L from 'leaflet';
import { RiskLevel, MapLocationRisk } from '../types';
import { getRiskColor } from '../utils/risk';
import { Card, CardHeader, CardContent, Badge } from './ui';

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
  className?: string;
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
  className = '',
}) => {
  const currentRiskColor = getRiskColor(riskLevel);

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader
        title="Geospatial Heat Strain Layer"
        subtitle="Interactive spatial distribution of biometeorological thermal strain across municipal coordinates."
        badge={
          <Badge variant="brand" size="sm">
            Live GIS
          </Badge>
        }
        action={
          <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="ts-text-muted text-[11px] font-semibold hidden xs:inline">LOW</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="ts-text-muted text-[11px] font-semibold hidden xs:inline">MODERATE</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="ts-text-muted text-[11px] font-semibold hidden xs:inline">HIGH</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-[11px] font-bold">EXTREME</span>
            </span>
          </div>
        }
      />
      <CardContent className="space-y-3">
        {/* Map Error Banner if /map/risk fails */}
        {mapError && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>Map risk layer notice: {mapError}. Displaying base geographic view.</span>
          </div>
        )}

        {/* Map Canvas */}
        <div className="relative h-[340px] sm:h-[420px] w-full rounded-xl overflow-hidden border ts-border shadow-inner">
          <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <MapRecenter center={center} />
            <MapClickHandler onMapClick={onMapClick} />

            {/* Tile layer */}
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
                  <div className="flex items-center justify-between border-b ts-border pb-1 mb-2">
                    <span className="font-bold ts-text-primary text-sm">{locationName}</span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white"
                      style={{ backgroundColor: currentRiskColor }}
                    >
                      {riskLevel}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs ts-text-muted">
                    {riskScore !== undefined && (
                      <div className="flex justify-between">
                        <span className="ts-text-subtle">Strain Score:</span>
                        <span className="font-bold ts-text-primary">{riskScore.toFixed(2)} / 1.00</span>
                      </div>
                    )}
                    {temperature !== undefined && (
                      <div className="flex justify-between">
                        <span className="ts-text-subtle">Air Temperature:</span>
                        <span className="font-bold ts-text-primary">{temperature.toFixed(1)}°C</span>
                      </div>
                    )}
                    {humidity !== undefined && (
                      <div className="flex justify-between">
                        <span className="ts-text-subtle">Relative Humidity:</span>
                        <span className="font-bold ts-text-primary">{Math.round(humidity)}%</span>
                      </div>
                    )}
                    <div className="pt-1.5 border-t ts-border text-[11px] text-orange-400">
                      <strong>Action: </strong>
                      {riskLevel === 'EXTREME' || riskLevel === 'HIGH'
                        ? 'Hydrate frequently and limit unshaded direct labor.'
                        : 'Routine hydration recommended.'}
                    </div>
                    {wbgt !== undefined && (
                      <div className="pt-1 text-[10px] ts-text-subtle">
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
                        <div className="flex items-center justify-between border-b ts-border pb-1 mb-1.5">
                          <span className="font-bold ts-text-primary text-xs">
                            {loc.latitude.toFixed(3)}°N, {loc.longitude.toFixed(3)}°E
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase text-white"
                            style={{ backgroundColor: locColor }}
                          >
                            {loc.risk_level}
                          </span>
                        </div>
                        <div className="text-xs ts-text-muted space-y-1">
                          <div className="flex justify-between">
                            <span className="ts-text-subtle">Civic Risk Score:</span>
                            <span className="font-mono font-bold ts-text-primary">
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

        {/* Legend / Tip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] ts-text-muted pt-1">
          <div className="flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
            <span>Click any coordinate on the map to recalculate local thermal stress and civic risk.</span>
          </div>
          <span className="ts-text-subtle">Map telemetry © OpenStreetMap</span>
        </div>
      </CardContent>
    </Card>
  );
};
