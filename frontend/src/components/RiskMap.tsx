import React, { useEffect, useState, useRef } from 'react';
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
import { AlertCircle, Info, FlaskConical, Globe, Flame, Layers } from 'lucide-react';
import L from 'leaflet';
import { RiskLevel, MapLocationRisk, ThermalZone, HeatRiskArea, GlobalHeatStation, StateHeatAlertProperties } from '../types';
import { getRiskColor, getRiskStyle } from '../utils/risk';
import { Card, CardHeader, CardContent, Badge } from './ui';
import { useTranslation } from '../context/LanguageContext';
import { WORLD_HEAT_DIFFUSION_SEEDS, HeatmapSeedPoint } from '../data/globalHeatHotspots';
import {
  INDIA_STATE_HEAT_ALERTS_GEOJSON,
  getStateCategoryStyle,
  getLiveStateGeoJSON,
  getLiveAllStateHeatAlerts,
  getIndianStandardTime,
} from '../data/stateHeatAlerts';


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
  riskLevel?: RiskLevel | null;
  riskScore?: number;
  mapLocations?: MapLocationRisk[];
  thermalZones?: ThermalZone[];
  adminWards?: HeatRiskArea[];
  selectedWardId?: string;
  onSelectWard?: (ward: HeatRiskArea) => void;
  onInspectWardTelemetry?: (ward: HeatRiskArea) => void;
  selectedZoneId?: string;
  onSelectZone?: (zone: ThermalZone) => void;
  isLoadingMap?: boolean;
  mapError?: string | null;
  onMapClick?: (lat: number, lon: number) => void;
  className?: string;
  title?: string;
  subtitle?: string;
  isCitizenView?: boolean;

  // Global World Heatmap Extensions
  globalStations?: GlobalHeatStation[];
  selectedGlobalStationId?: string;
  onSelectGlobalStation?: (station: GlobalHeatStation) => void;
  showHeatmapOverlay?: boolean;
  onToggleHeatmap?: (enabled: boolean) => void;
  scope?: 'world' | 'national' | 'wards';

  // State-Wise Heatmap Alerts
  showStateAlerts?: boolean;
  selectedStateCode?: string;
  onSelectState?: (state: StateHeatAlertProperties) => void;
  stateAlerts?: StateHeatAlertProperties[];
  stateGeoJson?: any;
}

// ─────────────────────────────────────────────
// MapRecenter: smoothly fly to new center and zoom
// ─────────────────────────────────────────────
const MapRecenter: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom !== undefined ? zoom : map.getZoom(), { duration: 1.2 });
  }, [center[0], center[1], zoom, map]);
  return null;
};

