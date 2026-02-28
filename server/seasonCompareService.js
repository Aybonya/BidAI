import Ajv from "ajv";
import { seasonCompareSchema } from "./seasonCompareSchema.js";

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(seasonCompareSchema);

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const median = (arr) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const parseDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const sortByDate = (rows) =>
  [...(rows || [])]
    .filter((r) => parseDate(r?.date))
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

const slope = (rows, key) => {
  const points = sortByDate(rows)
    .map((r, i) => ({ x: i, y: toNum(r[key], NaN) }))
    .filter((p) => Number.isFinite(p.y));
  const n = points.length;
  if (n < 2) return 0;
  const sx = points.reduce((s, p) => s + p.x, 0);
  const sy = points.reduce((s, p) => s + p.y, 0);
  const sxy = points.reduce((s, p) => s + p.x * p.y, 0);
  const sx2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sx2 - sx * sx;
  if (!denom) return 0;
  return (n * sxy - sx * sy) / denom;
};

const pickPeakNdvi = (rows) => {
  const valid = sortByDate(rows).filter((r) => Number.isFinite(toNum(r.NDVI_mean, NaN)));
  if (!valid.length) return { value: 0, date: new Date().toISOString().slice(0, 10) };
  const peak = valid.reduce((best, cur) => (toNum(cur.NDVI_mean) > toNum(best.NDVI_mean) ? cur : best), valid[0]);
  return { value: toNum(peak.NDVI_mean), date: peak.date };
};

const seasonStats = (season) => {
  const idx = sortByDate(season?.indicesTimeseries || []);
  const weather = sortByDate(season?.weatherTimeseries || []);

  const getVals = (k) => idx.map((r) => toNum(r[k], NaN)).filter(Number.isFinite);

  const ndvi = getVals("NDVI_mean");
  const ndmi = getVals("NDMI_mean");
  const ndre = getVals("NDRE_mean");

  const dates = [...idx.map((r) => r.date), ...weather.map((r) => r.date)].filter(Boolean);
  const uniqueDays = new Set(dates).size;
  const totalDays = season?.startDate && season?.endDate
    ? Math.max(1, Math.round((parseDate(season.endDate) - parseDate(season.startDate)) / 86400000) + 1)
    : Math.max(1, uniqueDays);
  const missingDays = Math.max(0, totalDays - uniqueDays);

  const precipSum = weather.reduce((s, r) => s + toNum(r.precipMm), 0);
  const avgTemp = mean(weather.map((r) => toNum(r.tempAvgC, NaN)).filter(Number.isFinite));
  const maxTemp = Math.max(...weather.map((r) => toNum(r.tempMaxC, NaN)).filter(Number.isFinite), -Infinity);
  const heatDays = weather.filter((r) => toNum(r.tempMaxC) > 32).length;

  let anomalyAreaPct = toNum(idx[idx.length - 1]?.anomalyAreaPct, 0);
  if (!anomalyAreaPct) {
    const spreads = idx.map((r) => Math.abs(toNum(r.NDVI_p90, 0) - toNum(r.NDVI_p10, 0))).filter(Number.isFinite);
    anomalyAreaPct = clamp(mean(spreads) * 200, 2, 50);
  }

  return {
    label: season?.label || "Season",
    startDate: season?.startDate,
    endDate: season?.endDate,
    meanNDVI: mean(ndvi),
    medianNDVI: median(ndvi),
    minNDVI: ndvi.length ? Math.min(...ndvi) : 0,
    maxNDVI: ndvi.length ? Math.max(...ndvi) : 0,
    meanNDMI: mean(ndmi),
    medianNDMI: median(ndmi),
    minNDMI: ndmi.length ? Math.min(...ndmi) : 0,
    maxNDMI: ndmi.length ? Math.max(...ndmi) : 0,
    meanNDRE: mean(ndre),
    medianNDRE: median(ndre),
    minNDRE: ndre.length ? Math.min(...ndre) : 0,
    maxNDRE: ndre.length ? Math.max(...ndre) : 0,
    slopeNDVI: slope(idx, "NDVI_mean"),
    slopeNDMI: slope(idx, "NDMI_mean"),
    slopeNDRE: slope(idx, "NDRE_mean"),
    peakNdvi: pickPeakNdvi(idx),
    missingDays,
    precipSum,
    heatDays,
    avgTemp,
    maxTemp: Number.isFinite(maxTemp) ? maxTemp : 0,
    anomalyAreaPct,
    dataPoints: idx.length
  };
};

