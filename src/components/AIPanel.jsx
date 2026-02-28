import { Maximize2, Minimize2, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getLatestAndPrevious = (series) => {
  if (!Array.isArray(series) || !series.length) return { latest: null, previous: null };
  const sorted = [...series]
    .filter((item) => item && parseDate(item.date))
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));
  if (!sorted.length) return { latest: null, previous: null };
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2] || null;
  return { latest, previous };
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const periodOptions = [
  { id: "30d", label: "30 күн", days: 30 },
  { id: "90d", label: "90 күн", days: 90 },
  { id: "all", label: "Бүкіл кезең", days: null }
];

const getLatestDateFromField = (field) => {
  const sources = [field?.ndviSeries, field?.rainSeries, field?.tempSeries];
  let latest = null;
  for (const series of sources) {
    for (const item of series || []) {
      const parsed = parseDate(item?.date);
      if (!parsed) continue;
      if (!latest || parsed > latest) latest = parsed;
    }
  }
  return latest;
};

const filterSeriesByDays = (series, days, latestDate) => {
  if (!Array.isArray(series) || !series.length) return [];
  if (!days || !latestDate) return series;
  const start = new Date(latestDate);
  start.setDate(start.getDate() - days);
  return series.filter((item) => {
    const parsed = parseDate(item?.date);
    return parsed && parsed >= start && parsed <= latestDate;
  });
};

const applyPeriodToFields = (fields, days) =>
  (fields || []).map((field) => {
    const latestDate = getLatestDateFromField(field);
    return {
      ...field,
      ndviSeries: filterSeriesByDays(field.ndviSeries, days, latestDate),
      rainSeries: filterSeriesByDays(field.rainSeries, days, latestDate),
      tempSeries: filterSeriesByDays(field.tempSeries, days, latestDate)
    };
  });

const buildSeasonLabel = (startDate, fallback = "Season") => {
  const parsed = parseDate(startDate);
  if (!parsed) return fallback;
  return `Маусым ${parsed.getFullYear()}`;
};

const runHeuristicAnalysis = (fields) => {
  if (!Array.isArray(fields) || !fields.length) {
    return {
      available: false,
      summary: "Талдау үшін алқап жоқ. Алдымен кемінде бір алқап қосыңыз.",
      recommendations: ["Алқапты сызыңыз немесе импорттаңыз", "Контекст үшін ескерту қосыңыз"],
      yieldForecast: null,
      stressLabel: "Дерек жоқ",
      stressPct: 0,
      confidencePct: 0,
      trendUp: true
    };
  }

  let ndviSum = 0;
  let trendSum = 0;
  let rainSum = 0;
  let tempSum = 0;
  let count = 0;

  for (const field of fields) {
    const { latest, previous } = getLatestAndPrevious(field.ndviSeries || []);
    if (!latest) continue;

    const latestNdvi = Number(latest.value) || 0;
    const previousNdvi = previous ? Number(previous.value) || latestNdvi : latestNdvi;
    const latestRain = Number(latest.rain) || 0;
    const latestTemp = Number(latest.temp) || 0;

    ndviSum += latestNdvi;
    trendSum += latestNdvi - previousNdvi;
    rainSum += latestRain;
    tempSum += latestTemp;
    count += 1;
  }

  if (!count) {
    return {
      available: false,
      summary: "Есептеу үшін NDVI уақыттық деректері жеткіліксіз.",
      recommendations: ["Кемінде 2 күнге индекс тарихын қосыңыз"],
      yieldForecast: null,
      stressLabel: "Дерек жоқ",
      stressPct: 0,
      confidencePct: 0,
      trendUp: true
    };
  }

  const ndviAvg = ndviSum / count;
  const ndviTrend = trendSum / count;
  const rainAvg = rainSum / count;
  const tempAvg = tempSum / count;

  let stressScore = 55;
  stressScore -= ndviAvg * 40;
  stressScore -= ndviTrend * 120;
  stressScore += clamp((20 - rainAvg) * 0.9, -10, 20);
  stressScore += clamp((tempAvg - 260) * 0.05, -8, 12);
  stressScore = clamp(stressScore, 5, 95);

  const stressLabel = stressScore < 30 ? "Төмен" : stressScore < 55 ? "Орташа" : "Жоғары";

  const yieldForecast = clamp(2.4 + ndviAvg * 4.6 + ndviTrend * 2.2, 1.5, 8.2);
  const confidencePct = clamp(55 + count * 7, 55, 92);

  const recommendations = [];
  if (ndviTrend < -0.02) recommendations.push("Соңғы күндердегі NDVI төмендеген аймақтарды тексеру");
  if (rainAvg < 8) recommendations.push("Ылғалмен қамту мен суару кестесін бағалау");
  if (tempAvg > 300) recommendations.push("Түскі уақытта жылу стрессін бақылау");
  if (!recommendations.length) recommendations.push("Жағдай тұрақты, мониторингті кесте бойынша жалғастырыңыз");

  const summary =
    stressScore < 35
      ? "Егіс тұрақты күйде, деректер бойынша сыни аймақтар анықталмады."
      : "Алқаптардың бір бөлігінде стресс белгілері бар, проблемалы аймақтарды нүктелік тексеру қажет.";

  return {
    available: true,
    summary,
    recommendations,
    yieldForecast,
    stressLabel,
    stressPct: Math.round(stressScore),
    confidencePct: Math.round(confidencePct),
    trendUp: ndviTrend >= 0
  };
};

