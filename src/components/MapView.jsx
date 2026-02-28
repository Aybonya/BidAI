import { Compass, Minus, Plus, Search, Sprout } from "lucide-react";
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import { useEffect, useMemo, useRef, useState } from "react";
import AIPanel from "./AIPanel.jsx";
import ChibiAssistant from "./ChibiAssistant.jsx";

const arcgisUrl =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const arcgisAttribution =
  "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

const icon = L.icon({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = icon;

function MapUpdater({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    map.setView(center, zoom ?? map.getZoom(), { animate: true, duration: 0.8 });
  }, [center, zoom, map]);

  return null;
}

function MapRefSetter({ mapRef }) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  return null;
}

function MapControls({ mapRef, homeCenter }) {
  return (
    <div className="pointer-events-auto absolute right-5 top-1/2 z-[1010] flex -translate-y-1/2 flex-col gap-2">
      <button
        type="button"
        onClick={() => mapRef.current?.zoomIn()}
        className="soft-button glass-panel flex h-11 w-11 items-center justify-center rounded-2xl text-[#28352c]"
      >
        <Plus size={18} />
      </button>
      <button
        type="button"
        onClick={() => mapRef.current?.zoomOut()}
        className="soft-button glass-panel flex h-11 w-11 items-center justify-center rounded-2xl text-[#28352c]"
      >
        <Minus size={18} />
      </button>
      <button
        type="button"
        onClick={() => {
          const map = mapRef.current;
          if (!map) return;
          map.setView(homeCenter ?? map.getCenter(), map.getZoom(), { animate: true });
        }}
        className="soft-button glass-panel flex h-11 w-11 items-center justify-center rounded-2xl text-[#28352c]"
      >
        <Compass size={18} />
      </button>
    </div>
  );
}

function DrawController({ drawMode, setDrawMode, onCreate }) {
  const map = useMap();
  const drawHandlerRef = useRef(null);

  useEffect(() => {
    if (!map) return;
    const handleCreated = (event) => onCreate(event);
    const handleStop = () => setDrawMode(false);

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on("draw:drawstop", handleStop);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off("draw:drawstop", handleStop);
    };
  }, [map, onCreate, setDrawMode]);

  useEffect(() => {
    if (!map) return;
    if (drawMode) {
      const handler = new L.Draw.Polygon(map, {
        allowIntersection: false,
        shapeOptions: { color: "#1faa67", weight: 2, fillOpacity: 0.2 }
      });
      drawHandlerRef.current = handler;
      handler.enable();
    } else if (drawHandlerRef.current) {
      drawHandlerRef.current.disable();
      drawHandlerRef.current = null;
    }
  }, [drawMode, map]);

  return null;
}

function computeCenter(latlngs) {
  const points = latlngs[0] ?? latlngs;
  const sum = points.reduce(
    (acc, point) => [acc[0] + point.lat, acc[1] + point.lng],
    [0, 0]
  );
  return [sum[0] / points.length, sum[1] / points.length];
}

