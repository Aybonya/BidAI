export const sentinelHubConfig = {
  instanceId: import.meta.env.VITE_SENTINEL_HUB_INSTANCE_ID || "",
  maxcc: Number(import.meta.env.VITE_SENTINEL_HUB_MAXCC || 20),
  layers: {
    satellite: "NATURAL-COLOR",
    ndvi: "NDVI",
    ndmi: "NDMI",
    ndre: "NDRE",
    msavi: "MSAVI",
    reci: "RECI",
    ndwi: "NDWI",
    pri: "PRI",
    mcari: "MCARI",
    productivity: "PRODUCTIVITY",
    "soil-brightness": "SOIL_BRIGHTNESS",
    relief: "RELIEF",
    "ndvi-contrast": "NDVI_CONTRAST",
    smi: "SMI",
    "no-fill": ""
  }
};

