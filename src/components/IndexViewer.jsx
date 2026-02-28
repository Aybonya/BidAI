import { useMemo, useRef, useState, useEffect } from "react";
import { MapContainer, Polygon, Rectangle, TileLayer, WMSTileLayer, useMap } from "react-leaflet";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { indexLayers, palettes } from "../lib/palettes.js";
import { sentinelHubConfig } from "../lib/sentinelHubConfig.js";

const arcgisUrl =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const arcgisAttribution =
  "Tiles (c) Esri - Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

const UI = {
  indexes: "Индекстер",
  close: "Жабу",
  last: "Соңғысы",
  hideLegend: "Аңыздаманы жасыру",
  showLegend: "Аңыздаманы көрсету",
  noCrop: "Дақыл көрсетілмеген",
  hectares: "га",
  missingInstance:
    "Нақты Sentinel-2 индекстерін жүктеу үшін `VITE_SENTINEL_HUB_INSTANCE_ID` қажет.",
  missingLayer:
    "`{activeLayer}` қабаты `src/lib/sentinelHubConfig.js` ішінде бапталмаған."
};
const layerHints = {
  satellite: "Индекс қабатынсыз спутниктік сурет.",
  ndvi: "Вегетация индексі: жасыл массаның тығыздығы мен белсенділігі.",
  ndmi: "Ылғал индексі: өсімдіктің су стрессін бағалауға көмектеседі.",
  ndre: "Қызыл жиек индексі: стресс пен тапшылықтың ерте белгілері.",
  msavi: "Ашық топырақ әсерін азайтатын вегетация индексі.",
  reci: "Хлорофилл индексі: азот күйін жанама бағалау.",
  ndwi: "Су мөлшері индексі: ылғалды/артық ылғалды аймақтар.",
  pri: "Физиологиялық индекс: фотосинтез стрессінің белгісі.",
  mcari: "Егіс жағдайын бағалауға арналған жапырақ хлорофилл индексі."
};


const formatISODate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const shiftIsoDate = (value, days) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + days);
  return formatISODate(date);
};

const buildWmsTimeRange = (value, daysBack = 30) => {
  const endDate = new Date(value);
  if (Number.isNaN(endDate.getTime())) return "";
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - daysBack);
  return `${formatISODate(startDate)}/${formatISODate(endDate)}/P1D`;
};

const formatKkDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("kk-KZ", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
};

const buildFallbackBoundary = (center) => {
  const [lat, lng] = center;
  return [
    [lat + 0.004, lng - 0.004],
    [lat + 0.004, lng + 0.004],
    [lat - 0.004, lng + 0.004],
    [lat - 0.004, lng - 0.004]
  ];
};

const normalizeBoundary = (rawBoundary) => {
  if (!Array.isArray(rawBoundary)) return [];
  const cleaned = rawBoundary.filter(
    (point) =>
      Array.isArray(point) &&
      point.length >= 2 &&
      Number.isFinite(point[0]) &&
      Number.isFinite(point[1])
  );
  if (!cleaned.length) return [];
  const [firstLat, firstLng] = cleaned[0];
  const [lastLat, lastLng] = cleaned[cleaned.length - 1];
  if (firstLat === lastLat && firstLng === lastLng) return cleaned;
  return [...cleaned, cleaned[0]];
};

const pointInPolygon = (point, polygon) => {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

function WmsPane() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (!map.getPane("wmsPane")) {
      const pane = map.createPane("wmsPane");
      pane.style.zIndex = "450";
    }
  }, [map]);

  return null;
}

function MaskPane() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (!map.getPane("maskPane")) {
      const pane = map.createPane("maskPane");
      pane.style.zIndex = "520";
      pane.style.pointerEvents = "none";
    }
  }, [map]);

  return null;
}

