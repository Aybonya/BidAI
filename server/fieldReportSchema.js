export const fieldReportSchema = {
  $id: "FieldReport",
  type: "object",
  additionalProperties: false,
  required: [
    "meta",
    "executiveSummary",
    "keyFindings",
    "risks",
    "actions",
    "numbers",
    "explanations"
  ],
  properties: {
    meta: {
      type: "object",
      additionalProperties: false,
      required: ["fieldId", "cropType", "periodDays", "generatedAt", "modelConfidencePct"],
      properties: {
        fieldId: { type: "string" },
        cropType: { type: "string" },
        periodDays: { type: "number" },
        generatedAt: { type: "string" },
        modelConfidencePct: { type: "number", minimum: 0, maximum: 100 }
      }
    },
    executiveSummary: { type: "string" },
    keyFindings: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "label"],
        properties: {
          type: { type: "string" },
          label: { type: "string" },
          value: { type: "number" },
          unit: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          valueText: { type: "string" }
        }
      }
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "severity", "evidence", "recommendedCheck"],
        properties: {
          id: {
            type: "string",
            enum: [
              "moisture_deficit",
              "heat_stress",
              "nitrogen_deficit",
              "disease_pest",
              "flooding",
              "other"
            ]
          },
          title: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          evidence: { type: "array", items: { type: "string" } },
          recommendedCheck: { type: "string" }
        }
      }
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["priority", "title", "timeWindow", "expectedImpact", "howTo"],
        properties: {
          priority: { type: "string", enum: ["high", "medium", "low"] },
          title: { type: "string" },
          timeWindow: { type: "string", enum: ["шұғыл", "осы аптада", "тұрақты"] },
          expectedImpact: { type: "string" },
          howTo: { type: "array", items: { type: "string" } }
        }
      }
    },
    numbers: {
      type: "object",
      additionalProperties: false,
      required: [
        "stressScorePct",
        "predictedYieldTpha",
        "potentialYieldLossPct",
        "potentialRevenueLossUsd",
        "anomalyAreaPct"
      ],
      properties: {
        stressScorePct: { type: "number" },
        predictedYieldTpha: { type: "number" },
        potentialYieldLossPct: { type: "number" },
        potentialRevenueLossUsd: { type: "number" },
        anomalyAreaPct: { type: "number" }
      }
    },
    explanations: {
      type: "object",
      additionalProperties: false,
      required: ["whyThisConclusion", "dataUsed", "limitations"],
      properties: {
        whyThisConclusion: { type: "array", items: { type: "string" } },
        dataUsed: { type: "array", items: { type: "string" } },
        limitations: { type: "array", items: { type: "string" } }
      }
    }
  }
};
