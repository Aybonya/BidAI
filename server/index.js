import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { safeGenerateFieldReport } from "./fieldReportService.js";
import { safeGenerateSeasonCompare } from "./seasonCompareService.js";
import { safeAssistantReply } from "./assistantService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadEnvFromFile = () => {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = value.replace(/^['"]|['"]$/g, "");
  }
};

loadEnvFromFile();

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.post("/api/ai/field-report", async (req, res) => {
  const { field, period, indicesTimeseries, weatherTimeseries, baseline, pricePerTon } = req.body || {};

  if (!field || !field.id || !field.name) {
    return res.status(400).json({ error: "field.id и field.name обязательны" });
  }

  const result = await safeGenerateFieldReport({
    field,
    period,
    indicesTimeseries: Array.isArray(indicesTimeseries) ? indicesTimeseries : [],
    weatherTimeseries: Array.isArray(weatherTimeseries) ? weatherTimeseries : [],
    baseline,
    pricePerTon
  });

  if (result.openai?.requestId) {
    const cost = result.openai.estimatedCostUsd?.toFixed(6);
    console.log(`[ai-report] request_id=${result.openai.requestId} source=${result.source} est_cost_usd=${cost}`);
  } else {
    console.log(`[ai-report] source=${result.source} ${result.error ? `error=${result.error}` : ""}`);
  }

  res.json({
    report: result.report,
    source: result.source,
    requestId: result.openai?.requestId || null,
    estimatedCostUsd: result.openai?.estimatedCostUsd || null,
    error: result.error || null
  });
});

app.post("/api/ai/season-compare", async (req, res) => {
  const { field, seasonA, seasonB, options } = req.body || {};
  if (!field?.id || !field?.name) {
    return res.status(400).json({ error: "field.id и field.name обязательны" });
  }
  if (!seasonA?.startDate || !seasonA?.endDate || !seasonB?.startDate || !seasonB?.endDate) {
    return res.status(400).json({ error: "seasonA/seasonB startDate/endDate обязательны" });
  }

  const result = await safeGenerateSeasonCompare({
    field,
    seasonA: {
      ...seasonA,
      indicesTimeseries: Array.isArray(seasonA.indicesTimeseries) ? seasonA.indicesTimeseries : [],
      weatherTimeseries: Array.isArray(seasonA.weatherTimeseries) ? seasonA.weatherTimeseries : []
    },
    seasonB: {
      ...seasonB,
      indicesTimeseries: Array.isArray(seasonB.indicesTimeseries) ? seasonB.indicesTimeseries : [],
      weatherTimeseries: Array.isArray(seasonB.weatherTimeseries) ? seasonB.weatherTimeseries : []
    },
    options: options || {}
  });

  if (result.openai?.requestId) {
    console.log(
      `[season-compare] request_id=${result.openai.requestId} source=${result.source} est_cost_usd=${result.openai.estimatedCostUsd?.toFixed(6)}`
    );
  } else {
    console.log(`[season-compare] source=${result.source} ${result.error ? `error=${result.error}` : ""}`);
  }

  res.json({
    report: result.report,
    source: result.source,
    requestId: result.openai?.requestId || null,
    estimatedCostUsd: result.openai?.estimatedCostUsd || null,
    error: result.error || null
  });
});

app.post("/api/ai/assistant", async (req, res) => {
  const { messages, context } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: "messages is required" });
  }

  const result = await safeAssistantReply({
    messages,
    context: context || {}
  });

  if (result.openai?.requestId) {
    console.log(`[ai-assistant] request_id=${result.openai.requestId} source=${result.source}`);
  } else {
    console.log(`[ai-assistant] source=${result.source} ${result.error ? `error=${result.error}` : ""}`);
  }

  res.json({
    reply: result.reply,
    source: result.source,
    requestId: result.openai?.requestId || null,
    error: result.error || null
  });
});

app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
