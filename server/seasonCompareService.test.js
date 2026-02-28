import test from "node:test";
import assert from "node:assert/strict";
import { isValidSeasonCompare, safeGenerateSeasonCompare } from "./seasonCompareService.js";

test("season compare fallback matches schema", async () => {
  const payload = {
    field: { id: "f1", name: "Field 1", cropType: "Пшеница", areaHa: 50, centroidLat: 53.2, centroidLng: 50.2 },
    seasonA: {
      label: "Summer 2022",
      startDate: "2022-06-01",
      endDate: "2022-09-01",
      indicesTimeseries: [
        { date: "2022-06-10", NDVI_mean: 0.55, NDMI_mean: 0.18, NDRE_mean: 0.24, NDVI_p10: 0.42, NDVI_p90: 0.71 },
        { date: "2022-07-10", NDVI_mean: 0.62, NDMI_mean: 0.2, NDRE_mean: 0.26, NDVI_p10: 0.5, NDVI_p90: 0.76 }
      ],
      weatherTimeseries: [
        { date: "2022-06-10", tempAvgC: 20, tempMaxC: 30, precipMm: 5 },
        { date: "2022-07-10", tempAvgC: 24, tempMaxC: 34, precipMm: 2 }
      ]
    },
    seasonB: {
      label: "Summer 2023",
      startDate: "2023-06-01",
      endDate: "2023-09-01",
      indicesTimeseries: [
        { date: "2023-06-10", NDVI_mean: 0.58, NDMI_mean: 0.19, NDRE_mean: 0.25, NDVI_p10: 0.45, NDVI_p90: 0.74 },
        { date: "2023-07-10", NDVI_mean: 0.66, NDMI_mean: 0.22, NDRE_mean: 0.28, NDVI_p10: 0.52, NDVI_p90: 0.8 }
      ],
      weatherTimeseries: [
        { date: "2023-06-10", tempAvgC: 21, tempMaxC: 31, precipMm: 6 },
        { date: "2023-07-10", tempAvgC: 25, tempMaxC: 35, precipMm: 3 }
      ]
    },
    options: { pricePerTonUsd: 220 }
  };

  const result = await safeGenerateSeasonCompare(payload);
  assert.equal(isValidSeasonCompare(result.report), true);
});
