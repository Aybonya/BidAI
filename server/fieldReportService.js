import Ajv from "ajv";
import { fieldReportSchema } from "./fieldReportSchema.js";

const ajv = new Ajv({ allErrors: true, strict: false });
const validateReport = ajv.compile(fieldReportSchema);

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const slope = (arr) => {
  const values = arr.map((v) => Number(v)).filter(Number.isFinite);
  const n = values.length;
  if (n < 2) return 0;
  const sx = ((n - 1) * n) / 2;
  const sy = values.reduce((s, v) => s + v, 0);
  const sxy = values.reduce((s, v, i) => s + i * v, 0);
  const sx2 = values.reduce((s, _v, i) => s + i * i, 0);
  const d = n * sx2 - sx * sx;
  return d ? (n * sxy - sx * sy) / d : 0;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const parseDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const sortByDate = (rows) =>
  [...rows]
    .filter((r) => parseDate(r.date))
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

export const buildStats = ({ indicesTimeseries = [], weatherTimeseries = [], period }) => {
  const idx = sortByDate(indicesTimeseries);
  const weather = sortByDate(weatherTimeseries);

  const ndvi = idx.map((r) => toNum(r.NDVI_mean));
  const ndmi = idx.map((r) => toNum(r.NDMI_mean));
  const ndre = idx.map((r) => toNum(r.NDRE_mean));
  const reci = idx.map((r) => toNum(r.RECI_mean));

  const ndviLatest = ndvi[ndvi.length - 1] ?? 0;
  const ndviPrev = ndvi[ndvi.length - 2] ?? ndviLatest;
  const ndviMedian = ndvi.length ? [...ndvi].sort((a, b) => a - b)[Math.floor(ndvi.length / 2)] : 0;

  const rain = weather.map((r) => toNum(r.precipMm));
  const tempAvg = weather.map((r) => toNum(r.tempAvgC));
  const tempMax = weather.map((r) => toNum(r.tempMaxC));

  const rainSum = rain.reduce((s, v) => s + v, 0);
  const heatDays = tempMax.filter((v) => v >= 30).length;

  const dates = [...idx.map((r) => r.date), ...weather.map((r) => r.date)].filter(Boolean).map(parseDate).filter(Boolean);
  const minDate = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date();
  const maxDate = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date();
  const periodDays = period?.startDate && period?.endDate
    ? Math.max(1, Math.round((parseDate(period.endDate) - parseDate(period.startDate)) / 86400000) + 1)
    : Math.max(1, Math.round((maxDate - minDate) / 86400000) + 1);

  const uniqueDays = new Set([...idx.map((r) => r.date), ...weather.map((r) => r.date)]).size;
  const missingDays = Math.max(0, periodDays - uniqueDays);
  const completeness = clamp(((periodDays - missingDays) / periodDays) * 100, 0, 100);

  const volatility = idx.length
    ? mean(idx.map((r) => Math.abs(toNum(r.NDVI_p90, ndviLatest) - toNum(r.NDVI_p10, ndviLatest))))
    : 0;

  let anomalyAreaPct = toNum(idx[idx.length - 1]?.anomalyAreaPct, 0);
  if (!anomalyAreaPct) anomalyAreaPct = clamp(volatility * 220, 2, 45);

  const ndviDrop = ndviMedian > 0 ? ((ndviMedian - ndviLatest) / ndviMedian) * 100 : 0;

  const stressScorePct = clamp(
    30 + clamp(ndviDrop, 0, 35) * 0.9 + clamp((0.2 - mean(ndmi)) * 120, 0, 30) + clamp((0.15 - mean(ndre)) * 180, 0, 20),
    5,
    95
  );

  const trend = ndviLatest - ndviPrev;
  const trendLabel = trend > 0.01 ? "жақсару" : trend < -0.01 ? "нашарлау" : "тұрақты";
  const potentialYieldLossPct = clamp(stressScorePct * 0.55 + (trend < 0 ? 8 : 0), 1, 65);

  const predictedYieldTpha = clamp(2.2 + ndviLatest * 5.5 - potentialYieldLossPct * 0.03, 1.2, 8.5);

  return {
    periodDays,
    ndviLatest,
    ndviMedian,
    ndviPrev,
    ndviDrop,
    ndmiMean: mean(ndmi),
    ndreMean: mean(ndre),
    reciMean: mean(reci),
    ndviSlope: slope(ndvi),
    ndmiSlope: slope(ndmi),
    ndreSlope: slope(ndre),
    rainSum,
    tempAvgMean: mean(tempAvg),
    heatDays,
    completeness,
    missingDays,
    anomalyAreaPct,
    stressScorePct,
    potentialYieldLossPct,
    predictedYieldTpha,
    trendLabel,
    dateRange: {
      startDate: period?.startDate || minDate.toISOString().slice(0, 10),
      endDate: period?.endDate || maxDate.toISOString().slice(0, 10)
    }
  };
};

export const buildFallbackReport = ({ field, stats, pricePerTon = 220 }) => {
  const areaHa = toNum(field?.areaHa, 0);
  const yieldLossTpha = stats.predictedYieldTpha * (stats.potentialYieldLossPct / 100);
  const potentialRevenueLossUsd = clamp(areaHa * yieldLossTpha * toNum(pricePerTon, 220), 0, 1_000_000_000);

  const severity = stats.stressScorePct >= 60 ? "high" : stats.stressScorePct >= 35 ? "medium" : "low";

  return {
    meta: {
      fieldId: String(field?.id || "unknown"),
      cropType: String(field?.cropType || "Көрсетілмеген"),
      periodDays: stats.periodDays,
      generatedAt: new Date().toISOString(),
      modelConfidencePct: Math.round(clamp(stats.completeness * 0.8 + 20, 25, 92))
    },
    executiveSummary:
      severity === "low"
        ? "Индекс және ауа райы сигналдары жалпы тұрақты, сыни ауытқулар байқалмады."
        : "Агро-стресс белгілері бар. Жақын күндері проблемалы аймақтарды басымдықпен тексеріп, нүктелік әрекет қажет.",
    keyFindings: [
      {
        type: "stress",
        label: "Орташа стресс деңгейі",
        value: Math.round(stats.stressScorePct),
        unit: "%",
        severity
      },
      {
        type: "yield",
        label: "Болжамды өнім",
        value: Number(stats.predictedYieldTpha.toFixed(2)),
        unit: "т/га"
      },
      {
        type: "trend",
        label: "Үрдіс",
        valueText: stats.trendLabel
      }
    ],
    risks: [
      {
        id: stats.ndmiMean < 0.12 ? "moisture_deficit" : "other",
        title: stats.ndmiMean < 0.12 ? "Ылғал тапшылығы" : "Егістің жергілікті әркелкілігі",
        severity,
        evidence: [
          `NDVI: ${stats.ndviLatest.toFixed(2)} (кезең медианасы ${stats.ndviMedian.toFixed(2)})`,
          `Орташа NDMI: ${stats.ndmiMean.toFixed(2)}`,
          `Кезеңдегі жауын-шашын: ${Math.round(stats.rainSum)} мм`
        ],
        recommendedCheck:
          "Алқаптағы NDVI/NDMI төмен учаскелерін тексеріп, нақты топырақ ылғалдылығымен салыстырыңыз."
      }
    ],
    actions: [
      {
        priority: severity === "high" ? "high" : "medium",
        title: "Проблемалы аймақтарды алқапта тексеру",
        timeWindow: severity === "high" ? "шұғыл" : "осы аптада",
        expectedImpact: "Ерте араласу арқылы өнім жоғалту қаупін төмендету",
        howTo: [
          "NDVI/NDMI минимал аймақтарды бөліп алу",
          "Орнында ылғалдылық пен өсімдік күйін тексеру",
          "Стресс себебін бекітіп, түзету әрекетін тағайындау"
        ]
      },
      {
        priority: "medium",
        title: "Агрооперацияларды түзету",
        timeWindow: "осы аптада",
        expectedImpact: "Вегетацияны тұрақтандыру және стресс факторларын азайту",
        howTo: [
          "Аймақтар бойынша суару/ылғал сақтау режимін түзету",
          "Жапырақ үсті қоректендіру қажеттігін тексеру",
          "5-7 күннен кейін индекстерді қайта түсіру"
        ]
      }
    ],
    numbers: {
      stressScorePct: Number(stats.stressScorePct.toFixed(1)),
      predictedYieldTpha: Number(stats.predictedYieldTpha.toFixed(2)),
      potentialYieldLossPct: Number(stats.potentialYieldLossPct.toFixed(1)),
      potentialRevenueLossUsd: Number(potentialRevenueLossUsd.toFixed(0)),
      anomalyAreaPct: Number(stats.anomalyAreaPct.toFixed(1))
    },
    explanations: {
      whyThisConclusion: [
        `NDVI ${stats.ndviPrev.toFixed(2)}-ден ${stats.ndviLatest.toFixed(2)}-ге өзгерді (${stats.trendLabel}).`,
        `Кезеңде ${Math.round(stats.rainSum)} мм жауын-шашын түсті, ыстық күндер: ${stats.heatDays}.`,
        `Стресс бағасы NDVI/NDMI/NDRE және ауа райы факторларын ескереді.`
      ],
      dataUsed: ["NDVI", "NDMI", "NDRE", "RECI", "weather", "SCL cloud-masked Sentinel-2 L2A"],
      limitations: [
        "Бұлттылық пен түсірілім жиілігіне байланысты дерек үзілістері болуы мүмкін.",
        "Бағалау жергілікті ground-truth өлшемдерсіз жасалды."
      ]
    }
  };
};

const estimateCostUsd = ({ model, usage }) => {
  const inputTokens = toNum(usage?.input_tokens, 0);
  const outputTokens = toNum(usage?.output_tokens, 0);
  const pricing = {
    "gpt-4o-mini": { inPer1M: 0.15, outPer1M: 0.6 },
    "gpt-4o": { inPer1M: 5.0, outPer1M: 15.0 }
  };
  const modelPricing = pricing[model] || pricing["gpt-4o-mini"];
  return (inputTokens / 1_000_000) * modelPricing.inPer1M + (outputTokens / 1_000_000) * modelPricing.outPer1M;
};

const parseResponseJson = (payload) => {
  const first = payload?.output?.[0];
  const chunks = first?.content || [];
  for (const chunk of chunks) {
    if (chunk?.type === "output_text" && chunk?.text) {
      return JSON.parse(chunk.text.trim());
    }
    if (chunk?.type === "json_schema" && chunk?.json) {
      return chunk.json;
    }
  }
  if (typeof payload?.output_text === "string") return JSON.parse(payload.output_text.trim());
  throw new Error("OPENAI_JSON_NOT_FOUND");
};

const containsKazakhLetters = (value) =>
  /[әіңғүұқөһӘІҢҒҮҰҚӨҺ]/.test(String(value || ""));

const ensureKazakhReport = (report) => {
  const probe = [
    report?.executiveSummary,
    ...(report?.keyFindings || []).map((x) => `${x?.label || ""} ${x?.valueText || ""}`),
    ...(report?.risks || []).map((x) => `${x?.title || ""} ${(x?.evidence || []).join(" ")}`),
    ...(report?.actions || []).map((x) => `${x?.title || ""} ${(x?.howTo || []).join(" ")}`),
    ...(report?.explanations?.whyThisConclusion || [])
  ].join(" ");
  if (!containsKazakhLetters(probe)) {
    throw new Error("OPENAI_LANGUAGE_NOT_KAZAKH");
  }
};

export const generateFieldReport = async ({ field, period, indicesTimeseries, weatherTimeseries, baseline, pricePerTon = 220 }) => {
  const stats = buildStats({ indicesTimeseries, weatherTimeseries, period });
  const fallback = buildFallbackReport({ field, stats, pricePerTon });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { report: fallback, source: "fallback", stats, openai: null };
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const systemPrompt =
    "Сен агро шешім қолдау жүйесінің аналитигісің. Берілген схема бойынша тек JSON қайтар. Қазақ тілінде жаз. Толық есеп жаса: себеп-салдар, нақты дәлелдер, әрекет қадамдары, тәуекел басымдығы, шектеулер. Шығыс практикалық болсын: evidence бар тәуекелдер, нақты howTo қадамдары. Дерек сапасын ескеріп, шынайы сенімділік бер.";

  const userPayload = {
    field,
    period: { ...period, ...stats.dateRange },
    pricePerTon,
    compactStats: {
      ndviLatest: stats.ndviLatest,
      ndviMedian: stats.ndviMedian,
      ndviPrev: stats.ndviPrev,
      ndviDropPct: stats.ndviDrop,
      ndmiMean: stats.ndmiMean,
      ndreMean: stats.ndreMean,
      reciMean: stats.reciMean,
      ndviSlope: stats.ndviSlope,
      ndmiSlope: stats.ndmiSlope,
      ndreSlope: stats.ndreSlope,
      rainSumMm: stats.rainSum,
      tempAvgC: stats.tempAvgMean,
      heatDays: stats.heatDays,
      missingDays: stats.missingDays,
      completenessPct: stats.completeness,
      anomalyAreaPct: stats.anomalyAreaPct,
      stressScorePct: stats.stressScorePct,
      predictedYieldTpha: stats.predictedYieldTpha,
      potentialYieldLossPct: stats.potentialYieldLossPct,
      trendLabel: stats.trendLabel
    },
    samples: {
      indicesTail: indicesTimeseries.slice(-7),
      weatherTail: weatherTimeseries.slice(-7)
    },
    baseline,
    notes: "Егер baseline жоқ болса, оны limitations бөлімінде анық көрсет."
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) }
      ],
      max_output_tokens: 2600,
      text: {
        format: {
          type: "json_schema",
          name: "field_report",
          strict: true,
          schema: fieldReportSchema
        }
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OPENAI_HTTP_${response.status}: ${errText}`);
  }

  const payload = await response.json();
  const parsed = parseResponseJson(payload);
  ensureKazakhReport(parsed);

  const valid = validateReport(parsed);
  if (!valid) {
    throw new Error(`SCHEMA_VALIDATION_FAILED: ${ajv.errorsText(validateReport.errors)}`);
  }

  const estimatedCostUsd = estimateCostUsd({ model, usage: payload.usage });

  return {
    report: parsed,
    source: "openai",
    stats,
    openai: {
      requestId: payload.id || null,
      usage: payload.usage || null,
      estimatedCostUsd
    }
  };
};

export const safeGenerateFieldReport = async (args) => {
  try {
    return await generateFieldReport(args);
  } catch (error) {
    const stats = buildStats(args);
    const report = buildFallbackReport({ field: args.field, stats, pricePerTon: args.pricePerTon });
    return {
      report,
      source: "fallback",
      stats,
      openai: null,
      error: String(error?.message || error)
    };
  }
};

export const isValidFieldReport = (value) => Boolean(validateReport(value));