const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);

const buildFallback = ({ field, seasonA, seasonB, statsA, statsB, deltas, pricePerTonUsd = 220 }) => {
  const healthScoreA = clamp(70 + statsA.meanNDVI * 25 - statsA.heatDays * 0.8 - statsA.anomalyAreaPct * 0.3, 5, 100);
  const healthScoreB = clamp(70 + statsB.meanNDVI * 25 - statsB.heatDays * 0.8 - statsB.anomalyAreaPct * 0.3, 5, 100);
  const deltaHealthScore = healthScoreB - healthScoreA;

  const yieldA = clamp(2.0 + statsA.meanNDVI * 4.8 - statsA.heatDays * 0.02, 1.0, 8.5);
  const yieldB = clamp(2.0 + statsB.meanNDVI * 4.8 - statsB.heatDays * 0.02, 1.0, 8.5);
  const deltaYield = yieldB - yieldA;
  const deltaRevenueUsd = toNum(field?.areaHa) * deltaYield * toNum(pricePerTonUsd, 220);

  const confidence = clamp(95 - (statsA.missingDays + statsB.missingDays) * 0.7 - Math.abs(deltas.deltaPeakDateDays) * 0.1, 35, 92);

  const better = deltaHealthScore >= 0 ? seasonB.label : seasonA.label;
  const why = deltas.deltaMeanNDVI >= 0 ? "NDVI жоғарырақ болғандықтан" : "динамика тұрақтырақ болғандықтан";

  return {
    meta: {
      fieldId: String(field?.id || "unknown"),
      cropType: String(field?.cropType || "Көрсетілмеген"),
      seasonA: { label: seasonA.label, startDate: seasonA.startDate, endDate: seasonA.endDate },
      seasonB: { label: seasonB.label, startDate: seasonB.startDate, endDate: seasonB.endDate },
      generatedAt: new Date().toISOString(),
      confidencePct: Number(confidence.toFixed(0))
    },
    headline: `${better} индекстер мен ауа райы драйверлерінің жиынтығы бойынша жақсырақ көрінеді (${why}).`,
    score: {
      healthScoreA: Number(healthScoreA.toFixed(1)),
      healthScoreB: Number(healthScoreB.toFixed(1)),
      deltaHealthScore: Number(deltaHealthScore.toFixed(1))
    },
    indexComparison: [
      {
        index: "NDVI",
        meanA: Number(statsA.meanNDVI.toFixed(3)),
        meanB: Number(statsB.meanNDVI.toFixed(3)),
        delta: Number(deltas.deltaMeanNDVI.toFixed(3)),
        interpretation: deltas.deltaMeanNDVI >= 0 ? "Маусым B-де вегетация белсендірек" : "Маусым B-де вегетация әлсіздеу"
      },
      {
        index: "NDMI",
        meanA: Number(statsA.meanNDMI.toFixed(3)),
        meanB: Number(statsB.meanNDMI.toFixed(3)),
        delta: Number(deltas.deltaMeanNDMI.toFixed(3)),
        interpretation: deltas.deltaMeanNDMI >= 0 ? "Маусым B-де ылғал фоны жақсырақ" : "Маусым B-де ылғал тапшылығы ықтималы жоғары"
      },
      {
        index: "NDRE",
        meanA: Number(statsA.meanNDRE.toFixed(3)),
        meanB: Number(statsB.meanNDRE.toFixed(3)),
        delta: Number(deltas.deltaMeanNDRE.toFixed(3)),
        interpretation: deltas.deltaMeanNDRE >= 0 ? "Маусым B-де хлорофилл күйі жақсырақ болуы мүмкін" : "Маусым B-де азот статусы әлсіздеу болуы ықтимал"
      }
    ],
    phenology: {
      peakNdviA: { value: Number(statsA.peakNdvi.value.toFixed(3)), date: statsA.peakNdvi.date },
      peakNdviB: { value: Number(statsB.peakNdvi.value.toFixed(3)), date: statsB.peakNdvi.date },
      peakShiftDays: Number(deltas.deltaPeakDateDays),
      notes: [
        `NDVI шыңының ығысуы: ${deltas.deltaPeakDateDays} күн.`,
        "Салыстыру күнтізбелік маусымдар бойынша орындалды."
      ]
    },
    weatherDrivers: [
      {
        factor: "precipitation",
        seasonA: Number(statsA.precipSum.toFixed(1)),
        seasonB: Number(statsB.precipSum.toFixed(1)),
        delta: Number(deltas.deltaPrecip.toFixed(1)),
        impact: deltas.deltaPrecip >= 0 ? "Екінші маусымда ылғал көбірек" : "Екінші маусымда жауын-шашын азырақ"
      },
      {
        factor: "heatDays",
        seasonA: statsA.heatDays,
        seasonB: statsB.heatDays,
        delta: deltas.deltaHeatDays,
        impact: deltas.deltaHeatDays > 0 ? "Жылу стрессі қаупі артты" : "Жылу жүктемесі төмендеді"
      }
    ],
    risksDelta: [
      {
        riskId: "heat_stress",
        change: deltas.deltaHeatDays > 1 ? "increased" : deltas.deltaHeatDays < -1 ? "decreased" : "unchanged",
        evidence: [
          `Ыстық күндер: ${statsA.heatDays} -> ${statsB.heatDays}`,
          `Орташа температура: ${statsA.avgTemp.toFixed(1)} -> ${statsB.avgTemp.toFixed(1)} °C`
        ],
        whatToDoNextSeason: [
          "Ыстық кезеңге дейін ылғал сақтау шараларын жоспарлау",
          "Шың ыстықта жапырақ температурасын бақылау"
        ]
      },
      {
        riskId: "moisture_deficit",
        change: deltas.deltaMeanNDMI < -0.01 ? "increased" : deltas.deltaMeanNDMI > 0.01 ? "decreased" : "unchanged",
        evidence: [
          `Орташа NDMI: ${statsA.meanNDMI.toFixed(3)} -> ${statsB.meanNDMI.toFixed(3)}`,
          `Жауын-шашын: ${statsA.precipSum.toFixed(1)} -> ${statsB.precipSum.toFixed(1)} мм`
        ],
        whatToDoNextSeason: [
          "Аймақтар бойынша ылғал тапшылығы картасын жасау",
          "Суару/ылғал сақтау кестесін түзету"
        ]
      }
    ],
    yieldEstimate: {
      yieldA_tpha: Number(yieldA.toFixed(2)),
      yieldB_tpha: Number(yieldB.toFixed(2)),
      delta_tpha: Number(deltaYield.toFixed(2)),
      deltaRevenueUsd: Number(deltaRevenueUsd.toFixed(0))
    },
    recommendations: [
      {
        priority: "high",
        title: "Маусым B-де нашарлаған факторларға фокус жасау",
        steps: [
          "NDMI/NDVI ең көп түскен аймақтарды тексеру",
          "Ыстық күндер дерегімен салыстыру",
          "Келесі маусымға дейін агрооперациялар картасын жаңарту"
        ]
      }
    ],
    limitations: [
      "Салыстыру фенокезеңдер бойынша қатаң теңестірусіз, күнтізбелік терезелермен жасалды.",
      "Дерек үзілістері болса, сенімділік төмендейді."
    ]
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
    if (chunk?.type === "output_text" && chunk?.text) return JSON.parse(chunk.text.trim());
  }
  if (typeof payload?.output_text === "string") return JSON.parse(payload.output_text.trim());
  throw new Error("OPENAI_JSON_NOT_FOUND");
};