export default function AIPanel({ fields = [], onOpenReport }) {
  const [collapsed, setCollapsed] = useState(false);
  const [targetMode, setTargetMode] = useState("all");
  const [targetFieldId, setTargetFieldId] = useState(() => fields[0]?.id || "");
  const [periodId, setPeriodId] = useState("90d");
  const [compareSeasons, setCompareSeasons] = useState(false);
  const [seasonAStart, setSeasonAStart] = useState("2022-06-01");
  const [seasonAEnd, setSeasonAEnd] = useState("2022-09-01");
  const [seasonBStart, setSeasonBStart] = useState("2023-06-01");
  const [seasonBEnd, setSeasonBEnd] = useState("2023-09-01");
  const [loading, setLoading] = useState(false);
  const [lastRunAt, setLastRunAt] = useState(null);
  const [analysis, setAnalysis] = useState(() => runHeuristicAnalysis(fields));

  const availableFields = useMemo(() => fields.filter((field) => field?.id), [fields]);
  const analysisFields = useMemo(() => {
    if (targetMode === "one") {
      const selected = availableFields.find((field) => field.id === targetFieldId);
      return selected ? [selected] : [];
    }
    return availableFields;
  }, [availableFields, targetFieldId, targetMode]);

  const selectedPeriod = useMemo(
    () => periodOptions.find((item) => item.id === periodId) || periodOptions[1],
    [periodId]
  );

  const analysisFieldsInPeriod = useMemo(
    () => applyPeriodToFields(analysisFields, selectedPeriod.days),
    [analysisFields, selectedPeriod.days]
  );

  const runLabel = useMemo(() => {
    if (!lastRunAt) return "Талдау әлі іске қосылған жоқ";
    return `Жаңартылды: ${new Intl.DateTimeFormat("kk-KZ", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short"
    }).format(lastRunAt)}`;
  }, [lastRunAt]);

  useEffect(() => {
    if (!availableFields.length) {
      setTargetFieldId("");
      return;
    }
    if (!targetFieldId || !availableFields.some((field) => field.id === targetFieldId)) {
      setTargetFieldId(availableFields[0].id);
    }
  }, [availableFields, targetFieldId]);

  const handleRun = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    const snapshot = runHeuristicAnalysis(analysisFieldsInPeriod);
    setAnalysis(snapshot);
    setLastRunAt(new Date());

    if (onOpenReport) {
      onOpenReport({
        reportType: compareSeasons ? "seasonCompare" : "fieldReport",
        mode: targetMode,
        fieldId: targetFieldId,
        periodId,
        periodLabel: selectedPeriod.label,
        fields: analysisFieldsInPeriod,
        snapshot,
        compare: compareSeasons
          ? {
              seasonA: {
                label: buildSeasonLabel(seasonAStart, "Маусым A"),
                startDate: seasonAStart,
                endDate: seasonAEnd
              },
              seasonB: {
                label: buildSeasonLabel(seasonBStart, "Маусым B"),
                startDate: seasonBStart,
                endDate: seasonBEnd
              }
            }
          : null
      });
    }

    setLoading(false);
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="glass-panel flex items-center gap-2 rounded-full border border-[#d7cfb8] bg-[#f6f2e7] px-4 py-2 text-sm font-semibold text-[#2a362b] shadow-lg"
      >
        <Sparkles size={16} className="text-[#4c7a2d]" />
        AI-талдау
        <Maximize2 size={14} className="text-[#6f7a66]" />
      </button>
    );
  }

  return (
    <div className="glass-panel w-80 rounded-3xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#7b836f]">AI Болжам</p>
          <p className="headline-font mt-1 text-3xl font-semibold text-[#203024]">
            {analysis.yieldForecast === null ? "—" : `${analysis.yieldForecast.toFixed(1)} т/га`}
          </p>
          <p className="mt-1 text-[11px] text-[#778071]">{runLabel}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e9f1df] text-[#4c7a2d]">
          <Sparkles size={18} />
        </div>
      </div>

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="inline-flex items-center gap-1 rounded-full border border-[#d7cfb8] bg-[#f6f2e7] px-2.5 py-1 text-[11px] font-semibold text-[#4d584a]"
        >
          Жасыру
          <Minimize2 size={12} />
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-[#d8d4c6] bg-[#f6f2e7] px-3 py-2">
        <p className="text-xs text-[#7a846f]">Егіс стрессі</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#2d3a2f]">{analysis.stressLabel}</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#dceac8] px-2 py-1 text-xs font-semibold text-[#406a2a]">
            {analysis.trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {analysis.stressPct}%
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-[#5f675a]">{analysis.summary}</p>
      </div>

      <div className="mt-3 rounded-2xl border border-[#d8d4c6] bg-white/70 p-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#79826f]">Талдау аумағы</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setTargetMode("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              targetMode === "all" ? "bg-[#1f2d26] text-white" : "bg-[#ece8dc] text-[#546052]"
            }`}
          >
            Барлық алқап
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetMode("one");
              if (!targetFieldId) setTargetFieldId(availableFields[0]?.id || "");
            }}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              targetMode === "one" ? "bg-[#1f2d26] text-white" : "bg-[#ece8dc] text-[#546052]"
            }`}
          >
            Бір алқап
          </button>
        </div>

        {targetMode === "one" && (
          <select
            value={targetFieldId}
            onChange={(event) => setTargetFieldId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[#d4cfbf] bg-white px-3 py-2 text-xs text-[#2e382f] focus:outline-none"
          >
            {availableFields.length === 0 && <option value="">Алқап жоқ</option>}
            {availableFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
        )}

        <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#79826f]">Кезең</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {periodOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriodId(item.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                periodId === item.id ? "bg-[#d97832] text-white" : "bg-[#ece8dc] text-[#546052]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-[#d9d3c1] bg-[#f8f4e9] p-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-[#405040]">
            <input
              type="checkbox"
              checked={compareSeasons}
              onChange={(event) => setCompareSeasons(event.target.checked)}
            />
            Маусымдарды салыстыру
          </label>
          {compareSeasons && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="mb-1 text-[#6b7568]">Маусым A</p>
                <input
                  type="date"
                  value={seasonAStart}
                  onChange={(event) => setSeasonAStart(event.target.value)}
                  className="w-full rounded-lg border border-[#d3ccb8] bg-white px-2 py-1"
                />
                <input
                  type="date"
                  value={seasonAEnd}
                  onChange={(event) => setSeasonAEnd(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#d3ccb8] bg-white px-2 py-1"
                />
              </div>
              <div>
                <p className="mb-1 text-[#6b7568]">Маусым B</p>
                <input
                  type="date"
                  value={seasonBStart}
                  onChange={(event) => setSeasonBStart(event.target.value)}
                  className="w-full rounded-lg border border-[#d3ccb8] bg-white px-2 py-1"
                />
                <input
                  type="date"
                  value={seasonBEnd}
                  onChange={(event) => setSeasonBEnd(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#d3ccb8] bg-white px-2 py-1"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-[#d8d4c6] bg-white/70 p-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#79826f]">
          Ұсынымдар ({analysis.confidencePct}% сенімділік)
        </p>
        <ul className="mt-2 space-y-1 text-xs text-[#384336]">
          {analysis.recommendations.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={handleRun}
        disabled={loading || analysisFieldsInPeriod.length === 0}
        className="soft-button mt-4 w-full rounded-full bg-[#1d2b23] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Талдап жатырмыз..." : "AI-талдауды бастау"}
      </button>
    </div>
  );
}
