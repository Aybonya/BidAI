export const indexLayers = [
  { id: "satellite", label: "Спутниктік сурет", palette: null, hideLegend: true },
  { id: "ndvi", label: "NDVI", palette: "ndvi", min: 0, max: 1 },
  { id: "ndmi", label: "NDMI", palette: "ndmi", min: -0.2, max: 0.8 },
  { id: "ndre", label: "NDRE", palette: "ndre", min: 0, max: 1 },
  { id: "msavi", label: "MSAVI", palette: "msavi", min: 0, max: 1 },
  { id: "reci", label: "RECI", palette: "reci", min: 0, max: 5 },
  { id: "ndwi", label: "NDWI", palette: "ndwi", min: -0.4, max: 0.8 },
  { id: "pri", label: "PRI", palette: "pri", min: -0.2, max: 0.2 },
  { id: "mcari", label: "MCARI", palette: "mcari", min: 0, max: 2 },
];

export const palettes = {
  productivity: ["#1c1f26", "#24364a", "#1e4b59", "#1f6b5c", "#2b8c4a", "#6bbf45"],
  soil: ["#1e1b16", "#3b2f1f", "#5b3d1e", "#7a4a1f", "#9a5a22", "#c37a35"],
  relief: ["#1a1b21", "#2b2f40", "#3b4357", "#4b5872", "#5e7391", "#7a94b5"],
  ndvi: ["#5d1a1a", "#7a3a1b", "#8f5c1c", "#a7891e", "#8cc63f", "#2a9d50"],
  ndviContrast: ["#2b0f0f", "#5b1f1f", "#7e3a1f", "#a65e1f", "#77b339", "#1f8f45"],
  ndmi: ["#1b2433", "#21405a", "#1f5b7a", "#1b7a8f", "#2d9ca0", "#5fbfc0"],
  smi: ["#1a1a1a", "#2f2f2f", "#4a4a4a", "#6b6b6b", "#8f8f8f", "#b3b3b3"],
  ndre: ["#2a1b2e", "#4a1f44", "#6b2a54", "#8a3d5b", "#b85c4f", "#e28a3a"],
  msavi: ["#3a1b14", "#5c2a1c", "#7a3d22", "#9a5c2a", "#b28f3d", "#74b74a"],
  reci: ["#221f2a", "#3b2f4a", "#5b3f6b", "#7a4f8a", "#9b6bb0", "#c48fe0"],
  ndwi: ["#132129", "#173747", "#184e66", "#1a6b7f", "#1f8f8c", "#38bfa3"],
  pri: ["#1e1a2b", "#2e1f4a", "#3e2f6b", "#4a4f8a", "#5b7ab0", "#7ea8e0"],
  mcari: ["#2b1b14", "#4a2a1d", "#6b3d26", "#8a5b33", "#b38a40", "#e2bf4a"]
};