// ─────────────────────────────────────────────
// MapClickHandler: captures map taps
// ─────────────────────────────────────────────
const MapClickHandler: React.FC<{
  onMapClick?: (lat: number, lon: number) => void;
  lastFeatureClickRef?: React.MutableRefObject<number>;
}> = ({ onMapClick, lastFeatureClickRef }) => {
  useMapEvents({
    click(e) {
      if (lastFeatureClickRef && Date.now() - lastFeatureClickRef.current < 400) {
        return;
      }
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
// ZOOM THRESHOLD: below this → dot markers, above → compact ward code badges
// ─────────────────────────────────────────────
const BADGE_ZOOM_THRESHOLD = 12;

// ─────────────────────────────────────────────
// Centroid Badge Marker — decluttered compact ward code chip
// ─────────────────────────────────────────────
const createCentroidBadgeIcon = (label: string, level: RiskLevel, isSelected: boolean) => {
  const style = getRiskStyle(level);
  // Strip any descriptive suffix like ": Vejalpur"
  const cleanLabel = (label || '').split(':')[0].trim();
  let code = cleanLabel;

  const wardMatch = cleanLabel.match(/Ward\s+([A-Z0-9\/]+)/i);
  const dashCodeMatch = cleanLabel.match(/^([A-Z]+)-?(\d+)/i);

  if (dashCodeMatch) {
    // e.g. "AMC-04" → "AMC-4", "AMC-32" → "AMC-32"
    code = `${dashCodeMatch[1]}-${parseInt(dashCodeMatch[2], 10)}`;
  } else if (wardMatch) {
    code = wardMatch[1];
  } else if (cleanLabel.length > 8) {
    code = cleanLabel.substring(0, 8).replace(/[-_:]+$/, '');
  }

  return L.divIcon({
    className: 'custom-ward-centroid-badge',
    html: `
      <div style="
        background: ${isSelected ? '#ea580c' : 'rgba(15, 23, 42, 0.90)'};
        color: #fff;
        border: 1.5px solid ${isSelected ? '#fff' : style.fill};
        border-radius: 6px;
        padding: 1.5px 5px;
        font-size: 10px;
        font-weight: 800;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.45);
        display: flex;
        align-items: center;
        gap: 3px;
        transform: translate(-50%, -50%);
        pointer-events: auto;
        cursor: pointer;
      ">
        <span>${code}</span>
        ${isSelected ? `<span style="color: #fed7aa; font-weight: 800; font-size: 8.5px;">${level}</span>` : ''}
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
const createSelectedPinIcon = (riskLevel?: RiskLevel | null) => {
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

// ─────────────────────────────────────────────
// GLOBAL STATION ZOOM THRESHOLD: below 5 → glowing dots, above 5 → badge chips
// ─────────────────────────────────────────────
const GLOBAL_BADGE_ZOOM_THRESHOLD = 5;

// ─────────────────────────────────────────────
// Global Station Centroid Badge Marker
// ─────────────────────────────────────────────
const createGlobalStationBadgeIcon = (name: string, country: string, level: RiskLevel, isSelected: boolean, temp?: number) => {
  const style = getRiskStyle(level);
  return L.divIcon({
    className: 'custom-global-station-badge',
    html: `
      <div style="
        background: rgba(15, 23, 42, 0.94);
        color: #fff;
        border: 2px solid ${isSelected ? '#ea580c' : style.fill};
        border-radius: 8px;
        padding: 3px 8px;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        box-shadow: 0 3px 10px rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        gap: 5px;
        transform: translate(-50%, -50%);
        pointer-events: auto;
        cursor: pointer;
      ">
        <span style="letter-spacing: -0.2px;">${name}</span>
        ${temp !== undefined ? `<span style="color: #fdba74; font-family: monospace; font-size: 10.5px;">${temp.toFixed(0)}°C</span>` : ''}
        <span style="color: ${style.fill}; font-weight: 800; font-size: 9.5px; letter-spacing: 0.3px;">
          ${style.emoji} ${level}
        </span>
      </div>
    `,
    iconSize: [0, 0],
  });
};

// ─────────────────────────────────────────────
// Global Station Dot Marker (for macro global view)
// ─────────────────────────────────────────────
const createGlobalStationDotIcon = (level: RiskLevel, isSelected: boolean) => {
  const style = getRiskStyle(level);
  const color = isSelected ? '#ea580c' : style.fill;
  return L.divIcon({
    className: 'custom-global-dot-marker',
    html: `
      <div style="
        width: 14px;
        height: 14px;
        background: ${color};
        border: 2.5px solid rgba(255,255,255,0.92);
        border-radius: 50%;
        box-shadow: 0 0 10px ${color}, 0 2px 6px rgba(0,0,0,0.6);
        transform: translate(-50%, -50%);
        cursor: pointer;
      "></div>
    `,
    iconSize: [0, 0],
  });
};

// ─────────────────────────────────────────────
// State-Wise Heat Alert Badge Marker
// ─────────────────────────────────────────────
const createStateBadgeIcon = (code: string, category: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN', temp: number, isSelected: boolean) => {
  const cStyle = getStateCategoryStyle(category, isSelected);
  return L.divIcon({
    className: 'custom-state-badge',
    html: `
      <div style="
        background: rgba(15, 23, 42, 0.94);
        color: #fff;
        border: 2px solid ${cStyle.fillColor};
        border-radius: 8px;
        padding: 3px 7px;
        font-size: 11px;
        font-weight: 800;
        white-space: nowrap;
        box-shadow: ${cStyle.glowShadow || '0 3px 10px rgba(0,0,0,0.6)'};
        display: flex;
        align-items: center;
        gap: 5px;
        transform: translate(-50%, -50%);
        pointer-events: auto;
        cursor: pointer;
      ">
        <span style="font-family: monospace; letter-spacing: 0.5px;">${code}</span>
        <span style="color: #fdba74; font-family: monospace; font-size: 11px;">${temp.toFixed(1)}°C</span>
        <span style="
          background: ${cStyle.fillColor};
          color: ${category === 'YELLOW' ? '#0f172a' : '#fff'};
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.3px;
        ">
          ${category}
        </span>
      </div>
    `,
    iconSize: [0, 0],
  });
};

const createStateDotIcon = (category: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN', isSelected: boolean) => {
  const cStyle = getStateCategoryStyle(category, isSelected);
  return L.divIcon({
    className: 'custom-state-dot-marker',
    html: `
      <div style="
        width: 14px;
        height: 14px;
        background: ${cStyle.fillColor};
        border: 2.5px solid rgba(255,255,255,0.95);
        border-radius: 50%;
        box-shadow: 0 0 10px ${cStyle.fillColor}, 0 2px 6px rgba(0,0,0,0.6);
        transform: translate(-50%, -50%);
        cursor: pointer;
      "></div>
    `,
    iconSize: [0, 0],
  });
};

// ─────────────────────────────────────────────
// World Heatmap Canvas Layer Component (Smooth Thermal Heat Diffusion)

// ─────────────────────────────────────────────
const WorldHeatmapCanvas: React.FC<{
  points: HeatmapSeedPoint[];
  stations: GlobalHeatStation[];
  wards?: HeatRiskArea[];
  stateAlerts?: StateHeatAlertProperties[];
  visible: boolean;
}> = ({ points, stations, wards = [], stateAlerts = [], visible }) => {
  const map = useMap();

  useEffect(() => {
    if (!visible) return;

    const canvas = L.DomUtil.create('canvas', 'leaflet-world-heatmap-canvas') as HTMLCanvasElement;
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '350';
    canvas.style.opacity = '0.62';
    canvas.style.mixBlendMode = 'multiply';

    const pane = map.getPane('overlayPane');
    if (!pane) return;
    pane.appendChild(canvas);

    const render = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;

      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, size.x, size.y);

      const zoom = map.getZoom();
      const zoomFactor = Math.max(0.6, Math.pow(1.35, zoom - 2));
      const { isDay } = getIndianStandardTime();

      // 1. Draw Planetary Heat Diffusion Seeds with dynamic diurnal Indian modulation
      points.forEach((p) => {
        let intensity = p.intensity;
        const isIndiaAxis = p.lat >= 6.0 && p.lat <= 36.0 && p.lon >= 68.0 && p.lon <= 97.0;

        if (isIndiaAxis && stateAlerts && stateAlerts.length > 0) {
          let closestDist = Infinity;
          let matchedAlert: StateHeatAlertProperties | null = null;
          for (const s of stateAlerts) {
            const d = Math.hypot(s.centroid[1] - p.lat, s.centroid[0] - p.lon);
            if (d < closestDist) {
              closestDist = d;
              matchedAlert = s;
            }
          }
          if (matchedAlert) {
            // Real physical intensity based on live temperature (20°C -> 0.12, 45°C -> 0.96)
            intensity = Math.min(0.96, Math.max(0.12, (matchedAlert.temperatureC - 20) / 26));
            if (!isDay) {
              intensity *= 0.52; // Night cooling reduction
            }
          }
        }

        const pt = map.latLngToContainerPoint([p.lat, p.lon]);
        const radius = Math.min(360, Math.max(50, (p.radiusKm / 100) * 8 * zoomFactor));

        const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
        if (intensity >= 0.88) {
          grad.addColorStop(0, 'rgba(239, 68, 68, 0.78)');
          grad.addColorStop(0.4, 'rgba(249, 115, 22, 0.55)');
          grad.addColorStop(0.75, 'rgba(245, 158, 11, 0.3)');
          grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        } else if (intensity >= 0.65) {
          grad.addColorStop(0, 'rgba(249, 115, 22, 0.72)');
          grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
          grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        } else if (intensity >= 0.40) {
          grad.addColorStop(0, 'rgba(245, 158, 11, 0.55)');
          grad.addColorStop(0.6, 'rgba(16, 185, 129, 0.25)');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        } else {
          grad.addColorStop(0, 'rgba(16, 185, 129, 0.42)');
          grad.addColorStop(0.6, 'rgba(52, 211, 153, 0.18)');
          grad.addColorStop(1, 'rgba(52, 211, 153, 0)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Draw Dynamic Global Megacities & Extreme Heat Stations
      stations.forEach((s) => {
        let level = s.riskLevel;
        const isIndiaAxis = s.lat >= 6.0 && s.lat <= 36.0 && s.lon >= 68.0 && s.lon <= 97.0;

        if (isIndiaAxis && stateAlerts && stateAlerts.length > 0) {
          let closestDist = Infinity;
          let matchedAlert: StateHeatAlertProperties | null = null;
          for (const st of stateAlerts) {
            const d = Math.hypot(st.centroid[1] - s.lat, st.centroid[0] - s.lon);
            if (d < closestDist) {
              closestDist = d;
              matchedAlert = st;
            }
          }
          if (matchedAlert) {
            level = matchedAlert.alertCategory === 'RED' ? 'EXTREME'
              : matchedAlert.alertCategory === 'ORANGE' ? 'HIGH'
              : matchedAlert.alertCategory === 'YELLOW' ? 'MODERATE'
              : 'LOW';
          }
        } else if (isIndiaAxis && !isDay) {
          level = level === 'CRITICAL' ? 'HIGH' : level === 'EXTREME' ? 'MODERATE' : 'LOW';
        }

        const pt = map.latLngToContainerPoint([s.lat, s.lon]);
        const radius = Math.min(220, Math.max(35, 45 * zoomFactor));

        const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
        if (level === 'CRITICAL') {
          grad.addColorStop(0, 'rgba(217, 70, 239, 0.85)');
          grad.addColorStop(0.4, 'rgba(239, 68, 68, 0.65)');
          grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        } else if (level === 'EXTREME') {
          grad.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
          grad.addColorStop(0.45, 'rgba(249, 115, 22, 0.6)');
          grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        } else if (level === 'HIGH') {
          grad.addColorStop(0, 'rgba(249, 115, 22, 0.75)');
          grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
          grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        } else if (level === 'MODERATE') {
          grad.addColorStop(0, 'rgba(245, 158, 11, 0.65)');
          grad.addColorStop(0.6, 'rgba(16, 185, 129, 0.3)');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        } else {
          grad.addColorStop(0, 'rgba(16, 185, 129, 0.55)');
          grad.addColorStop(0.6, 'rgba(52, 211, 153, 0.2)');
          grad.addColorStop(1, 'rgba(52, 211, 153, 0)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Draw Municipal Ward Thermal Blobs (Local City Ward Heatmap Diffusion)
      if (wards && wards.length > 0) {
        wards.forEach((w) => {
          const pt = map.latLngToContainerPoint([w.centroid.latitude, w.centroid.longitude]);
          const radius = Math.min(220, Math.max(25, 30 * zoomFactor));

          const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
          if (w.risk.level === 'EXTREME') {
            grad.addColorStop(0, 'rgba(239, 68, 68, 0.82)');
            grad.addColorStop(0.45, 'rgba(249, 115, 22, 0.55)');
            grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
          } else if (w.risk.level === 'HIGH') {
            grad.addColorStop(0, 'rgba(249, 115, 22, 0.78)');
            grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
            grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          } else if (w.risk.level === 'MODERATE') {
            grad.addColorStop(0, 'rgba(245, 158, 11, 0.7)');
            grad.addColorStop(0.6, 'rgba(234, 179, 8, 0.35)');
            grad.addColorStop(1, 'rgba(234, 179, 8, 0)');
          } else {
            grad.addColorStop(0, 'rgba(16, 185, 129, 0.65)');
            grad.addColorStop(0.6, 'rgba(52, 211, 153, 0.3)');
            grad.addColorStop(1, 'rgba(52, 211, 153, 0)');
          }

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    };

    render();
    map.on('move', render);
    map.on('zoom', render);
    map.on('resize', render);

    return () => {
      map.off('move', render);
      map.off('zoom', render);
      map.off('resize', render);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [map, visible, points, stations, wards, stateAlerts]);

  return null;
};


export const RiskMap: React.FC<RiskMapProps> = ({
  center,
  zoom = 6,
  locationName = 'Selected Coordinate',
  temperature,
  humidity,
  wbgt,
  riskLevel = null,
  riskScore,
  mapLocations = [],
  thermalZones = [],
  adminWards = [],
  selectedWardId,
  onSelectWard,
  onInspectWardTelemetry,
  selectedZoneId,
  onSelectZone,
  isLoadingMap = false,
  mapError = null,
  onMapClick,
  className = '',
  title,
  subtitle,
  isCitizenView = false,
  globalStations = [],
  selectedGlobalStationId,
  onSelectGlobalStation,
  showHeatmapOverlay = true,
  onToggleHeatmap,
  scope = 'wards',
  showStateAlerts = false,
  selectedStateCode,
  onSelectState,
  stateAlerts,
  stateGeoJson,
}) => {
  const { t } = useTranslation();
  const effectiveStateAlerts = stateAlerts && stateAlerts.length > 0 ? stateAlerts : getLiveAllStateHeatAlerts();
  const effectiveStateGeoJson = stateGeoJson || getLiveStateGeoJSON();
  const currentRiskColor = getRiskColor(riskLevel);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [heatmapVisible, setHeatmapVisible] = useState<boolean>(showHeatmapOverlay);
  const [stationsVisible, setStationsVisible] = useState<boolean>(true);
  const showBadges = currentZoom >= BADGE_ZOOM_THRESHOLD;
  const lastFeatureClickRef = useRef<number>(0);

  const handleFeatureClick = (e: any, cb?: () => void) => {
    try {
      lastFeatureClickRef.current = Date.now();
      if (e?.originalEvent) {
        e.originalEvent.stopPropagation?.();
        e.originalEvent._stopped = true;
      }
      if (e?.domEvent) {
        e.domEvent.stopPropagation?.();
      }
    } catch {}
    cb?.();
  };

  useEffect(() => {
    if (showHeatmapOverlay !== undefined) {
      setHeatmapVisible(showHeatmapOverlay);
    }
  }, [showHeatmapOverlay]);


  const getZoneLevel = (zone: ThermalZone): RiskLevel =>
    zone.vulnerabilityIndex >= 0.8
      ? 'EXTREME'
      : zone.vulnerabilityIndex >= 0.65 || zone.baselineTempOffsetC >= 1.0
      ? 'HIGH'
      : zone.vulnerabilityIndex >= 0.5
      ? 'MODERATE'
      : 'LOW';

  return (
    <Card className={`overflow-hidden border-2 ts-border shadow-xl ${className}`}>
      <CardHeader
        title={title || t('riskMap.title')}
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
        {isCitizenView && thermalZones.length > 0 && (
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-300 text-[11px] flex items-start gap-2">
            <FlaskConical className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-400" />
            <span>
              <strong className="font-bold">Prototype microclimate illustration layer active</strong> — polygons show modelled thermal patterns and UHI offsets for scientific exploration.
              {' '}They are <em>not</em> live sensor readings. Ward boundaries reflect current calculated heat risk.
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
          style={{ height: isCitizenView ? '420px' : '480px' }}
        >
          {onMapClick && (
            <div className="absolute top-2.5 left-2.5 z-[500] px-2.5 py-1 rounded-full bg-slate-900/85 border border-orange-500/30 text-[10.5px] text-orange-300 font-semibold flex items-center gap-1.5 pointer-events-none shadow-md backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Tap map to move pin
            </div>
          )}

          {/* Interactive Map Layer Controls */}
          <div className="absolute top-2.5 right-2.5 z-[500] flex items-center gap-1.5 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => {
                const next = !heatmapVisible;
                setHeatmapVisible(next);
                onToggleHeatmap?.(next);
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-md backdrop-blur-sm ${
                heatmapVisible
                  ? 'bg-orange-600/90 text-white border-orange-400 shadow-orange-600/25'
                  : 'bg-slate-900/85 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
              title="Toggle Global Thermal Stress Heatmap Layer"
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>Heatmap {heatmapVisible ? 'ON' : 'OFF'}</span>
            </button>
            {globalStations.length > 0 && (
              <button
                type="button"
                onClick={() => setStationsVisible((v) => !v)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-md backdrop-blur-sm ${
                  stationsVisible
                    ? 'bg-blue-600/90 text-white border-blue-400 shadow-blue-600/25'
                    : 'bg-slate-900/85 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
                title="Toggle World Monitoring Stations"
              >
                <Globe className="w-3.5 h-3.5 text-cyan-300" />
                <span>Stations ({globalStations.length})</span>
              </button>
            )}
          </div>

          <MapContainer
            center={center}
            zoom={zoom}
            minZoom={2}
            worldCopyJump={true}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <MapRecenter center={center} zoom={zoom} />
            <MapClickHandler onMapClick={onMapClick} lastFeatureClickRef={lastFeatureClickRef} />
            <ZoomWatcher onChange={setCurrentZoom} />

            {/* Tile layer */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* ── World Thermal Heatmap Overlay (Smooth Radial Diffusion) ── */}
            <WorldHeatmapCanvas
              points={WORLD_HEAT_DIFFUSION_SEEDS}
              stations={globalStations}
              wards={adminWards}
              stateAlerts={effectiveStateAlerts}
              visible={heatmapVisible}
            />

            {/* ── Official Survey of India State-Wise GIS Heatmap Alert Layer ── */}
            {showStateAlerts && (
              <>
                <GeoJSON
                  key={`state_alerts_geojson_${selectedStateCode || 'all'}_${effectiveStateAlerts[0]?.temperatureC || 'def'}`}
                  data={effectiveStateGeoJson as any}
                  style={(feature: any) => {
                    const p = feature?.properties as StateHeatAlertProperties;
                    const isSelected = selectedStateCode === p?.stateCode;
                    const cStyle = getStateCategoryStyle(p?.alertCategory || 'GREEN', isSelected);
                    return {
                      color: cStyle.strokeColor,
                      fillColor: cStyle.fillColor,
                      fillOpacity: cStyle.fillOpacity,
                      weight: cStyle.weight,
                    };
                  }}
                  onEachFeature={(feature: any, layer: any) => {
                    const p = feature?.properties as StateHeatAlertProperties;
                    if (!p) return;

                    layer.on({
                      mouseover: (e: any) => {
                        const l = e.target;
                        l.setStyle({ weight: 3.5, fillOpacity: 0.72 });
                        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                          l.bringToFront();
                        }
                      },
                      mouseout: (e: any) => {
                        const isSelected = selectedStateCode === p.stateCode;
                        const cStyle = getStateCategoryStyle(p.alertCategory, isSelected);
                        e.target.setStyle({
                          weight: cStyle.weight,
                          fillOpacity: cStyle.fillOpacity,
                          color: cStyle.strokeColor,
                        });
                      },
                      click: (e: any) => {
                        handleFeatureClick(e, () => {
                          onSelectState?.(p);
                        });
                      },
                    });

                    const cStyle = getStateCategoryStyle(p.alertCategory, false);
                    layer.bindPopup(`
                      <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 250px; font-size: 12px; color: #0f172a; padding: 2px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
                          <div>
                            <div style="font-weight: 800; font-size: 14px; color: #0f172a;">${p.stateName}</div>
                            <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Capital: ${p.capitalCity}</div>
                          </div>
                          <span style="background: ${cStyle.fillColor}; color: ${p.alertCategory === 'YELLOW' ? '#0f172a' : '#fff'}; padding: 2px 7px; border-radius: 6px; font-size: 10px; font-weight: 800;">
                            ${p.alertCategory} ALERT
                          </span>
                        </div>
                        <div style="font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 8px;">
                          IMD: ${p.imdClassification}
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #f8fafc; padding: 6px; border-radius: 6px; margin-bottom: 8px; font-size: 11px;">
                          <div><strong>Current Temp:</strong> <span style="color: #ea580c; font-weight: 800;">${p.temperatureC}°C</span></div>
                          <div><strong>Feels-Like:</strong> <strong>${p.apparentTemperatureC}°C</strong></div>
                          <div><strong>Wet-Bulb:</strong> <strong>${p.wetBulbC}°C</strong></div>
                          <div><strong>Est WBGT:</strong> <strong>${p.wbgtC}°C</strong></div>
                        </div>
                        <div style="font-size: 11px; margin-bottom: 6px;">
                          <strong style="color: #475569;">Key Districts:</strong> ${p.affectedDistricts.slice(0, 4).join(', ')}
                        </div>
                        <div style="font-size: 10px; color: #64748b; line-height: 1.3;">
                          ${p.authorityName}
                        </div>
                      </div>
                    `);
                  }}
                />

                {/* State Centroid Badges */}
                {effectiveStateGeoJson.features.map((f: any) => {
                  const p = f.properties;
                  const isSelected = selectedStateCode === p.stateCode;
                  return (
                    <Marker
                      key={`state_centroid_${p.stateCode}_${p.alertCategory}_${p.temperatureC}`}
                      position={[p.centroid[1], p.centroid[0]]}
                      icon={showBadges
                        ? createStateBadgeIcon(p.stateCode, p.alertCategory, p.temperatureC, isSelected)
                        : createStateDotIcon(p.alertCategory, isSelected)}
                      eventHandlers={{ click: (e: any) => handleFeatureClick(e, () => onSelectState?.(p)) }}
                    />
                  );
                })}
              </>
            )}

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
                        fillOpacity: isCitizenView
                          ? (isSelected ? 0.55 : 0.28)
                          : (isSelected ? rStyle.selectedFillOpacity : rStyle.fillOpacity),
                        weight: isSelected ? rStyle.selectedStrokeWidth : (isCitizenView ? 1.4 : rStyle.strokeWidth),
                      })}
                      eventHandlers={{ click: (e: any) => handleFeatureClick(e, () => onSelectWard?.(ward)) }}
                    />
                  )}

                  {/* Centroid badge / dot based on zoom */}
                  <Marker
                    position={[ward.centroid.latitude, ward.centroid.longitude]}
                    icon={showBadges
                      ? createCentroidBadgeIcon(ward.wardCode || ward.name, ward.risk.level, isSelected)
                      : createCentroidDotIcon(ward.risk.level, isSelected)}
                    eventHandlers={{ click: (e: any) => handleFeatureClick(e, () => onSelectWard?.(ward)) }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-1 min-w-[240px] space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b ts-border pb-1.5">
                          <div>
                            <div className="font-bold ts-text-primary text-sm">{ward.name}</div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                              {ward.provenance?.sourceName ? `Official Ward (${ward.provenance.sourceName})` : 'Official Administrative Ward'}
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
                        {(onInspectWardTelemetry || onSelectWard) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onInspectWardTelemetry) {
                                onInspectWardTelemetry(ward);
                              } else {
                                onSelectWard?.(ward);
                              }
                            }}
                            className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm text-center"
                          >
                            Inspect Ward Telemetry →
                          </button>
                        )}
                        {isCitizenView && onMapClick && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMapClick(ward.centroid.latitude, ward.centroid.longitude);
                            }}
                            className="w-full mt-1.5 px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer transition-colors text-center"
                          >
                            📍 Monitor This Ward
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
                    eventHandlers={{ click: (e: any) => handleFeatureClick(e, () => onSelectZone?.(zone)) }}
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
                    eventHandlers={{ click: (e: any) => handleFeatureClick(e, () => onSelectZone?.(zone)) }}
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

            {/* ── Global Heat Surveillance Stations ── */}
            {stationsVisible && globalStations.length > 0 && globalStations.map((station) => {
              const isSelected = selectedGlobalStationId === station.id;
              const sStyle = getRiskStyle(station.riskLevel);
              const showStationBadges = currentZoom >= GLOBAL_BADGE_ZOOM_THRESHOLD;
              return (
                <Marker
                  key={`g_station_${station.id}`}
                  position={[station.lat, station.lon]}
                  icon={showStationBadges
                    ? createGlobalStationBadgeIcon(station.name, station.country, station.riskLevel, isSelected, station.baselineTemp)
                    : createGlobalStationDotIcon(station.riskLevel, isSelected)}
                  eventHandlers={{ click: (e: any) => handleFeatureClick(e, () => onSelectGlobalStation?.(station)) }}
                >
                  <Popup className="custom-popup">
                    <div className="p-1 min-w-[240px] space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b ts-border pb-1.5">
                        <div>
                          <div className="font-bold ts-text-primary text-sm">{station.name}</div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {station.country} • <span className="text-orange-400 font-semibold">{station.region}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-extrabold ${sStyle.badge}`}>
                          {sStyle.emoji} {station.riskLevel}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs ts-text-muted">
                        <div><strong>Air Temp:</strong> {station.baselineTemp.toFixed(1)}°C</div>
                        <div><strong>Humidity:</strong> {station.baselineRh}%</div>
                        <div><strong>Est. WBGT:</strong> {station.baselineWbgt.toFixed(1)}°C</div>
                        <div><strong>Heat Index:</strong> {station.baselineHeatIndex.toFixed(1)}°C</div>
                        <div><strong>Risk Score:</strong> {station.riskScore}/100</div>
                        <div><strong>Vulnerability:</strong> {Math.round(station.vulnerabilityIndex * 100)}%</div>
                      </div>
                      <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-[11px] text-orange-200 leading-relaxed">
                        <strong>Climate Vulnerability: </strong>
                        {station.hazardNote}
                      </div>
                      {onSelectGlobalStation && (
                        <button
                          type="button"
                          onClick={() => onSelectGlobalStation(station)}
                          className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm"
                        >
                          Inspect Station Telemetry →
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Fallback risk radius circle (no zones/wards/global stations) */}
            {adminWards.length === 0 && thermalZones.length === 0 && globalStations.length === 0 && (
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
                      {riskLevel || 'Unavailable'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs ts-text-muted">
                    {riskScore !== undefined && riskScore !== null ? (
                      <div className="flex justify-between">
                        <span className="ts-text-subtle">{t('riskMap.strainScore')}:</span>
                        <span className="font-bold ts-text-primary">
                          {(riskScore > 1 ? riskScore / 100 : riskScore).toFixed(2)} / 1.00
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span className="ts-text-subtle">{t('riskMap.strainScore')}:</span>
                        <span className="font-bold ts-text-muted">Not calculated</span>
                      </div>
                    )}
                    {temperature !== undefined && temperature !== null && (
                      <div className="flex justify-between">
                        <span className="ts-text-subtle">{t('riskMap.airTemp')}:</span>
                        <span className="font-bold ts-text-primary">{temperature.toFixed(1)}°C</span>
                      </div>
                    )}
                    {humidity !== undefined && humidity !== null && (
                      <div className="flex justify-between">
                        <span className="ts-text-subtle">{t('riskMap.relativeHumidity')}:</span>
                        <span className="font-bold ts-text-primary">{Math.round(humidity)}%</span>
                      </div>
                    )}
                    {wbgt !== undefined && wbgt !== null && (
                      <div className="flex justify-between">
                        <span className="ts-text-subtle">{t('riskMap.estimatedWbgt')}:</span>
                        <span className="font-bold ts-text-primary">{wbgt.toFixed(1)}°C</span>
                      </div>
                    )}
                    <div className="pt-1.5 border-t ts-border text-[11px] text-orange-400">
                      <strong>{t('riskMap.action')}: </strong>
                      {riskLevel === 'EXTREME' || riskLevel === 'HIGH'
                        ? t('riskMap.actionHigh')
                        : riskLevel
                        ? t('riskMap.actionRoutine')
                        : 'Heat risk calculation unavailable until weather telemetry is active.'}
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
                            {loc.risk_level || 'Unavailable'}
                          </span>
                        </div>
                        <div className="text-xs ts-text-muted space-y-1">
                          <div className="flex justify-between">
                            <span className="ts-text-subtle">{t('riskMap.civicRiskScore')}:</span>
                            <span className="font-mono font-bold ts-text-primary">
                              {loc.risk_score != null ? `${loc.risk_score.toFixed(1)} / 100` : 'Not calculated'}
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
                {showStateAlerts ? 'IMD State Heatwave Warning Criteria' : 'Heat Risk Classification & Operational Meaning'}
              </div>
              {showStateAlerts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start space-x-2">
                    <span className="text-base leading-none">🔴</span>
                    <div>
                      <div className="font-bold text-red-600 dark:text-red-400 text-xs">RED ALERT (Severe Heat Wave)</div>
                      <div className="text-[11px] ts-text-subtle">T ≥ 42°C or departure ≥ 6.4°C. Mandatory labor halt.</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-base leading-none">🟠</span>
                    <div>
                      <div className="font-bold text-orange-600 dark:text-orange-400 text-xs">ORANGE ALERT (Heat Wave)</div>
                      <div className="text-[11px] ts-text-subtle">T ≥ 40°C or high humidity stress. High risk for vulnerable.</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-base leading-none">🟡</span>
                    <div>
                      <div className="font-bold text-amber-600 dark:text-amber-400 text-xs">YELLOW WATCH (Hot Day / Warm Night)</div>
                      <div className="text-[11px] ts-text-subtle">Moderate thermal strain; monitor vulnerable populations.</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-base leading-none">🟢</span>
                    <div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">GREEN (Normal)</div>
                      <div className="text-[11px] ts-text-subtle">Comfortable / seasonal meteorological envelope.</div>
                    </div>
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            {/* Legend Part 2: Methodology */}
            <div className="p-3 rounded-xl ts-card-subtle border ts-border">
              <div className="font-bold ts-text-primary text-[11px] uppercase tracking-wider mb-2">
                {showStateAlerts
                  ? 'Official Survey of India GIS Pipeline'
                  : isCitizenView ? 'How Zones Are Calculated' : 'Hyperlocal GIS Intelligence Pipeline'}
              </div>
              {showStateAlerts ? (
                <div className="text-[11px] ts-text-muted leading-relaxed space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-500/10 font-mono text-[10px]">Survey of India Borders (37 States/UTs)</span>
                    <span>→</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-500/10 font-mono text-[10px]">IMD Alert Class</span>
                    <span>→</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-500/10 font-mono text-[10px]">SDMA Action Directives</span>
                  </div>
                  <div className="text-[10.5px] ts-text-subtle leading-tight">
                    Full national coverage across all 37 Indian States and Union Territories with calibrated Rothfusz Heat Index and Stull Wet-Bulb metrics.
                  </div>
                </div>
              ) : isCitizenView ? (
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
                    <span className="px-2 py-0.5 rounded bg-slate-500/10 font-mono">
                      {adminWards && adminWards.length > 0 && adminWards[0].provenance?.sourceName
                        ? adminWards[0].provenance.sourceName
                        : 'Municipal Administrative Ward References'}
                    </span>
                    <span>→</span>
                    <span className="px-2 py-0.5 rounded bg-slate-500/10 font-mono">Calculated WBGT & UHI Offset</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 rounded bg-slate-500/10 font-mono">4-Tier Distinct Risk Mapping</span>
                  </div>
                  <div className="mt-2 text-[10.5px] ts-text-subtle leading-tight">
                    {adminWards && adminWards.length > 0
                      ? `Ward geometry is aligned with the municipal administrative district map (${adminWards.length} wards across ${new Set(adminWards.map((w) => w.district)).size} districts). Vulnerability weighting is modelled — not independently census-verified.`
                      : 'Ward geometry is consistent with official municipal administrative ward configurations. Vulnerability weighting is modelled — not independently census-verified.'}
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
                ? 'Demonstration atmospheric and thermal polygons reflect localized microclimates, not real-time IoT sensor data. Tap anywhere on the map to get live atmospheric readings for that exact coordinate.'
                : 'Curated ward geometry and municipal thermal polygons represent spatial heat-health risk envelopes across administrative districts. They reflect localized wet-bulb temperatures, urban heat island offsets, and modelled vulnerability indices.'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
