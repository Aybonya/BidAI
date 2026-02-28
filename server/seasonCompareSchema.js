export const seasonCompareSchema = {
  $id: "SeasonCompareReport",
  type: "object",
  additionalProperties: false,
  required: [
    "meta",
    "headline",
    "score",
    "indexComparison",
    "phenology",
    "weatherDrivers",
    "risksDelta",
    "yieldEstimate",
    "recommendations",
    "limitations"
  ],
  properties: {
    meta: {
      type: "object",
      additionalProperties: false,
      required: ["fieldId", "cropType", "seasonA", "seasonB", "generatedAt", "confidencePct"],
      properties: {
        fieldId: { type: "string" },
        cropType: { type: "string" },
        seasonA: {
          type: "object",
          additionalProperties: false,
          required: ["label", "startDate", "endDate"],
          properties: {
            label: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" }
          }
        },
        seasonB: {
          type: "object",
          additionalProperties: false,
          required: ["label", "startDate", "endDate"],
          properties: {
            label: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" }
          }
        },
        generatedAt: { type: "string" },
        confidencePct: { type: "number" }
      }
    },
    headline: { type: "string" },
    score: {
      type: "object",
      additionalProperties: false,
      required: ["healthScoreA", "healthScoreB", "deltaHealthScore"],
      properties: {
        healthScoreA: { type: "number" },
        healthScoreB: { type: "number" },
        deltaHealthScore: { type: "number" }
      }
    },
    indexComparison: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "meanA", "meanB", "delta", "interpretation"],
        properties: {
          index: { type: "string" },
          meanA: { type: "number" },
          meanB: { type: "number" },
          delta: { type: "number" },
          interpretation: { type: "string" }
        }
      }
    },
    phenology: {
      type: "object",
      additionalProperties: false,
      required: ["peakNdviA", "peakNdviB", "peakShiftDays", "notes"],
      properties: {
        peakNdviA: {
          type: "object",
          additionalProperties: false,
          required: ["value", "date"],
          properties: {
            value: { type: "number" },
            date: { type: "string" }
          }
        },
        peakNdviB: {
          type: "object",
          additionalProperties: false,
          required: ["value", "date"],
          properties: {
            value: { type: "number" },
            date: { type: "string" }
          }
        },
        peakShiftDays: { type: "number" },
        notes: { type: "array", items: { type: "string" } }
      }
    },
    weatherDrivers: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["factor", "seasonA", "seasonB", "delta", "impact"],
        properties: {
          factor: { type: "string" },
          seasonA: { type: "number" },
          seasonB: { type: "number" },
          delta: { type: "number" },
          impact: { type: "string" }
        }
      }
    },
    risksDelta: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["riskId", "change", "evidence", "whatToDoNextSeason"],
        properties: {
          riskId: {
            type: "string",
            enum: ["moisture_deficit", "heat_stress", "nitrogen_deficit", "disease_pest", "other"]
          },
          change: { type: "string", enum: ["decreased", "increased", "unchanged"] },
          evidence: { type: "array", items: { type: "string" } },
          whatToDoNextSeason: { type: "array", items: { type: "string" } }
        }
      }
    },
    yieldEstimate: {
      type: "object",
      additionalProperties: false,
      required: ["yieldA_tpha", "yieldB_tpha", "delta_tpha", "deltaRevenueUsd"],
      properties: {
        yieldA_tpha: { type: "number" },
        yieldB_tpha: { type: "number" },
        delta_tpha: { type: "number" },
        deltaRevenueUsd: { type: "number" }
      }
    },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["priority", "title", "steps"],
        properties: {
          priority: { type: "string", enum: ["high", "medium", "low"] },
          title: { type: "string" },
          steps: { type: "array", items: { type: "string" } }
        }
      }
    },
    limitations: { type: "array", items: { type: "string" } }
  }
};
