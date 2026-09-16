import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polygon,
  GeoJSON,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { AlertCircle, Info, FlaskConical } from 'lucide-react';
import L from 'leaflet';
import { RiskLevel, MapLocationRisk, ThermalZone, HeatRiskArea } from '../types';
import { getRiskColor, getRiskStyle } from '../utils/risk';
import { Card, CardHeader, CardContent, Badge } from './ui';
import { useTranslation } from '../context/LanguageContext';

// ─────────────────────────────────────────────
// Fix leaflet default marker icon in React
// ─────────────────────────────────────────────
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
  adminWards?: HeatRiskArea[];
  selectedWardId?: string;
  onSelectWard?: (ward: HeatRiskArea) => void;
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

// ─────────────────────────────────────────────
// MapRecenter: smoothly fly to new center
// ─────────────────────────────────────────────
const MapRecenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { duration: 1.2 });
  }, [center, map]);
  return null;
};

// ─────────────────────────────────────────────
// MapClickHandler: captures map taps
// ─────────────────────────────────────────────
const MapClickHandler: React.FC<{
  onMapClick?: (lat: number, lon: number) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

// ─────────────────────────────────────────────
// ZoomWatcher: reports current zoom level up
// ─────────────────────────────────────────────
const ZoomWatcher: React.FC<{ onChange: (z: number) => void }> = ({ onChange }) => {
  const map = useMap();
  useEffect(() => {
    onChange(map.getZoom());
    const handler = () => onChange(map.getZoom());
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map, onChange]);
  return null;
};

// ─────────────────────────────────────────────
// ZOOM THRESHOLD: below this → dot markers, above → badge markers
// ─────────────────────────────────────────────
const BADGE_ZOOM_THRESHOLD = 10;

// ─────────────────────────────────────────────
// Centroid Badge Marker — full-detail label chip
// ─────────────────────────────────────────────
const createCentroidBadgeIcon = (label: string, level: RiskLevel, isSelected: boolean) => {
  const style = getRiskStyle(level);
  return L.divIcon({
    className: 'custom-ward-centroid-badge',
    html: `
      <div style="
        background: rgba(15, 23, 42, 0.93);
        color: #fff;
        border: 2px solid ${isSelected ? '#ea580c' : style.fill};
        border-radius: 7px;
        padding: 2px 7px;
        font-size: 10.5px;
        font-weight: 700;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.55);
        display: flex;
        align-items: center;
        gap: 4px;
        transform: translate(-50%, -50%);
        pointer-events: auto;
        cursor: pointer;
      ">
        <span style="letter-spacing: -0.2px;">${label}</span>
        <span style="color: ${style.fill}; font-weight: 800; font-size: 9.5px; letter-spacing: 0.3px;">
          ${style.emoji} ${level}
        </span>
      </div>
    `,
    iconSize: [0, 0],
  });
};

// ─────────────────────────────────────────────
// Compact Dot Marker — for low-zoom declutter
// ─────────────────────────────────────────────
const createCentroidDotIcon = (level: RiskLevel, isSelected: boolean) => {
  const style = getRiskStyle(level);
  const color = isSelected ? '#ea580c' : style.fill;
  return L.divIcon({
    className: 'custom-dot-marker',
    html: `
      <div style="
        width: 11px;
        height: 11px;
        background: ${color};
        border: 2px solid rgba(255,255,255,0.75);
        border-radius: 50%;
        box-shadow: 0 0 5px rgba(0,0,0,0.5);
        transform: translate(-50%, -50%);
      "></div>
    `,
    iconSize: [0, 0],
  });
};

// ─────────────────────────────────────────────
// Custom selected-location pin (orange teardrop)
// ─────────────────────────────────────────────
const createSelectedPinIcon = (riskLevel: RiskLevel) => {
  const riskColor = getRiskColor(riskLevel);
  return L.divIcon({
    className: 'custom-selected-pin',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
        cursor: pointer;
        filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5));
      ">
        <div style="
          width: 26px;
          height: 26px;
          background: ${riskColor};
          border: 3px solid #fff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 2px 10px rgba(0,0,0,0.4);
        "></div>
        <div style="
          width: 4px;
          height: 6px;
          background: ${riskColor};
          border-radius: 0 0 2px 2px;
          margin-top: -2px;
        "></div>
      </div>
    `,
    iconSize: [0, 0],
  });
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
  adminWards = [],
  selectedWardId,
  onSelectWard,
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
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const showBadges = currentZoom >= BADGE_ZOOM_THRESHOLD;

  const getZoneLevel = (zone: ThermalZone): RiskLevel =>
    zone.vulnerabilityIndex >= 0.8
      ? 'EXTREME'
      : zone.vulnerabilityIndex >= 0.65 || zone.baselineTempOffsetC >= 1.0
      ? 'HIGH'
      : zone.vulnerabilityIndex >= 0.5
      ? 'MODERATE'
      : 'LOW';

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader
        title={title || (isCitizenView ? 'Local Heat Map' : 'Local Area Heat Risk')}
        subtitle={subtitle || (isCitizenView
          ? 'Estimated thermal conditions and risk around your monitored area'
          : 'Thermal risk evaluated around curated urban monitoring reference locations')}
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
        {/* Prototype zones data notice (citizen view only) */}
        {isCitizenView && thermalZones.length > 0 && adminWards.length === 0 && (
          <div className="p-2.5 rounded-xl bg-amber-500/8 border border-amber-500/25 text-amber-300 text-[11px] flex items-start gap-2">
            <FlaskConical className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            <span>
              <strong className="font-bold">Prototype demonstration zones</strong> — polygons show modelled thermal patterns for Greater Mumbai.
              {' '}They are <em>not</em> live sensor readings. Tap the map to analyse any real coordinate.
            </span>
          </div>
        )}

        {/* Map Error Banner */}
        {mapError && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>Map risk layer notice: {mapError}. Displaying base geographic view.</span>
          </div>
        )}

        {/* Map Canvas */}
        <div
          className="relative w-full rounded-xl overflow-hidden border ts-border shadow-inner"
          style={{ height: isCitizenView ? '400px' : '430px' }}
        >
          {onMapClick && (
            <div className="absolute top-2 left-2 z-[500] px-2 py-1 rounded-full bg-slate-900/80 border border-orange-500/30 text-[10.5px] text-orange-300 font-semibold flex items-center gap-1.5 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Tap map to move pin
            </div>
          )}
          <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <MapRecenter center={center} />
            <MapClickHandler onMapClick={onMapClick} />
            <ZoomWatcher onChange={setCurrentZoom} />

            {/* Tile layer */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* ── Mumbai Administrative Ward References Layer ── */}
            {adminWards && adminWards.length > 0 && adminWards.map((ward) => {
              const rStyle = getRiskStyle(ward.risk.level);
              const isSelected = selectedWardId === ward.id;
              return (
                <React.Fragment key={ward.id}>
                  {ward.geometry && (
                    <GeoJSON
                      key={`geom_${ward.id}_${ward.risk.level}_${isSelected ? 'sel' : 'norm'}`}
                      data={{
                        type: 'Feature',
                        properties: { id: ward.id, name: ward.name, code: ward.wardCode },
                        geometry: ward.geometry,
                      } as any}
                      style={() => ({
                        color: isSelected ? '#ea580c' : rStyle.stroke,
                        fillColor: rStyle.fill,
                        fillOpacity: isSelected ? rStyle.selectedFillOpacity : rStyle.fillOpacity,
                        weight: isSelected ? rStyle.selectedStrokeWidth : rStyle.strokeWidth,
                      })}
                      eventHandlers={{ click: () => onSelectWard?.(ward) }}
                    />
                  )}

                  {/* Centroid badge / dot based on zoom */}
                  <Marker
                    position={[ward.centroid.latitude, ward.centroid.longitude]}
                    icon={showBadges
                      ? createCentroidBadgeIcon(ward.wardCode || ward.name, ward.risk.level, isSelected)
                      : createCentroidDotIcon(ward.risk.level, isSelected)}
                    eventHandlers={{ click: () => onSelectWard?.(ward) }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-1 min-w-[240px] space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b ts-border pb-1.5">
                          <div>
                            <div className="font-bold ts-text-primary text-sm">{ward.name}</div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                              Official Administrative Ward (MCGM Open Data)
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10.5px] font-extrabold ${rStyle.badge}`}>
                            {rStyle.emoji} {ward.risk.level}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-xs ts-text-muted">
                          <div><strong>Temp:</strong> {ward.weather.temperatureC.toFixed(1)}°C</div>
                          <div><strong>Humidity:</strong> {ward.weather.humidityPercent}%</div>
                          <div><strong>Wind:</strong> {ward.weather.windSpeedMps.toFixed(1)} m/s</div>
                          <div><strong>Est. WBGT:</strong> {ward.thermal.estimatedWbgtC.toFixed(1)}°C</div>
                          <div><strong>Heat Index:</strong> {ward.thermal.heatIndexC.toFixed(1)}°C</div>
                          <div><strong>UHI Offset:</strong> +{ward.microclimateOffsetC ?? 0}°C</div>
                        </div>
                        {ward.attentionReason && (
                          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-[11px] text-orange-800 dark:text-orange-200">
                            <strong>Why this area needs attention: </strong>
                            {ward.attentionReason}
                          </div>
                        )}
                        {onSelectWard && (
                          <button
                            type="button"
                            onClick={() => onSelectWard(ward)}
                            className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer transition-colors"
                          >
                            Inspect Ward Telemetry →
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}

            {/* ── Prototype Urban Thermal Zones (citizen demo polygons) ── */}
            {adminWards.length === 0 && thermalZones.map((zone) => {
              const zoneLevel = getZoneLevel(zone);
              const zStyle = getRiskStyle(zoneLevel);
              const isSelected = selectedZoneId === zone.id;
              return (
                <React.Fragment key={zone.id}>
                  <Polygon
                    positions={zone.polygon}
                    pathOptions={{
                      color: isSelected ? '#ea580c' : zStyle.stroke,
                      fillColor: zStyle.fill,
                      fillOpacity: isSelected ? zStyle.selectedFillOpacity : zStyle.fillOpacity,
                      weight: isSelected ? zStyle.selectedStrokeWidth : zStyle.strokeWidth,
                    }}
                    eventHandlers={{ click: () => onSelectZone?.(zone) }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-1 min-w-[220px] space-y-1.5 text-xs">
                        <div className="flex items-center justify-between border-b ts-border pb-1">
                          <span className="font-bold ts-text-primary text-sm">{zone.name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${zStyle.badge}`}>
                            {zStyle.emoji} {zoneLevel}
                          </span>
                        </div>
                        <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                          ⚗ Prototype Urban Thermal Zone
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

                  {/* Centroid: badge at high zoom, dot at low zoom */}
                  <Marker
                    position={zone.representativeCoords}
                    icon={showBadges
                      ? createCentroidBadgeIcon(zone.shortName, zoneLevel, isSelected)
                      : createCentroidDotIcon(zoneLevel, isSelected)}
                    eventHandlers={{ click: () => onSelectZone?.(zone) }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-1 text-xs">
                        <div className="font-bold ts-text-primary">{zone.shortName}</div>
                        <div className="text-[10px] text-amber-400 font-mono">⚗ Prototype Zone</div>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}

            {/* Fallback risk radius circle (no zones/wards) */}
            {adminWards.length === 0 && thermalZones.length === 0 && (
              <Circle
                center={center}
                radius={25000}
                pathOptions={{
                  color: currentRiskColor,
                  fillColor: currentRiskColor,
                  fillOpacity: 0.28,
                  weight: 2,
                }}
              />
            )}

            {/* ── Selected Location Marker (custom orange teardrop pin) ── */}
            <Marker position={center} icon={createSelectedPinIcon(riskLevel)}>
              <Popup className="custom-popup">
                <div className="p-1 min-w-[220px]">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-orange-500 mb-0.5">
                    {isCitizenView ? 'Tapped Location' : 'Monitoring Reference Location'}
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
                    {isCitizenView && (
                      <div className="pt-1 text-[10px] ts-text-subtle leading-tight">
                        📍 Tap anywhere on the map to move this pin and refresh thermal data.
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
                      fillOpacity: 0.22,
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

        {/* ── Legend & Methodology ── */}
        <div className="space-y-2 pt-2 border-t ts-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Legend Part 1: Risk Severity */}
            <div className="p-3 rounded-xl ts-card-subtle border ts-border">
              <div className="font-bold ts-text-primary text-[11px] uppercase tracking-wider mb-2">
                Heat Risk Classification & Operational Meaning
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-start space-x-2">
                  <span className="text-base leading-none">🟢</span>
                  <div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">LOW</div>
                    <div className="text-[11px] ts-text-subtle">Conditions currently within lower-risk range</div>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-base leading-none">🟡</span>
                  <div>
                    <div className="font-bold text-amber-600 dark:text-amber-400 text-xs">MODERATE</div>
                    <div className="text-[11px] ts-text-subtle">Increased caution recommended</div>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-base leading-none">🟠</span>
                  <div>
                    <div className="font-bold text-orange-600 dark:text-orange-400 text-xs">HIGH</div>
                    <div className="text-[11px] ts-text-subtle">Significant physiological heat stress</div>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-base leading-none">🔴</span>
                  <div>
                    <div className="font-bold text-red-600 dark:text-red-400 text-xs">EXTREME</div>
                    <div className="text-[11px] ts-text-subtle">Severe thermal conditions — emergency actions</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend Part 2: Methodology */}
            <div className="p-3 rounded-xl ts-card-subtle border ts-border">
              <div className="font-bold ts-text-primary text-[11px] uppercase tracking-wider mb-2">
                {isCitizenView ? 'How Zones Are Calculated' : 'Hyperlocal GIS Intelligence Pipeline'}
              </div>
              {isCitizenView ? (
                <div className="text-[11px] ts-text-muted leading-relaxed space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-500/10 font-mono text-[10px]">Open-Meteo Weather</span>
                    <span>→</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-500/10 font-mono text-[10px]">WBGT Model</span>
                    <span>→</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-500/10 font-mono text-[10px]">Risk Level</span>
                  </div>
                  <div className="text-[10px] ts-text-subtle leading-tight">
                    Labels appear at zoom ≥ {BADGE_ZOOM_THRESHOLD}. Zoom out for dot view to reduce clutter.
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] ts-text-muted">
                    <span className="px-2 py-0.5 rounded bg-slate-500/10 font-mono">Mumbai Administrative Ward References</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 rounded bg-slate-500/10 font-mono">Calculated WBGT & UHI Offset</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 rounded bg-slate-500/10 font-mono">4-Tier Distinct Risk Mapping</span>
                  </div>
                  <div className="mt-2 text-[10.5px] ts-text-subtle leading-tight">
                    Ward geometry is consistent with the MCGM/BMC administrative ward configuration (24 wards). Vulnerability weighting is modelled — not independently census-verified.
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Spatial Transparency Notice */}
          <div className="p-2.5 rounded-xl bg-slate-500/5 border ts-border text-[11px] ts-text-muted flex items-start space-x-2">
            <Info className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
            <div className="leading-snug">
              {isCitizenView
                ? 'Prototype thermal polygons are demonstration models for Greater Mumbai, not real-time IoT sensor data. Tap anywhere on the map to get live atmospheric readings for that exact coordinate.'
                : 'Curated ward geometry and prototype thermal polygons represent spatial heat-health risk envelopes. They reflect localized wet-bulb temperatures, urban heat island offsets, and modelled vulnerability indices.'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
