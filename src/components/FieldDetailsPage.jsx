import { ChevronDown, Trash2, X } from "lucide-react";
import { MapContainer, Polygon, TileLayer } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import Tabs from "./Tabs.jsx";
import { NdviChart, RainChart, TempSumChart } from "./Charts.jsx";
import WeatherModal from "./WeatherModal.jsx";
import PeriodSelector from "./PeriodSelector.jsx";

const arcgisUrl =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const arcgisAttribution =
  "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

const tabs = [
  "Күйі",
  "Алқап есебі",
  "Тапсырма карталары",
  "Деректер",
  "Өнімділік талдауы"
];

const mockWeather = {
  current: {
    tempC: -18,
    precipitationMm: 0,
    windMs: 2,
    cloudPct: 75,
    humidityPct: 65,
    dewPointC: -19
  },
  hourlyBars: [
    [3, 6, 5, 8, 7, 4, 6],
    [0, 2, 1, 3, 2, 1, 0],
    [2, 3, 4, 6, 3, 2, 1],
    [6, 5, 7, 8, 6, 5, 4],
    [4, 6, 5, 6, 7, 4, 3],
    [1, 2, 3, 2, 3, 2, 1]
  ],
  dailyForecast: [
    {
      label: "Бүгін",
      date: "28 ақп.",
      iconType: "cloud",
      tempMin: -22,
      tempMax: -12,
      precipMm: 0,
      windMs: 2,
      cloudPct: 75,
      humidityPct: 65,
      dewPointC: -19
    },
    {
      label: "ЖС",
      date: "29 ақп.",
      iconType: "snow",
      tempMin: -21,
      tempMax: -10,
      precipMm: 2,
      windMs: 3,
      cloudPct: 60,
      humidityPct: 70,
      dewPointC: -18
    },
    {
      label: "ДС",
      date: "1 нау.",
      iconType: "cloud",
      tempMin: -20,
      tempMax: -9,
      precipMm: 1,
      windMs: 4,
      cloudPct: 55,
      humidityPct: 62,
      dewPointC: -17
    },
    {
      label: "СС",
      date: "2 нау.",
      iconType: "rain",
      tempMin: -15,
      tempMax: -5,
      precipMm: 4,
      windMs: 5,
      cloudPct: 68,
      humidityPct: 74,
      dewPointC: -12
    },
    {
      label: "СРС",
      date: "3 нау.",
      iconType: "cloud",
      tempMin: -16,
      tempMax: -6,
      precipMm: 0,
      windMs: 3,
      cloudPct: 50,
      humidityPct: 58,
      dewPointC: -13
    },
    {
      label: "БС",
      date: "4 нау.",
      iconType: "snow",
      tempMin: -18,
      tempMax: -8,
      precipMm: 2,
      windMs: 4,
      cloudPct: 72,
      humidityPct: 66,
      dewPointC: -15
    }
  ]
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getSeasonRange = (baseDate) => {
  const year = baseDate.getFullYear() - 1;
  const start = new Date(year, 4, 1);
  const end = new Date(year, 8, 30);
  return { start, end };
};

const clampToSeason = (date, season) => {
  if (date < season.start) return season.start;
  if (date > season.end) return season.end;
  return date;
};

const parseDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

function buildFallbackBoundary(center) {
  const [lat, lng] = center;
  return [
    [lat + 0.004, lng - 0.004],
    [lat + 0.004, lng + 0.004],
    [lat - 0.004, lng + 0.004],
    [lat - 0.004, lng - 0.004]
  ];
}

function MapPanel({ title, center, boundary, overlayColor }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
      <p className="text-sm font-semibold text-[#2b352d]">{title}</p>
      <div className="mt-3 h-56 w-full overflow-hidden rounded-xl">
        <MapContainer
          center={center}
          zoom={14}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={false}
        >
          <TileLayer attribution={arcgisAttribution} url={arcgisUrl} />
          <Polygon positions={boundary} pathOptions={{ color: "#1faa67", weight: 2 }} />
          {overlayColor && (
            <Polygon
              positions={boundary}
              pathOptions={{ color: overlayColor, fillOpacity: 0.35, weight: 0 }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}

export default function FieldDetailsPage({ field, onClose, onOpenIndexViewer, onDeleteField }) {
  const [activeTab, setActiveTab] = useState("Күйі");
  const season = useMemo(() => getSeasonRange(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(() =>
    formatDate(clampToSeason(new Date(), season))
  );
  const [cropName, setCropName] = useState(field.crop || "");
  const [sowingDate, setSowingDate] = useState(formatDate(season.start));
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [seasonStats, setSeasonStats] = useState({
    tempMaxAvg: null,
    tempMinAvg: null
  });
  const [weather, setWeather] = useState({
    loading: true,
    error: "",
    currentTemp: null,
    currentSummary: "",
    todayPrecip: null,
    accumulatedPrecip: null
  });
  const [dateRange, setDateRange] = useState({
    start: new Date(2026, 0, 1),
    end: new Date(2026, 1, 28)
  });

  const boundary = useMemo(() => {
    if (field?.polygon?.length) return field.polygon;
    if (field?.boundaryGeoJSON?.coordinates?.length) {
      return field.boundaryGeoJSON.coordinates[0].map(([lng, lat]) => [lat, lng]);
    }
    return buildFallbackBoundary(field.center);
  }, [field]);

  const latestSeriesDate = useMemo(() => {
    const dates = (field.ndviSeries || []).map((item) => parseDate(item.date)).filter(Boolean);
    if (!dates.length) return null;
    return new Date(Math.max(...dates.map((d) => d.getTime())));
  }, [field]);

  const filteredNdvi = useMemo(() => {
    const start = formatDate(dateRange.start);
    const end = formatDate(dateRange.end);
    return (field.ndviSeries || []).filter((item) => item.date >= start && item.date <= end);
  }, [field, dateRange]);

  const filteredRain = useMemo(() => {
    const start = formatDate(dateRange.start);
    const end = formatDate(dateRange.end);
    return (field.rainSeries || []).filter((item) => item.date >= start && item.date <= end);
  }, [field, dateRange]);

  const filteredTemp = useMemo(() => {
    const start = formatDate(dateRange.start);
    const end = formatDate(dateRange.end);
    return (field.tempSeries || []).filter((item) => item.date >= start && item.date <= end);
  }, [field, dateRange]);

  useEffect(() => {
    setCropName(field.crop || "");
    setSowingDate(formatDate(season.start));
  }, [field, season]);

  useEffect(() => {
    if (!field?.center) return;

    const [lat, lon] = field.center;
    const seasonStart = season.start;
    const seasonEnd = season.end;
    const selected = clampToSeason(new Date(selectedDate), season);
    const selectedStr = formatDate(selected);
    const seasonStartStr = formatDate(seasonStart);
    const seasonEndStr = formatDate(seasonEnd);

    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    const seasonHistoryUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${seasonStartStr}&end_date=${seasonEndStr}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const dayHistoryUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${selectedStr}&end_date=${selectedStr}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=auto`;

    let cancelled = false;

    const loadWeather = async () => {
      setWeather((prev) => ({ ...prev, loading: true, error: "" }));
      try {
        const [forecastRes, seasonRes, dayRes] = await Promise.all([
          fetch(forecastUrl),
          fetch(seasonHistoryUrl),
          fetch(dayHistoryUrl)
        ]);
        if (!forecastRes.ok || !seasonRes.ok || !dayRes.ok) throw new Error("weather");

        const forecastData = await forecastRes.json();
        const seasonData = await seasonRes.json();
        const dayData = await dayRes.json();

        if (cancelled) return;

        const todayPrecip = dayData?.daily?.precipitation_sum?.[0] ?? null;
        const precipSeries = seasonData?.daily?.precipitation_sum || [];
        const maxSeries = seasonData?.daily?.temperature_2m_max || [];
        const minSeries = seasonData?.daily?.temperature_2m_min || [];
        const accumulatedPrecip = precipSeries.reduce(
          (sum, value) => sum + (Number(value) || 0),
          0
        );
        const tempMaxAvg = maxSeries.length
          ? maxSeries.reduce((sum, value) => sum + (Number(value) || 0), 0) / maxSeries.length
          : null;
        const tempMinAvg = minSeries.length
          ? minSeries.reduce((sum, value) => sum + (Number(value) || 0), 0) / minSeries.length
          : null;

        setWeather({
          loading: false,
          error: "",
          currentTemp: forecastData?.current_weather?.temperature ?? null,
          currentSummary: "Қазір",
          todayPrecip,
          accumulatedPrecip: Math.round(accumulatedPrecip)
        });
        setSeasonStats({
          tempMaxAvg: tempMaxAvg === null ? null : Math.round(tempMaxAvg),
          tempMinAvg: tempMinAvg === null ? null : Math.round(tempMinAvg)
        });
      } catch (err) {
        if (cancelled) return;
        setWeather((prev) => ({
          ...prev,
          loading: false,
          error: "Ауа райын жүктеу мүмкін болмады"
        }));
        setSeasonStats({ tempMaxAvg: null, tempMinAvg: null });
      }
    };

    loadWeather();

    return () => {
      cancelled = true;
    };
  }, [field, selectedDate, season]);

  return (
    <section className="flex-1 h-full overflow-y-auto bg-transparent">
      <div className="mx-auto max-w-7xl px-8 py-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="headline-font text-3xl font-semibold text-[#1e2a22]">{field.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#5f695b]">
              <span className="rounded-full border border-[#d8d3c4] bg-[#f7f3e8] px-3 py-1">{field.areaHa} га</span>
              <span className="rounded-full bg-[#d97832]/15 px-3 py-1 text-[#9f4f16]">
                {field.crop}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDeleteField?.(field.id)}
              className="soft-button inline-flex items-center gap-2 rounded-full border border-[#e3c4b3] bg-[#fff0e8] px-3 py-2 text-xs font-semibold text-[#a44d1e]"
            >
              <Trash2 size={14} />
              Алқапты жою
            </button>
            <button
              type="button"
              onClick={onClose}
              className="soft-button glass-panel h-10 w-10 rounded-full text-[#4f5a4e]"
            >
              <X size={18} className="mx-auto" />
            </button>
          </div>
        </div>

        <div className="mt-6">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="glass-panel rounded-2xl p-4">
            <p className="text-xs text-[#6f7767]">Дақыл</p>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={cropName}
                onChange={(event) => setCropName(event.target.value)}
                className="w-full rounded-xl border border-[#d6d1c1] bg-white px-3 py-2 text-sm text-[#2b362d] focus:outline-none"
                placeholder="Дақыл атауын енгізіңіз"
              />
              <ChevronDown size={16} className="text-slate-400" />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Қате болса өзгертуге болады</p>
          </div>
          <div className="glass-panel rounded-2xl p-4">
            <p className="text-xs text-[#6f7767]">Себу күні</p>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="date"
                min={formatDate(season.start)}
                max={formatDate(season.end)}
                value={sowingDate}
                onChange={(event) => {
                  const next = clampToSeason(new Date(event.target.value), season);
                  setSowingDate(formatDate(next));
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <button
                type="button"
                className="soft-button rounded-full bg-[#d97832] px-3 py-2 text-xs font-semibold text-white"
              >
                Қосу
              </button>
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-4">
            <button
              type="button"
              onClick={() => setWeatherOpen(true)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <p className="text-xs text-[#6f7767]">Ауа райы</p>
                <div className="mt-2 flex items-center gap-4">
                  <p className="headline-font text-2xl font-semibold text-[#213024]">
                    {weather.loading || weather.currentTemp === null
                      ? "—"
                      : `${Math.round(weather.currentTemp)}°C`}
                  </p>
                  <p className="text-xs text-[#6f7767]">
                    {weather.loading ? "Жүктелуде..." : weather.currentSummary || "—"}
                  </p>
                </div>
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </button>
            {weather.error && <p className="mt-2 text-xs text-rose-500">{weather.error}</p>}
          </div>
        </div>

        {activeTab === "Күйі" && (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-3">
                <MapPanel
                  title="NDVI, 26 ақп. 2026"
                  center={field.center}
                  boundary={boundary}
                  overlayColor="#16a34a"
                />
                <button
                  type="button"
                  onClick={() => onOpenIndexViewer?.()}
                  className="soft-button inline-flex items-center justify-center rounded-xl border border-[#d3cdbb] bg-white px-4 py-2 text-sm font-semibold text-[#2c372d]"
                >
                  Индекстерді ашу
                </button>
              </div>
              <MapPanel
                title="Спутниктік сурет, 26 ақп. 2026"
                center={field.center}
                boundary={boundary}
                overlayColor={null}
              />
            </div>

            <div className="mt-6 flex items-center justify-end">
              <PeriodSelector
                dateRange={dateRange}
                onApply={setDateRange}
                latestDate={latestSeriesDate}
                seasonStart={season.start}
                seasonEnd={season.end}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <NdviChart data={filteredNdvi} />
              <RainChart data={filteredRain} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TempSumChart data={filteredTemp} />
              <div className="glass-panel rounded-2xl p-4">
                <p className="text-sm font-semibold text-[#2b352d]">Жиналған жауын-шашын</p>
                <p className="headline-font mt-2 text-3xl font-semibold text-[#213024]">
                  {weather.loading || weather.accumulatedPrecip === null
                    ? "—"
                    : `${weather.accumulatedPrecip} мм`}
                </p>
                <p className="mt-1 text-xs text-[#6f7767]">Маусым бойы мамыр–қыркүйек</p>
              </div>
            </div>
          </>
        )}

        {activeTab !== "Күйі" && (
          <div className="glass-panel mt-6 rounded-2xl p-6">
            <h3 className="headline-font text-lg font-semibold text-[#243126]">{activeTab}</h3>
            <p className="mt-2 text-sm text-[#5d675a]">Бұл функция әлі іске асырылмаған.</p>
          </div>
        )}
      </div>

      <WeatherModal
        open={weatherOpen}
        onClose={() => setWeatherOpen(false)}
        field={field}
        weather={mockWeather}
      />
    </section>
  );
}