const containsKazakhLetters = (value) =>
  /[әіңғүұқөһӘІҢҒҮҰҚӨҺ]/.test(String(value || ""));

const ensureKazakhCompareReport = (report) => {
  const probe = [
    report?.headline,
    ...(report?.indexComparison || []).map((x) => x?.interpretation || ""),
    ...(report?.phenology?.notes || []),
    ...(report?.weatherDrivers || []).map((x) => x?.impact || ""),
    ...(report?.recommendations || []).map((x) => `${x?.title || ""} ${(x?.steps || []).join(" ")}`),
    ...(report?.limitations || [])
  ].join(" ");
  if (!containsKazakhLetters(probe)) {
    throw new Error("OPENAI_LANGUAGE_NOT_KAZAKH");
  }
};

export const generateSeasonCompare = async ({ field, seasonA, seasonB, options = {} }) => {
  const statsA = seasonStats(seasonA);
  const statsB = seasonStats(seasonB);

  const deltas = {
    deltaMeanNDVI: statsB.meanNDVI - statsA.meanNDVI,
    deltaMeanNDMI: statsB.meanNDMI - statsA.meanNDMI,
    deltaMeanNDRE: statsB.meanNDRE - statsA.meanNDRE,
    deltaPrecip: statsB.precipSum - statsA.precipSum,
    deltaHeatDays: statsB.heatDays - statsA.heatDays,
    deltaSlopeNDVI: statsB.slopeNDVI - statsA.slopeNDVI,
    deltaPeakDateDays: daysBetween(statsA.peakNdvi.date, statsB.peakNdvi.date)
  };

  const fallback = buildFallback({ field, seasonA, seasonB, statsA, statsB, deltas, pricePerTonUsd: options.pricePerTonUsd || 220 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { report: fallback, source: "fallback", openai: null, stats: { statsA, statsB, deltas } };
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const payload = {
    field,
    seasonA: { label: seasonA.label, startDate: seasonA.startDate, endDate: seasonA.endDate, stats: statsA },
    seasonB: { label: seasonB.label, startDate: seasonB.startDate, endDate: seasonB.endDate, stats: statsB },
    deltas,
    options,
    hints: [
      "Фенокезең теңестіруі болмаса, күнтізбелік терезелермен сақ салыстыр.",
      "Егер confidence < 60 болса, сақ формулировкаларды қолдан."
    ]
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
        {
          role: "system",
          content:
            "Сен маусымдарды салыстыратын агрономиялық ассистентсің. Схемаға сай тек JSON қайтар. Тіл: қазақша. Толық салыстырмалы есеп бер: негізгі айырмашылықтар, дәлелдер, тәуекел өзгерісі, нақты қадамдар, шектеулер. Деректі ойдан қоспа, кіріс статистикасы мен дельталарға сүйен."
        },
        { role: "user", content: JSON.stringify(payload) }
      ],
      max_output_tokens: 2800,
      text: {
        format: {
          type: "json_schema",
          name: "season_compare",
          strict: true,
          schema: seasonCompareSchema
        }
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OPENAI_HTTP_${response.status}: ${text}`);
  }

  const json = await response.json();
  const parsed = parseResponseJson(json);
  ensureKazakhCompareReport(parsed);
  if (!validate(parsed)) throw new Error(`SCHEMA_VALIDATION_FAILED: ${ajv.errorsText(validate.errors)}`);

  return {
    report: parsed,
    source: "openai",
    openai: {
      requestId: json.id || null,
      usage: json.usage || null,
      estimatedCostUsd: estimateCostUsd({ model, usage: json.usage })
    },
    stats: { statsA, statsB, deltas }
  };
};

export const safeGenerateSeasonCompare = async (args) => {
  try {
    return await generateSeasonCompare(args);
  } catch (error) {
    const statsA = seasonStats(args.seasonA);
    const statsB = seasonStats(args.seasonB);
    const deltas = {
      deltaMeanNDVI: statsB.meanNDVI - statsA.meanNDVI,
      deltaMeanNDMI: statsB.meanNDMI - statsA.meanNDMI,
      deltaMeanNDRE: statsB.meanNDRE - statsA.meanNDRE,
      deltaPrecip: statsB.precipSum - statsA.precipSum,
      deltaHeatDays: statsB.heatDays - statsA.heatDays,
      deltaSlopeNDVI: statsB.slopeNDVI - statsA.slopeNDVI,
      deltaPeakDateDays: daysBetween(statsA.peakNdvi.date, statsB.peakNdvi.date)
    };
    return {
      report: buildFallback({ field: args.field, seasonA: args.seasonA, seasonB: args.seasonB, statsA, statsB, deltas, pricePerTonUsd: args.options?.pricePerTonUsd || 220 }),
      source: "fallback",
      openai: null,
      stats: { statsA, statsB, deltas },
      error: String(error?.message || error)
    };
  }
};

export const isValidSeasonCompare = (value) => Boolean(validate(value));
