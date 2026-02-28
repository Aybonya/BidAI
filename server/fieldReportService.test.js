import test from "node:test";
import assert from "node:assert/strict";
import { buildFallbackReport, buildStats, isValidFieldReport } from "./fieldReportService.js";

test("fallback report matches schema", () => {
  const field = {
    id: "f-test",
    name: "Тестовое поле",
    cropType: "Пшеница",
    areaHa: 42,
    centroidLat: 53.2,
    centroidLng: 50.2
  };

  const indicesTimeseries = [
    { date: "2026-02-01", NDVI_mean: 0.62, NDMI_mean: 0.18, NDRE_mean: 0.24, RECI_mean: 1.8, NDVI_p10: 0.42, NDVI_p90: 0.75 },
    { date: "2026-02-10", NDVI_mean: 0.58, NDMI_mean: 0.15, NDRE_mean: 0.2, RECI_mean: 1.6, NDVI_p10: 0.38, NDVI_p90: 0.72 }
  ];

  const weatherTimeseries = [
    { date: "2026-02-01", tempAvgC: 12, tempMaxC: 18, precipMm: 4, windMs: 3, humidityPct: 55 },
    { date: "2026-02-10", tempAvgC: 14, tempMaxC: 20, precipMm: 2, windMs: 2, humidityPct: 50 }
  ];

  const stats = buildStats({ indicesTimeseries, weatherTimeseries, period: { startDate: "2026-02-01", endDate: "2026-02-10" } });
  const report = buildFallbackReport({ field, stats, pricePerTon: 220 });

  assert.equal(isValidFieldReport(report), true);
  assert.equal(report.meta.fieldId, "f-test");
});
