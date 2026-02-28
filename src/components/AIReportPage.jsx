import { AlertTriangle, Bot, CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const getLastDate = (dates) => {
  const parsed = dates
    .map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  return parsed[parsed.length - 1] || null;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

const getPeriodById = (id) => {
  if (id === "30d") return 30;
  if (id === "all") return null;
  return 90;
};

const buildEmergencyFieldReport = (request) => {
  const payload = buildRequestPayload(request);
  const idx = payload.indicesTimeseries || [];
  const weather = payload.weatherTimeseries || [];

  const ndvi = idx.map((r) => Number(r.NDVI_mean)).filter(Number.isFinite);
  const ndmi = idx.map((r) => Number(r.NDMI_mean)).filter(Number.isFinite);
  const ndre = idx.map((r) => Number(r.NDRE_mean)).filter(Number.isFinite);
  const rain = weather.map((r) => Number(r.precipMm)).filter(Number.isFinite);
  const tempMax = weather.map((r) => Number(r.tempMaxC)).filter(Number.isFinite);

  const ndviLatest = ndvi.at(-1) ?? 0;
  const ndviPrev = ndvi.at(-2) ?? ndviLatest;
  const ndviMedian = ndvi.length ? [...ndvi].sort((a, b) => a - b)[Math.floor(ndvi.length / 2)] : 0;
  const ndviDrop = ndviMedian > 0 ? ((ndviMedian - ndviLatest) / ndviMedian) * 100 : 0;
  const stressScore = clamp(
    30 + clamp(ndviDrop, 0, 35) * 0.9 + clamp((0.2 - mean(ndmi)) * 120, 0, 30) + clamp((0.15 - mean(ndre)) * 180, 0, 20),
    5,
    95
  );
  const trend = ndviLatest - ndviPrev;
  const trendLabel = trend > 0.01 ? "жақсару" : trend < -0.01 ? "нашарлау" : "тұрақты";
  const potentialYieldLossPct = clamp(stressScore * 0.55 + (trend < 0 ? 8 : 0), 1, 65);
  const predictedYield = clamp(2.2 + ndviLatest * 5.5 - potentialYieldLossPct * 0.03, 1.2, 8.5);
  const rainSum = rain.reduce((s, v) => s + v, 0);
  const heatDays = tempMax.filter((v) => v >= 30).length;
  const anomalyAreaPct = clamp((idx.length ? mean(idx.map((r) => Math.abs((Number(r.NDVI_p90) || 0) - (Number(r.NDVI_p10) || 0)))) : 0) * 220, 2, 45);

  const severity = stressScore >= 60 ? "high" : stressScore >= 35 ? "medium" : "low";
  const areaHa = Number(payload.field?.areaHa || 0);
  const pricePerTon = 220;
  const revenueLoss = Math.max(0, areaHa * (predictedYield * (potentialYieldLossPct / 100)) * pricePerTon);

  return {
    meta: {
      fieldId: String(payload.field?.id || "unknown"),
      cropType: String(payload.field?.cropType || "Көрсетілмеген"),
      periodDays: Math.max(1, idx.length || weather.length || 90),
      generatedAt: new Date().toISOString(),
      modelConfidencePct: 52
    },
    executiveSummary:
      severity === "low"
        ? "Индекс пен ауа райы сигналдары тұрақты, сыни ауытқулар байқалмады."
        : "Өсімдік стрессінің белгілері бар. Алқаптағы проблемалы аймақтарды басымдықпен тексеру қажет.",
    keyFindings: [
      { type: "stress", label: "Орташа стресс деңгейі", value: Math.round(stressScore), unit: "%", severity },
      { type: "yield", label: "Болжамды өнім", value: Number(predictedYield.toFixed(2)), unit: "т/га" },
      { type: "trend", label: "Үрдіс", valueText: trendLabel }
    ],
    risks: [
      {
        id: mean(ndmi) < 0.12 ? "moisture_deficit" : "other",
        title: mean(ndmi) < 0.12 ? "Ылғал тапшылығы" : "Егістің жергілікті әркелкілігі",
        severity,
        evidence: [
          `NDVI: ${ndviLatest.toFixed(2)} (кезең медианасы ${ndviMedian.toFixed(2)})`,
          `Орташа NDMI: ${mean(ndmi).toFixed(2)}`,
          `Кезеңдегі жауын-шашын: ${Math.round(rainSum)} мм`
        ],
        recommendedCheck: "Төмен индексті аймақтарды тексеріп, өсімдік күйі мен топырақ ылғалдылығымен салыстырыңыз."
      }
    ],
    actions: [
      {
        priority: severity === "high" ? "high" : "medium",
        title: "Проблемалы аймақтарды алқапта тексеру",
        timeWindow: severity === "high" ? "шұғыл" : "осы аптада",
        expectedImpact: "Ерте әрекет ету арқылы өнім шығыны қаупін төмендету",
        howTo: [
          "NDVI/NDMI ең төмен аймақтарды анықтау",
          "Орнында ылғалдылық пен стресс белгілерін тексеру",
          "Нүктелік түзету шараларын қабылдау"
        ]
      }
    ],
    numbers: {
      stressScorePct: Number(stressScore.toFixed(1)),
      predictedYieldTpha: Number(predictedYield.toFixed(2)),
      potentialYieldLossPct: Number(potentialYieldLossPct.toFixed(1)),
      potentialRevenueLossUsd: Number(revenueLoss.toFixed(0)),
      anomalyAreaPct: Number(anomalyAreaPct.toFixed(1))
    },
    explanations: {
      whyThisConclusion: [
        `NDVI ${ndviPrev.toFixed(2)}-ден ${ndviLatest.toFixed(2)}-ге өзгерді (${trendLabel}).`,
        `Кезеңдегі жауын-шашын: ${Math.round(rainSum)} мм, ыстық күндер: ${heatDays}.`,
        "Бағалау индекс және ауа райы қатарларына негізделген, қосымша далалық өлшемдерсіз."
      ],
      dataUsed: ["NDVI", "NDMI", "NDRE", "weather", "Sentinel-2 L2A"],
      limitations: ["AI сервері қазір қолжетімсіз, жергілікті резервтік есеп көрсетілді."]
    }
  };
};

const buildEmergencySeasonCompareReport = (request) => {
  const payload = buildSeasonComparePayload(request);
  const seasonAIdx = payload.seasonA?.indicesTimeseries || [];
  const seasonBIdx = payload.seasonB?.indicesTimeseries || [];
  const seasonAWeather = payload.seasonA?.weatherTimeseries || [];
  const seasonBWeather = payload.seasonB?.weatherTimeseries || [];

  const getMean = (rows, key) => mean(rows.map((r) => Number(r[key])).filter(Number.isFinite));
  const getPeak = (rows) => {
    const valid = rows.filter((r) => Number.isFinite(Number(r.NDVI_mean)));
    if (!valid.length) {
      const today = new Date().toISOString().slice(0, 10);
      return { value: 0, date: today };
    }
    const peak = valid.reduce((best, cur) => (Number(cur.NDVI_mean) > Number(best.NDVI_mean) ? cur : best), valid[0]);
    return { value: Number(peak.NDVI_mean), date: peak.date };
  };
  const daysBetween = (a, b) => {
    const da = new Date(a);
    const db = new Date(b);
    if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return 0;
    return Math.round((db - da) / 86400000);
  };

  const aNDVI = getMean(seasonAIdx, "NDVI_mean");
  const bNDVI = getMean(seasonBIdx, "NDVI_mean");
  const aNDMI = getMean(seasonAIdx, "NDMI_mean");
  const bNDMI = getMean(seasonBIdx, "NDMI_mean");
  const aNDRE = getMean(seasonAIdx, "NDRE_mean");
  const bNDRE = getMean(seasonBIdx, "NDRE_mean");
  const aPrecip = seasonAWeather.reduce((s, r) => s + (Number(r.precipMm) || 0), 0);
  const bPrecip = seasonBWeather.reduce((s, r) => s + (Number(r.precipMm) || 0), 0);
  const aHeat = seasonAWeather.filter((r) => Number(r.tempMaxC) > 32).length;
  const bHeat = seasonBWeather.filter((r) => Number(r.tempMaxC) > 32).length;

  const peakA = getPeak(seasonAIdx);
  const peakB = getPeak(seasonBIdx);
  const peakShift = daysBetween(peakA.date, peakB.date);

  const healthA = clamp(70 + aNDVI * 25 - aHeat * 0.8, 5, 100);
  const healthB = clamp(70 + bNDVI * 25 - bHeat * 0.8, 5, 100);
  const deltaHealth = healthB - healthA;
  const areaHa = Number(payload.field?.areaHa || 0);
  const yieldA = clamp(2.0 + aNDVI * 4.8 - aHeat * 0.02, 1.0, 8.5);
  const yieldB = clamp(2.0 + bNDVI * 4.8 - bHeat * 0.02, 1.0, 8.5);
  const deltaYield = yieldB - yieldA;
  const deltaRevenue = areaHa * deltaYield * 220;

  return {
    meta: {
      fieldId: String(payload.field?.id || "unknown"),
      cropType: String(payload.field?.cropType || "Көрсетілмеген"),
      seasonA: {
        label: payload.seasonA?.label || "Маусым A",
        startDate: payload.seasonA?.startDate || "2022-06-01",
        endDate: payload.seasonA?.endDate || "2022-09-01"
      },
      seasonB: {
        label: payload.seasonB?.label || "Маусым B",
        startDate: payload.seasonB?.startDate || "2023-06-01",
        endDate: payload.seasonB?.endDate || "2023-09-01"
      },
      generatedAt: new Date().toISOString(),
      confidencePct: 50
    },
    headline:
      deltaHealth >= 0
        ? `${payload.seasonB?.label || "Маусым B"} вегетация индексі мен ауа райы факторлары бойынша мықтырақ.`
        : `${payload.seasonA?.label || "Маусым A"} егіс жағдайының жиынтық бағасы бойынша мықтырақ.`,
    score: {
      healthScoreA: Number(healthA.toFixed(1)),
      healthScoreB: Number(healthB.toFixed(1)),
      deltaHealthScore: Number(deltaHealth.toFixed(1))
    },
    indexComparison: [
      {
        index: "NDVI",
        meanA: Number(aNDVI.toFixed(3)),
        meanB: Number(bNDVI.toFixed(3)),
        delta: Number((bNDVI - aNDVI).toFixed(3)),
        interpretation: bNDVI >= aNDVI ? "Екінші маусымда вегетация жоғары" : "Екінші маусымда вегетация төмен"
      },
      {
        index: "NDMI",
        meanA: Number(aNDMI.toFixed(3)),
        meanB: Number(bNDMI.toFixed(3)),
        delta: Number((bNDMI - aNDMI).toFixed(3)),
        interpretation: bNDMI >= aNDMI ? "Екінші маусымда ылғал режимі жақсы" : "Екінші маусымда ылғал тапшылығы жоғары"
      },
      {
        index: "NDRE",
        meanA: Number(aNDRE.toFixed(3)),
        meanB: Number(bNDRE.toFixed(3)),
        delta: Number((bNDRE - aNDRE).toFixed(3)),
        interpretation: bNDRE >= aNDRE ? "Екінші маусымда фотосинтез әлеуеті жоғары" : "Екінші маусымда фотосинтез әлеуеті төмен"
      }
    ],
    phenology: {
      peakNdviA: { value: Number(peakA.value.toFixed(3)), date: peakA.date },
      peakNdviB: { value: Number(peakB.value.toFixed(3)), date: peakB.date },
      peakShiftDays: peakShift,
      notes: [
        `NDVI шыңының ығысуы: ${peakShift} күн.`,
        "Есеп AI серверінсіз жергілікті түрде есептелді."
      ]
    },
    weatherDrivers: [
      {
        factor: "precipitation",
        seasonA: Number(aPrecip.toFixed(1)),
        seasonB: Number(bPrecip.toFixed(1)),
        delta: Number((bPrecip - aPrecip).toFixed(1)),
        impact: bPrecip >= aPrecip ? "Екінші маусымда жауын-шашын көбірек" : "Екінші маусымда жауын-шашын азырақ"
      },
      {
        factor: "heatDays",
        seasonA: aHeat,
        seasonB: bHeat,
        delta: bHeat - aHeat,
        impact: bHeat > aHeat ? "Жылу стрессі қаупі артты" : "Жылу жүктемесі артпады"
      }
    ],
    risksDelta: [
      {
        riskId: "heat_stress",
        change: bHeat > aHeat ? "increased" : bHeat < aHeat ? "decreased" : "unchanged",
        evidence: [`Ыстық күндер: ${aHeat} -> ${bHeat}`],
        whatToDoNextSeason: ["Егістік жұмысты қатты ыстықтан тыс жоспарлау", "Ыстық кезеңдерде мониторингті күшейту"]
      },
      {
        riskId: "moisture_deficit",
        change: bNDMI < aNDMI ? "increased" : bNDMI > aNDMI ? "decreased" : "unchanged",
        evidence: [`NDMI: ${aNDMI.toFixed(3)} -> ${bNDMI.toFixed(3)}`],
        whatToDoNextSeason: ["Ылғал тапшылығы картасын тексеру", "Ылғал сақтайтын операцияларды түзету"]
      }
    ],
    yieldEstimate: {
      yieldA_tpha: Number(yieldA.toFixed(2)),
      yieldB_tpha: Number(yieldB.toFixed(2)),
      delta_tpha: Number(deltaYield.toFixed(2)),
      deltaRevenueUsd: Number(deltaRevenue.toFixed(0))
    },
    recommendations: [
      {
        priority: "high",
        title: "Индекстері ең көп нашарлаған аймақтарды тексеру",
        steps: ["Аймақтар бойынша NDVI/NDMI салыстыру", "Проблемалы аумақтарға шығу жоспарын бекіту", "Агрожұмыс жоспарын түзету"]
      }
    ],
    limitations: ["AI-сервер уақытша қолжетімсіз, жергілікті резервтік есеп көрсетілді."]
  };
};

const extractFieldSeries = (field) => {
  const map = new Map();

  for (const row of field.ndviSeries || []) {
    if (!row?.date) continue;
    map.set(row.date, {
      ...(map.get(row.date) || {}),
      date: row.date,
      NDVI_mean: Number(row.value),
      NDVI_p10: Number(row.value) * 0.82,
      NDVI_p50: Number(row.value),
      NDVI_p90: Number(row.value) * 1.12
    });
  }

  for (const row of field.rainSeries || []) {
    if (!row?.date) continue;
    map.set(row.date, {
      ...(map.get(row.date) || {}),
      date: row.date,
      precipMm: Number(row.rain ?? row.value ?? 0)
    });
  }

  for (const row of field.tempSeries || []) {
    if (!row?.date) continue;
    const t = Number(row.temp ?? row.value ?? 0);
    map.set(row.date, {
      ...(map.get(row.date) || {}),
      date: row.date,
      tempAvgC: t / 10,
      tempMaxC: t / 10 + 4,
      windMs: 3,
      humidityPct: 55
    });
  }

  const rows = [...map.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
  return {
    indices: rows.map((r) => ({
      date: r.date,
      NDVI_mean: Number.isFinite(r.NDVI_mean) ? r.NDVI_mean : 0,
      NDMI_mean: Number.isFinite(r.NDVI_mean) ? r.NDVI_mean * 0.35 : 0,
      NDRE_mean: Number.isFinite(r.NDVI_mean) ? r.NDVI_mean * 0.42 : 0,
      MSAVI_mean: Number.isFinite(r.NDVI_mean) ? r.NDVI_mean * 0.9 : 0,
      RECI_mean: Number.isFinite(r.NDVI_mean) ? r.NDVI_mean * 3 : 0,
      NDWI_mean: Number.isFinite(r.NDVI_mean) ? r.NDVI_mean * 0.25 : 0,
      PRI_mean: Number.isFinite(r.NDVI_mean) ? (r.NDVI_mean - 0.5) * 0.2 : 0,
      MCARI_mean: Number.isFinite(r.NDVI_mean) ? r.NDVI_mean * 1.8 : 0,
      NDVI_p10: Number.isFinite(r.NDVI_p10) ? r.NDVI_p10 : 0,
      NDVI_p50: Number.isFinite(r.NDVI_p50) ? r.NDVI_p50 : 0,
      NDVI_p90: Number.isFinite(r.NDVI_p90) ? r.NDVI_p90 : 0
    })),
    weather: rows.map((r) => ({
      date: r.date,
      tempAvgC: Number.isFinite(r.tempAvgC) ? r.tempAvgC : 0,
      tempMaxC: Number.isFinite(r.tempMaxC) ? r.tempMaxC : 0,
      precipMm: Number.isFinite(r.precipMm) ? r.precipMm : 0,
      windMs: Number.isFinite(r.windMs) ? r.windMs : 3,
      humidityPct: Number.isFinite(r.humidityPct) ? r.humidityPct : 55
    }))
  };
};

const aggregateByDateMean = (rows, numericKeys) => {
  const grouped = new Map();
  for (const row of rows) {
    const date = row.date;
    if (!date) continue;
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date).push(row);
  }

  return [...grouped.entries()]
    .map(([date, items]) => {
      const next = { date };
      for (const key of numericKeys) {
        const values = items.map((x) => Number(x[key])).filter((n) => Number.isFinite(n));
        next[key] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      }
      return next;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

const filterByDays = (rows, days) => {
  if (!days) return rows;
  const last = getLastDate(rows.map((r) => r.date));
  if (!last) return rows;
  const start = new Date(last);
  start.setDate(start.getDate() - days);
  return rows.filter((row) => {
    const d = new Date(row.date);
    return !Number.isNaN(d.getTime()) && d >= start && d <= last;
  });
};

const filterByRange = (rows, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return rows.filter((row) => {
    const d = new Date(row.date);
    return !Number.isNaN(d.getTime()) && d >= start && d <= end;
  });
};

const toIsoDate = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const getDurationDays = (startDate, endDate, fallback = 90) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return fallback;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
};

const getAllAvailableDates = (base) => {
  const rows = [...(base.indicesTimeseries || []), ...(base.weatherTimeseries || [])];
  return rows
    .map((r) => new Date(r.date))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b);
};

const buildBaseFieldPayload = (request) => {
  const fields = request?.fields || [];
  if (!fields.length) {
    return {
      field: {
        id: "empty",
        name: "Алқап жоқ",
        cropType: "Көрсетілмеген",
        areaHa: 0,
        centroidLat: 0,
        centroidLng: 0
      },
      indicesTimeseries: [],
      weatherTimeseries: []
    };
  }

  if (request?.mode === "one" || fields.length === 1) {
    const field = fields[0];
    const series = extractFieldSeries(field);
    return {
      field: {
        id: field.id,
        name: field.name,
        cropType: field.crop || "Көрсетілмеген",
        areaHa: field.areaHa || 0,
        centroidLat: field.center?.[0] || 0,
        centroidLng: field.center?.[1] || 0,
        polygonGeoJSON: field.polygon || null
      },
      indicesTimeseries: series.indices,
      weatherTimeseries: series.weather
    };
  }

  const extracted = fields.map((f) => extractFieldSeries(f));
  const allIdx = extracted.flatMap((s) => s.indices);
  const allWeather = extracted.flatMap((s) => s.weather);

  return {
    field: {
      id: "all-fields",
      name: "Барлық алқап",
      cropType: "Аралас",
      areaHa: fields.reduce((s, f) => s + Number(f.areaHa || 0), 0),
      centroidLat: fields[0]?.center?.[0] || 0,
      centroidLng: fields[0]?.center?.[1] || 0,
      polygonGeoJSON: null
    },
    indicesTimeseries: aggregateByDateMean(allIdx, [
      "NDVI_mean",
      "NDMI_mean",
      "NDRE_mean",
      "MSAVI_mean",
      "RECI_mean",
      "NDWI_mean",
      "PRI_mean",
      "MCARI_mean",
      "NDVI_p10",
      "NDVI_p50",
      "NDVI_p90"
    ]),
    weatherTimeseries: aggregateByDateMean(allWeather, ["tempAvgC", "tempMaxC", "precipMm", "windMs", "humidityPct"])
  };
};

const buildRequestPayload = (request) => {
  const periodDays = getPeriodById(request?.periodId);
  const base = buildBaseFieldPayload(request);
  const indicesTimeseries = filterByDays(base.indicesTimeseries, periodDays);
  const weatherTimeseries = filterByDays(base.weatherTimeseries, periodDays);
  const dates = [...indicesTimeseries.map((r) => r.date), ...weatherTimeseries.map((r) => r.date)];
  const lastDate = getLastDate(dates) || new Date();
  const startDate = new Date(lastDate);
  startDate.setDate(startDate.getDate() - (periodDays || 90));

  return {
    field: base.field,
    period: {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: lastDate.toISOString().slice(0, 10)
    },
    indicesTimeseries,
    weatherTimeseries
  };
};

const buildSeasonComparePayload = (request) => {
  const base = buildBaseFieldPayload(request);
  const seasonA = request?.compare?.seasonA;
  const seasonB = request?.compare?.seasonB;
  const rawAIdx = filterByRange(base.indicesTimeseries, seasonA?.startDate, seasonA?.endDate);
  const rawAWeather = filterByRange(base.weatherTimeseries, seasonA?.startDate, seasonA?.endDate);
  const rawBIdx = filterByRange(base.indicesTimeseries, seasonB?.startDate, seasonB?.endDate);
  const rawBWeather = filterByRange(base.weatherTimeseries, seasonB?.startDate, seasonB?.endDate);

  const hasAData = rawAIdx.length > 0 || rawAWeather.length > 0;
  const hasBData = rawBIdx.length > 0 || rawBWeather.length > 0;

  if (hasAData && hasBData) {
    return {
      field: base.field,
      seasonA: {
        label: seasonA?.label || "Маусым A",
        startDate: seasonA?.startDate,
        endDate: seasonA?.endDate,
        indicesTimeseries: rawAIdx,
        weatherTimeseries: rawAWeather
      },
      seasonB: {
        label: seasonB?.label || "Маусым B",
        startDate: seasonB?.startDate,
        endDate: seasonB?.endDate,
        indicesTimeseries: rawBIdx,
        weatherTimeseries: rawBWeather
      },
      options: { pricePerTonUsd: 220, dateAutoAdjusted: false }
    };
  }

  const allDates = getAllAvailableDates(base);
  if (!allDates.length) {
    return {
      field: base.field,
      seasonA: {
        label: seasonA?.label || "Маусым A",
        startDate: seasonA?.startDate,
        endDate: seasonA?.endDate,
        indicesTimeseries: [],
        weatherTimeseries: []
      },
      seasonB: {
        label: seasonB?.label || "Маусым B",
        startDate: seasonB?.startDate,
        endDate: seasonB?.endDate,
        indicesTimeseries: [],
        weatherTimeseries: []
      },
      options: { pricePerTonUsd: 220, dateAutoAdjusted: false }
    };
  }

  const lastDate = allDates[allDates.length - 1];
  const durationB = getDurationDays(seasonB?.startDate, seasonB?.endDate, 90);
  const durationA = getDurationDays(seasonA?.startDate, seasonA?.endDate, durationB);

  const bEnd = new Date(lastDate);
  const bStart = new Date(bEnd);
  bStart.setDate(bStart.getDate() - durationB + 1);

  const aEnd = new Date(bStart);
  aEnd.setDate(aEnd.getDate() - 1);
  const aStart = new Date(aEnd);
  aStart.setDate(aStart.getDate() - durationA + 1);

  return {
    field: base.field,
    seasonA: {
      label: seasonA?.label || "Маусым A",
      startDate: toIsoDate(aStart),
      endDate: toIsoDate(aEnd),
      indicesTimeseries: filterByRange(base.indicesTimeseries, toIsoDate(aStart), toIsoDate(aEnd)),
      weatherTimeseries: filterByRange(base.weatherTimeseries, toIsoDate(aStart), toIsoDate(aEnd))
    },
    seasonB: {
      label: seasonB?.label || "Маусым B",
      startDate: toIsoDate(bStart),
      endDate: toIsoDate(bEnd),
      indicesTimeseries: filterByRange(base.indicesTimeseries, toIsoDate(bStart), toIsoDate(bEnd)),
      weatherTimeseries: filterByRange(base.weatherTimeseries, toIsoDate(bStart), toIsoDate(bEnd))
    },
    options: { pricePerTonUsd: 220, dateAutoAdjusted: true }
  };
};

const getCacheKey = (request) => {
  const cacheVersion = "kz-v2";
  if (request?.reportType === "seasonCompare") {
    return `dala.ai.${cacheVersion}.compare:${request?.mode || "all"}:${request?.fieldId || "all"}:${request?.compare?.seasonA?.startDate || "a"}:${request?.compare?.seasonA?.endDate || "a2"}:${request?.compare?.seasonB?.startDate || "b"}:${request?.compare?.seasonB?.endDate || "b2"}`;
  }
  return `dala.ai.${cacheVersion}.report:${request?.mode || "all"}:${request?.fieldId || "all"}:${request?.periodId || "90d"}`;
};

const hasKazakhLetters = (text) => /[әіңғүұқөһӘІҢҒҮҰҚӨҺ]/.test(String(text || ""));

const isKazakhFieldReport = (report) => {
  const probe = [
    report?.executiveSummary,
    ...(report?.keyFindings || []).map((x) => `${x?.label || ""} ${x?.valueText || ""}`),
    ...(report?.risks || []).map((x) => `${x?.title || ""} ${(x?.evidence || []).join(" ")}`),
    ...(report?.actions || []).map((x) => `${x?.title || ""} ${(x?.howTo || []).join(" ")}`)
  ].join(" ");
  return hasKazakhLetters(probe);
};

const isKazakhSeasonCompare = (report) => {
  const probe = [
    report?.headline,
    ...(report?.indexComparison || []).map((x) => x?.interpretation || ""),
    ...(report?.phenology?.notes || []),
    ...(report?.weatherDrivers || []).map((x) => x?.impact || ""),
    ...(report?.limitations || [])
  ].join(" ");
  return hasKazakhLetters(probe);
};

const loadCached = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.report) return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveCached = (key, payload) => {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore cache write errors
  }
};

const fetchAnyReport = async (request) => {
  const isSeasonCompare = request?.reportType === "seasonCompare";
  const endpoint = isSeasonCompare ? "/api/ai/season-compare" : "/api/ai/field-report";
  const body = isSeasonCompare ? buildSeasonComparePayload(request) : buildRequestPayload(request);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP_${response.status}: ${text}`);
  }
  return { data: await response.json(), requestBody: body };
};

const buildCompareLineData = (request) => {
  const base = buildBaseFieldPayload(request);
  const a = filterByRange(
    base.indicesTimeseries,
    request?.compare?.seasonA?.startDate,
    request?.compare?.seasonA?.endDate
  );
  const b = filterByRange(
    base.indicesTimeseries,
    request?.compare?.seasonB?.startDate,
    request?.compare?.seasonB?.endDate
  );
  const len = Math.max(a.length, b.length);
  return Array.from({ length: len }).map((_, i) => ({
    day: i + 1,
    seasonA: Number(a[i]?.NDVI_mean ?? null),
    seasonB: Number(b[i]?.NDVI_mean ?? null)
  }));
};

function FieldReportView({ report, error, onClose }) {
  const generatedAt = report?.meta?.generatedAt
    ? new Date(report.meta.generatedAt).toLocaleString("kk-KZ")
    : "—";

  return (
    <div className="grid gap-5">
      {error && <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="glass-panel rounded-2xl p-5 xl:col-span-2">
          <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Қысқаша түйін</p>
          <p className="mt-3 text-sm leading-7 text-[#2d382f]">{report.executiveSummary}</p>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Есеп сапасы</p>
          <p className="headline-font mt-3 text-4xl font-semibold text-[#203024]">{report.meta?.modelConfidencePct ?? 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Негізгі қорытындылар</p>
          <ul className="mt-3 space-y-2 text-sm text-[#2f3a31]">
            {(report.keyFindings || []).map((item) => (
              <li key={`${item.type}-${item.label}`} className="flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#4d7a32]" />
                <span>{item.label}{item.value !== undefined ? `: ${item.value}${item.unit ? ` ${item.unit}` : ""}` : item.valueText ? `: ${item.valueText}` : ""}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Тәуекелдер</p>
          <div className="mt-3 space-y-3">
            {(report.risks || []).map((risk) => (
              <div key={`${risk.id}-${risk.title}`} className="rounded-xl border border-[#d9d2be] bg-white/60 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#2b352d]"><AlertTriangle size={15} className="text-[#cf6f2d]" />{risk.title}</p>
                <ul className="mt-1 list-disc pl-5 text-xs text-[#5e675a]">{(risk.evidence || []).map((ev) => <li key={ev}>{ev}</li>)}</ul>
                {risk.recommendedCheck && (
                  <p className="mt-2 text-xs text-[#3d493f]">Тексеру: {risk.recommendedCheck}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Іс-қимыл жоспары</p>
        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
          {(report.actions || []).map((action) => (
            <div key={`${action.priority}-${action.title}`} className="rounded-xl border border-[#d9d2be] bg-white/70 p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#7d8677]">{action.priority}</p>
              <p className="mt-2 text-sm font-semibold text-[#273328]">{action.title}</p>
              <p className="mt-1 text-xs text-[#596458]">Уақыты: {action.timeWindow}</p>
              <p className="mt-1 text-xs text-[#596458]">Әсері: {action.expectedImpact}</p>
              <ul className="mt-2 list-disc pl-5 text-xs text-[#5e675a]">{(action.howTo || []).map((step) => <li key={step}>{step}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Сандық метрикалар</p>
        <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-5">
          <div className="rounded-xl border border-[#d9d2be] bg-white/70 p-3 text-xs">Стресс: <b>{report.numbers?.stressScorePct ?? 0}%</b></div>
          <div className="rounded-xl border border-[#d9d2be] bg-white/70 p-3 text-xs">Өнім: <b>{report.numbers?.predictedYieldTpha ?? 0} т/га</b></div>
          <div className="rounded-xl border border-[#d9d2be] bg-white/70 p-3 text-xs">Шығын: <b>{report.numbers?.potentialYieldLossPct ?? 0}%</b></div>
          <div className="rounded-xl border border-[#d9d2be] bg-white/70 p-3 text-xs">Табыс: <b>${report.numbers?.potentialRevenueLossUsd ?? 0}</b></div>
          <div className="rounded-xl border border-[#d9d2be] bg-white/70 p-3 text-xs">Аномалия: <b>{report.numbers?.anomalyAreaPct ?? 0}%</b></div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Түсіндірме және дерек</p>
        <p className="mt-1 text-xs text-[#5f695b]">Жасалған уақыты: {generatedAt}</p>
        <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-[#3d493f]">Неге осындай қорытынды</p>
            <ul className="mt-1 list-disc pl-5 text-xs text-[#5e675a]">
              {(report.explanations?.whyThisConclusion || []).map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#3d493f]">Қолданылған деректер</p>
            <ul className="mt-1 list-disc pl-5 text-xs text-[#5e675a]">
              {(report.explanations?.dataUsed || []).map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#3d493f]">Шектеулер</p>
            <ul className="mt-1 list-disc pl-5 text-xs text-[#5e675a]">
              {(report.explanations?.limitations || []).map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#d2ccba] bg-[#f2eddf] px-4 py-3 text-xs text-[#5f695b]">
        <p className="flex items-center gap-2 font-semibold text-[#334036]"><Bot size={14} />Модель ескертпесі</p>
        <p className="mt-1">{report.modelNotes || report.explanations?.limitations?.[0] || "Пікір жоқ"}</p>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="soft-button inline-flex items-center gap-2 rounded-full bg-[#1f2d26] px-5 py-2 text-sm font-semibold text-white">
          <Sparkles size={14} />Есепті жабу
        </button>
      </div>
    </div>
  );
}

function SeasonCompareView({ report, request, error, onClose }) {
  const lineData = useMemo(() => buildCompareLineData(request), [request]);
  const deltaBars = (report.indexComparison || []).map((x) => ({ index: x.index, delta: x.delta }));

  return (
    <div className="grid gap-5">
      {error && <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="glass-panel rounded-2xl p-5 xl:col-span-2">
          <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Негізгі ой</p>
          <p className="mt-2 text-sm leading-7 text-[#2d382f]">{report.headline}</p>
          <p className="mt-3 text-xs text-[#5e675a]">Не өзгерді:</p>
          <ul className="mt-1 list-disc pl-5 text-xs text-[#5e675a]">
            {(report.phenology?.notes || []).map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Баға</p>
          <p className="headline-font mt-2 text-2xl text-[#203024]">Маусым A: {report.score?.healthScoreA?.toFixed?.(1)}</p>
          <p className="headline-font text-2xl text-[#203024]">Маусым B: {report.score?.healthScoreB?.toFixed?.(1)}</p>
          <p className="mt-2 text-sm text-[#4f5b4f]">Δ {report.score?.deltaHealthScore?.toFixed?.(1)}</p>
          <p className="mt-2 text-xs text-[#6f7869]">Сенімділік: {report.meta?.confidencePct}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">NDVI: Маусым A vs Маусым B</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid stroke="#e6dfcc" strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Line type="monotone" dataKey="seasonA" stroke="#d97832" strokeWidth={2} dot={false} name="Маусым A" />
                <Line type="monotone" dataKey="seasonB" stroke="#2b7a4b" strokeWidth={2} dot={false} name="Маусым B" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Индекс Δ</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deltaBars}>
                <CartesianGrid stroke="#e6dfcc" strokeDasharray="3 3" />
                <XAxis dataKey="index" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="delta" fill="#1f2d26" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Негізгі факторлар</p>
          <ul className="mt-3 space-y-2 text-sm text-[#2f3a31]">
            {(report.weatherDrivers || []).map((d) => (
              <li key={d.factor}>
                <span className="font-semibold">{d.factor}</span>: {d.seasonA} -> {d.seasonB} (Δ {d.delta}) — {d.impact}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Тәуекел Δ</p>
          <ul className="mt-3 space-y-2 text-sm text-[#2f3a31]">
            {(report.risksDelta || []).map((r) => (
              <li key={r.riskId} className="rounded-xl border border-[#d9d2be] bg-white/70 p-2">
                <p><span className="font-semibold">{r.riskId}</span>: {r.change}</p>
                <ul className="mt-1 list-disc pl-5 text-xs text-[#5e675a]">{(r.evidence || []).map((e) => <li key={e}>{e}</li>)}</ul>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Фенология</p>
        <p className="mt-2 text-sm text-[#2f3a31]">
          Шың A: {report.phenology?.peakNdviA?.value} ({report.phenology?.peakNdviA?.date}), Шың B: {report.phenology?.peakNdviB?.value} ({report.phenology?.peakNdviB?.date}), Ығысу: {report.phenology?.peakShiftDays} күн
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Өнім айырмасы</p>
        <p className="mt-2 text-sm text-[#2f3a31]">
          Маусым A: {report.yieldEstimate?.yieldA_tpha} т/га, Маусым B: {report.yieldEstimate?.yieldB_tpha} т/га, Δ {report.yieldEstimate?.delta_tpha} т/га
        </p>
        <p className="mt-1 text-sm text-[#2f3a31]">Δ Табыс: ${report.yieldEstimate?.deltaRevenueUsd}</p>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Ұсынымдар</p>
        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
          {(report.recommendations || []).map((rec) => (
            <div key={`${rec.priority}-${rec.title}`} className="rounded-xl border border-[#d9d2be] bg-white/70 p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#7d8677]">{rec.priority}</p>
              <p className="mt-1 text-sm font-semibold text-[#273328]">{rec.title}</p>
              <ul className="mt-2 list-disc pl-5 text-xs text-[#5e675a]">{(rec.steps || []).map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#6f7869]">Шектеулер</p>
        <ul className="mt-2 list-disc pl-5 text-xs text-[#5e675a]">
          {(report.limitations || []).map((x) => <li key={x}>{x}</li>)}
        </ul>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="soft-button inline-flex items-center gap-2 rounded-full bg-[#1f2d26] px-5 py-2 text-sm font-semibold text-white">
          <Sparkles size={14} />Салыстыруды жабу
        </button>
      </div>
    </div>
  );
}

export default function AIReportPage({ request, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  const isSeasonCompare = request?.reportType === "seasonCompare";

  const headerSubtitle = useMemo(() => {
    if (!request) return "";
    if (isSeasonCompare) {
      return `${request?.compare?.seasonA?.label || "Маусым A"} vs ${request?.compare?.seasonB?.label || "Маусым B"}`;
    }
    const modeLabel = request.mode === "one" ? "бір алқап" : "барлық алқап";
    return `Режимі: ${modeLabel} • Кезең: ${request.periodLabel || "90 күн"}`;
  }, [request, isSeasonCompare]);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = getCacheKey(request);

    const run = async () => {
      setLoading(true);
      setError("");

      const cached = loadCached(cacheKey);
      if (cached && !cancelled) {
        const ok = isSeasonCompare ? isKazakhSeasonCompare(cached.report) : isKazakhFieldReport(cached.report);
        if (ok) {
          setReport(cached.report);
          setLoading(false);
          return;
        }
      }

      try {
        const { data, requestBody } = await fetchAnyReport(request);
        if (!cancelled) {
          const reportIsKazakh = isSeasonCompare ? isKazakhSeasonCompare(data.report) : isKazakhFieldReport(data.report);
          if (!reportIsKazakh) {
            const fallback = isSeasonCompare
              ? buildEmergencySeasonCompareReport(request)
              : buildEmergencyFieldReport(request);
            setReport(fallback);
            setError("AI жауабы қазақ тілінде болмады. Қазақша резервтік есеп көрсетілді.");
            return;
          }

          setReport(data.report);
          saveCached(cacheKey, { report: data.report, source: data.source, requestId: data.requestId, ts: Date.now() });
          if (data.error) {
            setError(data.error);
          } else if (isSeasonCompare && requestBody?.options?.dateAutoAdjusted) {
            setError("Таңдалған күндер бойынша дерек табылмады. Салыстыру бірдей ұзындықтағы соңғы екі қолжетімді аралықпен орындалды.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          const fallback = isSeasonCompare
            ? buildEmergencySeasonCompareReport(request)
            : buildEmergencyFieldReport(request);
          setReport(fallback);
          setError(`AI-сервер уақытша қолжетімсіз (${String(err.message || err)}). Жергілікті резервтік есеп көрсетілді.`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [request]);

  return (
    <section className="fixed inset-0 z-[1200] bg-[#111710]/70 p-4 backdrop-blur-sm">
      <div className="glass-panel h-full w-full animate-[fadeIn_.25s_ease-out] overflow-hidden rounded-3xl border-[#bcb6a3] bg-[#f7f3e8]/96">
        <header className="flex items-start justify-between border-b border-[#d8d2bf] px-8 py-6">
          <div>
            <p className="headline-font text-3xl font-semibold text-[#1f2b24]">
              {report?.title || (isSeasonCompare ? "Маусымдарды салыстыру" : "AI-есеп құрастырылуда")}
            </p>
            <p className="mt-1 text-sm text-[#687266]">{headerSubtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="soft-button rounded-full border border-[#cec8b5] bg-white p-2 text-[#435043]">
            <X size={18} />
          </button>
        </header>

        <div className="h-[calc(100%-93px)] overflow-y-auto px-8 py-6">
          {loading && (
            <div className="grid gap-4">
              <div className="glass-panel rounded-2xl p-5">
                <p className="flex items-center gap-2 text-[#3f4b3f]"><Loader2 className="animate-spin" size={16} />AI-талдау орындалып, есеп құрастырылуда...</p>
              </div>
            </div>
          )}

          {!loading && report && (isSeasonCompare ? (
            <SeasonCompareView report={report} request={request} error={error} onClose={onClose} />
          ) : (
            <FieldReportView report={report} error={error} onClose={onClose} />
          ))}

          {!loading && !report && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error || "Есепті құрастыру мүмкін болмады"}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
