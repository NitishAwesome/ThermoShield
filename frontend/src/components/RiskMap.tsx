import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap, useMapEvents } from 'react-leaflet';
import { Navigation, AlertCircle, Loader2, Info, Layers, ShieldAlert } from 'lucide-react';
import L from 'leaflet';
import { RiskLevel, MapLocationRisk, ThermalZone } from '../types';
import { getRiskColor } from '../utils/risk';
import { Card, CardHeader, CardContent, Badge } from './ui';
import { useTranslation } from '../context/LanguageContext';

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
  thermalZones?: ThermalZone[];
  selectedZoneId?: string;
  onSelectZone?: (zone: ThermalZone) => void;
  isLoadingMap?: boolean;
  mapError?: string | null;
  onMapClick?: (lat: number, lon: number) => void;
  className?: string;
  title?: string;
  subtitle?: string;
  isCitizenView?: boolean;
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
  thermalZones = [],
  selectedZoneId,
  onSelectZone,
  isLoadingMap = false,
  mapError = null,
  onMapClick,
  className = '',
  title,
  subtitle,
  isCitizenView = false,
}) => {
  const { t } = useTranslation();
  const currentRiskColor = getRiskColor(riskLevel);

  const getZoneColor = (zone: ThermalZone) => {
    if (zone.vulnerabilityIndex >= 0.8) return '#EF4444'; // Extreme
    if (zone.vulnerabilityIndex >= 0.65 || zone.baselineTempOffsetC >= 1.0) return '#F97316'; // High
    if (zone.vulnerabilityIndex >= 0.5) return '#F59E0B'; // Moderate
    return '#10B981'; // Low
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader
        title={title || (isCitizenView ? 'Local Heat Map' : 'Local Area Heat Risk')}
        subtitle={subtitle || (isCitizenView ? 'Estimated thermal conditions and risk around your monitored area' : 'Thermal risk evaluated around curated urban monitoring reference locations')}
        badge={
          <Badge variant={isCitizenView ? 'default' : 'brand'} size="sm">
            {isCitizenView ? 'Community Heat View' : 'Spatial Risk Intelligence'}
          </Badge>
        }
        action={
          <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="ts-text-muted text-[11px] font-semibold hidden xs:inline">{t('riskCard.lowRisk')}</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="ts-text-muted text-[11px] font-semibold hidden xs:inline">{t('riskCard.moderateBurden')}</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="ts-text-muted text-[11px] font-semibold hidden xs:inline">{t('riskCard.highStrain')}</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-[11px] font-bold">{t('riskCard.extremeHazard')}</span>
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
        <div className="relative h-[340px] sm:h-[430px] w-full rounded-xl overflow-hidden border ts-border shadow-inner">
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

            {/* Prototype Urban Thermal Zones (Greater Mumbai Demonstration) */}
            {thermalZones.map((zone) => {
              const zColor = getZoneColor(zone);
              const isSelected = selectedZoneId === zone.id;
              return (
                <React.Fragment key={zone.id}>
                  <Polygon
                    positions={zone.polygon}
                    pathOptions={{
                      color: isSelected ? '#ea580c' : zColor,
                      fillColor: zColor,
                      fillOpacity: isSelected ? 0.55 : 0.28,
                      weight: isSelected ? 3 : 1.5,
                    }}
                    eventHandlers={{
                      click: () => onSelectZone?.(zone),
                    }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-1 min-w-[220px] space-y-1.5 text-xs">
                        <div className="flex items-center justify-between border-b ts-border pb-1">
                          <span className="font-bold ts-text-primary text-sm">{zone.name}</span>
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold text-white uppercase"
                            style={{ backgroundColor: zColor }}
                          >
                            {zone.vulnerabilityIndex >= 0.8 ? 'EXTREME' : zone.vulnerabilityIndex >= 0.65 ? 'HIGH' : 'MODERATE'}
                          </span>
                        </div>
                        <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                          Prototype Urban Thermal Zone
                        </div>
                        <div className="text-xs ts-text-muted space-y-0.5">
                          <div><strong>District:</strong> {zone.district}</div>
                          <div><strong>Microclimate Offset:</strong> {zone.baselineTempOffsetC >= 0 ? `+${zone.baselineTempOffsetC}°C` : `${zone.baselineTempOffsetC}°C`} UHI</div>
                          <div><strong>Vulnerability Index:</strong> {(zone.vulnerabilityIndex * 100).toFixed(0)}%</div>
                        </div>
                        <div className="pt-1 border-t ts-border text-[11px] ts-text-subtle">
                          {zone.demographicsNote}
                        </div>
                        {onSelectZone && (
                          <button
                            type="button"
                            onClick={() => onSelectZone(zone)}
                            className="w-full mt-1.5 px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer transition-colors"
                          >
                            Focus This Zone →
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Polygon>

                  <Marker
                    position={zone.representativeCoords}
                    eventHandlers={{
                      click: () => onSelectZone?.(zone),
                    }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-1 text-xs">
                        <div className="font-bold ts-text-primary">{zone.shortName}</div>
                        <div className="text-[10px] text-orange-400 font-mono">Representative Coordinate</div>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}

            {/* Primary selected location heat risk radius circle (shown when not viewing thermal zones polygon view) */}
            {thermalZones.length === 0 && (
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
            )}

            {/* Selected Location Marker */}
            <Marker position={center}>
              <Popup className="custom-popup">
                <div className="p-1 min-w-[220px]">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-orange-500 mb-0.5">
                    Monitoring Reference Location
                  </div>
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
                        <span className="ts-text-subtle">{t('riskMap.strainScore')}:</span>
                        <span className="font-bold ts-text-primary">{riskScore.toFixed(2)} / 1.00</span>
                      </div>
                    )}
                    {temperature !== undefined && (
                      <div className="flex justify-between">
                        <span className="ts-text-subtle">{t('riskMap.airTemp')}:</span>
                        <span className="font-bold ts-text-primary">{temperature.toFixed(1)}°C</span>
                      </div>
                    )}
                    {humidity !== undefined && (
                      <div className="flex justify-between">
                        <span className="ts-text-subtle">{t('riskMap.relativeHumidity')}:</span>
                        <span className="font-bold ts-text-primary">{Math.round(humidity)}%</span>
                      </div>
                    )}
                    {wbgt !== undefined && (
                      <div className="flex justify-between">
                        <span className="ts-text-subtle">{t('riskMap.estimatedWbgt')}:</span>
                        <span className="font-bold ts-text-primary">{wbgt.toFixed(1)}°C</span>
                      </div>
                    )}
                    <div className="pt-1.5 border-t ts-border text-[11px] text-orange-400">
                      <strong>{t('riskMap.action')}: </strong>
                      {riskLevel === 'EXTREME' || riskLevel === 'HIGH'
                        ? t('riskMap.actionHigh')
                        : t('riskMap.actionRoutine')}
                    </div>
                    <div className="pt-1 text-[10px] ts-text-subtle leading-tight">
                      📍 25km analytical risk zone around this urban reference coordinate.
                    </div>
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
                            <span className="ts-text-subtle">{t('riskMap.civicRiskScore')}:</span>
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

        {/* Dual Map Legend & Spatial Methodology */}
        <div className="space-y-2 pt-2 border-t ts-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Legend Part 1: Risk Severity */}
            <div className="p-3 rounded-xl ts-card-subtle border ts-border">
              <div className="font-bold ts-text-primary text-[11px] uppercase tracking-wider mb-2">
                1. Thermal Risk Severity
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="ts-text-muted">Low Baseline</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="ts-text-muted">Moderate Burden</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                  <span className="ts-text-muted">High Strain</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                  <span className="text-red-400 font-bold">Extreme Threat</span>
                </div>
              </div>
            </div>

            {/* Legend Part 2: Monitoring Methodology */}
            <div className="p-3 rounded-xl ts-card-subtle border ts-border">
              <div className="font-bold ts-text-primary text-[11px] uppercase tracking-wider mb-2">
                2. Monitoring Pipeline
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] ts-text-muted">
                <span className="px-2 py-0.5 rounded bg-slate-500/10 font-mono">
                  Live Meteorological Input
                </span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-slate-500/10 font-mono">
                  Calculated WBGT & HI
                </span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-slate-500/10 font-mono">
                  Modelled Composite Risk
                </span>
              </div>
            </div>
          </div>

          {/* Spatial Transparency Notice */}
          <div className="p-2.5 rounded-xl bg-slate-500/5 border ts-border text-[11px] ts-text-muted flex items-start space-x-2">
            <Info className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
            <div className="leading-snug">
              Colored regions visualize calculated thermal risk around each monitoring reference location. They are analytical regional risk estimates, not satellite thermal imagery or physical sensor coverage maps.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