export default function MapView({
  center,
  selectedField,
  fields,
  setFields,
  setSelectedField,
  drawMode,
  setDrawMode,
  onOpenAIReport
}) {
  const [draft, setDraft] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const mapRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const polygonStyle = useMemo(
    () => ({ color: "#1faa67", weight: 2, fillOpacity: 0.25 }),
    []
  );

  const draftStyle = useMemo(
    () => ({ color: "#16a34a", weight: 2, dashArray: "6 6", fillOpacity: 0.15 }),
    []
  );

  const handleCreate = (event) => {
    const layer = event.layer;
    const latlngs = layer.getLatLngs();
    layer.remove();

    const polygon = latlngs[0].map((point) => [point.lat, point.lng]);
    const fieldCenter = computeCenter(latlngs);
    const areaHa = L.GeometryUtil?.geodesicArea
      ? Math.round(L.GeometryUtil.geodesicArea(latlngs[0]) / 10000)
      : polygon.length * 5;

    setDraft({ polygon, center: fieldCenter, area: areaHa });
    setDraftName("Жаңа алқап");
    setDraftNote("");
    setDrawMode(false);
  };

  const handleSaveDraft = () => {
    if (!draft) return;
    const buildSeries = () => [
      { date: "2026-01-01", value: 0.42, rain: 8, temp: 120 },
      { date: "2026-01-15", value: 0.48, rain: 12, temp: 160 },
      { date: "2026-02-01", value: 0.53, rain: 6, temp: 210 },
      { date: "2026-02-15", value: 0.57, rain: 10, temp: 260 },
      { date: "2026-02-28", value: 0.61, rain: 7, temp: 310 },
      { date: "2026-03-15", value: 0.66, rain: 8, temp: 360 },
      { date: "2026-04-01", value: 0.7, rain: 0, temp: 410 }
    ];

    const newField = {
      id: `f${Date.now()}`,
      name: draftName.trim() || "Жаңа алқап",
      areaHa: draft.area,
      center: draft.center,
      note: draftNote.trim() || "Ескертпесіз",
      polygon: draft.polygon,
      crop: "Бидай",
      ndviSeries: buildSeries(),
      rainSeries: buildSeries(),
      tempSeries: buildSeries()
    };

    setFields((prev) => [newField, ...prev]);
    setSelectedField(newField);
    setDraft(null);
    setDraftName("");
    setDraftNote("");
  };

  const handleCancelDraft = () => {
    setDraft(null);
    setDraftName("");
    setDraftNote("");
  };

  const getZoomForPlace = (place) => {
    const type = `${place.class || ""}:${place.type || ""}`;
    if (type.includes("country")) return 5;
    if (type.includes("state") || type.includes("region")) return 7;
    if (type.includes("city") || type.includes("town")) return 11;
    return 12;
  };

  const runSearch = async (autoMove = true) => {
    const query = searchQuery.trim();
    if (!query) return;
    setSearchLoading(true);
    setSearchError("");
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&accept-language=kk&q=${encodeURIComponent(
          query
        )}`
      );
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setSearchResults(data);
      setSearchOpen(true);
      if (autoMove && data.length > 0) {
        const place = data[0];
        const lat = Number(place.lat);
        const lon = Number(place.lon);
        if (mapRef.current && !Number.isNaN(lat) && !Number.isNaN(lon)) {
          mapRef.current.setView([lat, lon], getZoomForPlace(place), { animate: true });
        }
      }
    } catch (err) {
      setSearchError("Табу мүмкін болмады. Басқа сұрауды қолданып көріңіз.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectPlace = (place) => {
    const lat = Number(place.lat);
    const lon = Number(place.lon);
    if (!mapRef.current || Number.isNaN(lat) || Number.isNaN(lon)) return;
    mapRef.current.setView([lat, lon], getZoomForPlace(place), { animate: true });
    setSearchOpen(false);
  };

  return (
    <div className="relative h-full flex-1 overflow-hidden rounded-3xl border border-[#d7d3c4]/60">
      <MapContainer
        center={center}
        zoom={14}
        className="h-full w-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer attribution={arcgisAttribution} url={arcgisUrl} />
        <MapRefSetter mapRef={mapRef} />
        <MapUpdater center={selectedField?.center ?? center} zoom={14} />
        <DrawController drawMode={drawMode} setDrawMode={setDrawMode} onCreate={handleCreate} />

        {draft && (
          <Polygon positions={draft.polygon} pathOptions={draftStyle} />
        )}

        {fields.map((field) => (
          <Polygon key={field.id} positions={field.polygon} pathOptions={polygonStyle}>
            <Tooltip sticky direction="top" opacity={0.9}>
              <div className="text-xs">
                <div className="font-semibold text-slate-800">{field.name}</div>
                <div className="text-slate-600">{field.note}</div>
              </div>
            </Tooltip>
          </Polygon>
        ))}
      </MapContainer>

      <div className="pointer-events-auto absolute left-6 top-6 z-[1010] flex items-center gap-3">
        <div className="glass-panel flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#334034]">
          <Sprout size={16} className="text-[#d97832]" />
          Дақыл
        </div>
        <button
          type="button"
          className="soft-button glass-panel rounded-full px-3 py-2 text-sm text-[#455147]"
        >
          Жаздық бидай ▾
        </button>
      </div>

      <div className="pointer-events-auto absolute right-6 top-6 z-[1010]">
        <div className="relative z-[1020]">
          <div className="glass-panel flex items-center gap-2 rounded-full px-4 py-2 text-sm text-[#4b5548]">
            <Search size={16} className="text-[#7f8879]" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runSearch(true);
              }}
              onFocus={() => searchResults.length && setSearchOpen(true)}
              className="w-44 bg-transparent text-sm text-[#2e382f] focus:outline-none"
              placeholder="Қала, ел іздеу"
            />
            <button
              type="button"
              onClick={() => runSearch(true)}
              className="rounded-full bg-[#1d2b23] px-3 py-1 text-xs font-semibold text-white"
            >
              {searchLoading ? "..." : "Табу"}
            </button>
          </div>
          {searchOpen && (searchResults.length > 0 || searchError) && (
            <div className="glass-panel absolute right-0 z-[1030] mt-2 w-80 rounded-2xl p-2">
              {searchError && (
                <div className="px-3 py-2 text-xs text-rose-500">{searchError}</div>
              )}
              {searchResults.map((place) => (
                <button
                  key={place.place_id}
                  type="button"
                  onClick={() => handleSelectPlace(place)}
                  className="w-full rounded-xl px-3 py-2 text-left text-xs text-[#364135] hover:bg-[#eef2e5]"
                >
                  {place.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-6 right-6 z-[1010]">
        <AIPanel fields={fields} onOpenReport={onOpenAIReport} />
      </div>

      <ChibiAssistant fields={fields} selectedField={selectedField} position="map-left" />

      <MapControls mapRef={mapRef} homeCenter={center} />

      {draft && (
        <div className="glass-panel pointer-events-auto absolute bottom-6 left-6 z-20 w-96 rounded-3xl p-5">
          <p className="headline-font text-base font-semibold text-[#1f2d24]">Жаңа алқап</p>
          <p className="mt-1 text-xs text-[#657060]">Ауданы: {draft.area} га</p>
          <div className="mt-3">
            <label className="text-xs text-[#5f695b]">Атауы</label>
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#d8d3c3] bg-white px-3 py-2 text-sm text-[#2a362c] focus:outline-none"
              placeholder="Алқап атауы"
            />
          </div>
          <div className="mt-3">
            <label className="text-xs text-[#5f695b]">Ескерту</label>
            <textarea
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-[#d8d3c3] bg-white px-3 py-2 text-sm text-[#2a362c] focus:outline-none"
              placeholder="Ескерту қосыңыз"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="soft-button flex-1 rounded-full bg-[#d97832] px-4 py-2 text-sm font-semibold text-white"
            >
              Сақтау
            </button>
            <button
              type="button"
              onClick={handleCancelDraft}
              className="flex-1 rounded-full border border-[#c9c4b4] bg-[#f6f2e7] px-4 py-2 text-sm font-semibold text-[#4f594b]"
            >
              Болдырмау
            </button>
          </div>
        </div>
      )}

      <div className="glass-panel absolute bottom-4 left-4 z-10 rounded-full px-3 py-1 text-[10px] text-[#596353]">
        {drawMode
          ? "Сызу: картаға басыңыз, қос шерту — аяқтау"
          : draft
            ? "Деректерді толтырып, алқапты сақтаңыз"
            : selectedField
              ? `Алқап: ${selectedField.name}`
              : "Алқапты таңдаңыз"}
      </div>
    </div>
  );
}