export default function IndexViewer({ field, onClose }) {
  const [activeLayer, setActiveLayer] = useState("ndvi");
  const [selectedDate, setSelectedDate] = useState("2025-06-16");
  const [legendHidden, setLegendHidden] = useState(false);
  const [useMostRecent, setUseMostRecent] = useState(false);
  const dateInputRef = useRef(null);

  const boundary = useMemo(() => {
    if (field?.polygon?.length) return field.polygon;
    if (field?.boundaryGeoJSON?.coordinates?.length) {
      return field.boundaryGeoJSON.coordinates[0].map(([lng, lat]) => [lat, lng]);
    }
    return buildFallbackBoundary(field.center);
  }, [field]);
  const normalizedBoundary = useMemo(() => normalizeBoundary(boundary), [boundary]);

  const bounds = useMemo(() => {
    const sourceBoundary = normalizedBoundary.length ? normalizedBoundary : boundary;
    const lats = sourceBoundary.map((point) => point[0]);
    const lngs = sourceBoundary.map((point) => point[1]);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs)
    };
  }, [boundary, normalizedBoundary]);
  const maskPolygon = useMemo(() => {
    const outer = [
      [90, -180],
      [90, 180],
      [-90, 180],
      [-90, -180],
      [90, -180]
    ];
    return [outer, normalizedBoundary.length ? normalizedBoundary : boundary];
  }, [boundary, normalizedBoundary]);

  const layerConfig = useMemo(
    () => indexLayers.find((layer) => layer.id === activeLayer) || indexLayers[0],
    [activeLayer]
  );

  const paletteColors = layerConfig?.palette ? palettes[layerConfig.palette] : null;
  const sentinelLayer = sentinelHubConfig.layers[activeLayer] || "";
  const isSatelliteLayer = activeLayer === "satellite";
  const useSentinel = Boolean(sentinelHubConfig.instanceId && sentinelLayer && !isSatelliteLayer);
  const envTimeRange = (import.meta.env.VITE_SENTINEL_HUB_TIME_RANGE || "").trim();
  const defaultTimeRange = buildWmsTimeRange(selectedDate, 30);
  const wmsTime = useMostRecent ? "" : envTimeRange || defaultTimeRange;

  const tiles = useMemo(() => {
    if (!paletteColors?.length || useSentinel) return [];
    const gridSize = 9;
    const latStep = (bounds.maxLat - bounds.minLat) / gridSize;
    const lngStep = (bounds.maxLng - bounds.minLng) / gridSize;
    const nextTiles = [];
    for (let i = 0; i < gridSize; i += 1) {
      for (let j = 0; j < gridSize; j += 1) {
        const latStart = bounds.minLat + i * latStep;
        const lngStart = bounds.minLng + j * lngStep;
        const latEnd = latStart + latStep;
        const lngEnd = lngStart + lngStep;
        const center = [latStart + latStep / 2, lngStart + lngStep / 2];
        if (!pointInPolygon(center, normalizedBoundary.length ? normalizedBoundary : boundary)) continue;
        const colorIndex = (i + j) % paletteColors.length;
        nextTiles.push({
          bounds: [
            [latStart, lngStart],
            [latEnd, lngEnd]
          ],
          color: paletteColors[colorIndex]
        });
      }
    }
    return nextTiles;
  }, [paletteColors, bounds, boundary, normalizedBoundary, useSentinel]);

  const dateLabel = formatKkDate(selectedDate);
  const legendVisible = paletteColors?.length && !layerConfig.hideLegend;
  const gradient = paletteColors
    ? `linear-gradient(to top, ${paletteColors.join(", ")})`
    : "none";

  return (
    <section className="fixed inset-0 z-50 flex bg-[#ece8db] text-[#1f2b24]">
      <aside className="flex w-80 flex-col border-r border-[#d2ccb8] bg-[#f8f4e8]">
        <div className="px-5 py-5">
          <p className="headline-font text-xs uppercase tracking-[0.2em] text-[#6f7868]">{UI.indexes}</p>
        </div>
        <div className="flex-1 space-y-1 px-3 pb-6">
          {indexLayers.map((layer) => {
            const isActive = layer.id === activeLayer;
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => {
                  setActiveLayer(layer.id);
                  if (layer.hideLegend) setLegendHidden(true);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-2 text-left text-sm transition ${
                  isActive
                    ? "bg-[#1f2d26] text-white"
                    : "text-[#415043] hover:bg-[#ece6d7]"
                }`}
              >
                <span>{layer.label}</span>
                {isActive && (
                  <span className="relative inline-flex items-center justify-center group">
                    <span className="cursor-help text-xs text-[#ffd89d]">?</span>
                    <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-[#d4ccb4] bg-[#fff8eb] p-2 text-[11px] leading-snug text-[#2f3b31] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      {layerHints[layer.id] || "Қабат сипаттамасы қолжетімсіз"}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="relative flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#d2ccb8] bg-[#f8f4e8]/90 px-6 py-4">
          <div>
            <p className="headline-font text-lg font-semibold text-[#1f2d26]">{field.name}</p>
            <p className="text-sm text-[#6b7367]">
              {field.areaHa} {UI.hectares} • {field.crop || UI.noCrop}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="soft-button flex items-center gap-2 rounded-full border border-[#cfc8b4] bg-white px-4 py-2 text-sm text-[#334234]"
          >
            <X size={16} />
            {UI.close}
          </button>
        </header>

        <div className="relative flex-1">
          <MapContainer
            center={field.center}
            zoom={13}
            className="h-full w-full"
            zoomControl={false}
            attributionControl={false}
            scrollWheelZoom={true}
          >
            <WmsPane />
            <MaskPane />
            <TileLayer attribution={arcgisAttribution} url={arcgisUrl} />
            {useSentinel && (
              <WMSTileLayer
                pane="wmsPane"
                key={`${sentinelLayer}-${wmsTime || "most-recent"}`}
                url={`https://services.sentinel-hub.com/ogc/wms/${sentinelHubConfig.instanceId}`}
                layers={sentinelLayer}
                format="image/png"
                transparent={true}
                version="1.1.1"
                uppercase={true}
                {...(wmsTime ? { TIME: wmsTime } : {})}
                MAXCC={sentinelHubConfig.maxcc}
                opacity={isSatelliteLayer ? 1 : 0.8}
                zIndex={450}
              />
            )}
            {useSentinel && !isSatelliteLayer && (
              <Polygon
                pane="maskPane"
                positions={maskPolygon}
                pathOptions={{
                  color: "transparent",
                  fillColor: "#0a0a0a",
                  fillOpacity: 0.55,
                  fillRule: "evenodd"
                }}
              />
            )}
            {tiles.map((tile, index) => (
              <Rectangle
                key={`${tile.color}-${index}`}
                bounds={tile.bounds}
                pathOptions={{ color: "transparent", fillColor: tile.color, fillOpacity: 0.55 }}
              />
            ))}
            <Polygon
              positions={boundary}
              pathOptions={{ color: "#22c55e", weight: 2, fillOpacity: 0 }}
            />
          </MapContainer>

          <div className="pointer-events-none absolute top-5 left-1/2 z-20 -translate-x-1/2">
            <div className="glass-panel flex items-center gap-3 rounded-full px-4 py-2 text-sm">
              <button
                type="button"
                onClick={() => setSelectedDate((prev) => shiftIsoDate(prev, -7))}
                className="pointer-events-auto rounded-full p-1 text-[#4d584d] hover:bg-[#ede7d8]"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => dateInputRef.current?.showPicker?.()}
                className="pointer-events-auto min-w-[120px] rounded-full px-3 py-1 text-center text-sm text-[#253126] hover:bg-[#ede7d8]"
              >
                {dateLabel}
              </button>
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="pointer-events-auto absolute h-0 w-0 opacity-0"
              />
              <button
                type="button"
                onClick={() => setSelectedDate((prev) => shiftIsoDate(prev, 7))}
                className="pointer-events-auto rounded-full p-1 text-[#4d584d] hover:bg-[#ede7d8]"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => setUseMostRecent((prev) => !prev)}
                className={`pointer-events-auto rounded-full px-3 py-1 text-xs ${
                  useMostRecent
                    ? "bg-[#d97832]/20 text-[#8f4518]"
                    : "bg-[#ebe6d6] text-[#5b6558]"
                }`}
              >
                {UI.last}
              </button>
            </div>
          </div>

          {legendVisible && !legendHidden && (
            <div className="glass-panel absolute bottom-6 left-6 z-20 rounded-2xl p-4 text-xs">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#6f7868]">
                {layerConfig.label}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="h-24 w-3 rounded-full"
                  style={{ backgroundImage: gradient }}
                />
                <div className="text-[#3a453a]">
                  <p>{layerConfig.max}</p>
                  <p className="mt-16">{layerConfig.min}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLegendHidden(true)}
                className="mt-3 text-[11px] text-[#6f7868] hover:text-[#3b463c]"
              >
                {UI.hideLegend}
              </button>
            </div>
          )}

          {legendVisible && legendHidden && (
            <button
              type="button"
              onClick={() => setLegendHidden(false)}
              className="glass-panel absolute bottom-6 left-6 z-20 rounded-full px-3 py-2 text-xs text-[#3f4a3f]"
            >
              {UI.showLegend}
            </button>
          )}

          <div className="absolute right-6 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
            {["+", "-", "[]"].map((label) => (
              <button
                key={label}
                type="button"
                className="glass-panel h-10 w-10 rounded-full text-sm text-[#334234]"
              >
                {label}
              </button>
            ))}
          </div>

          {!sentinelHubConfig.instanceId && (
            <div className="absolute left-6 top-6 z-20 rounded-xl border border-amber-500/40 bg-amber-100 px-4 py-3 text-xs text-amber-800">
              {UI.missingInstance}
            </div>
          )}

          {sentinelHubConfig.instanceId && !sentinelLayer && !isSatelliteLayer && (
            <div className="absolute left-6 top-6 z-20 rounded-xl border border-amber-500/40 bg-amber-100 px-4 py-3 text-xs text-amber-800">
              {UI.missingLayer.replace("{activeLayer}", activeLayer)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


