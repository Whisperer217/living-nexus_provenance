const hexToRgb = (hex) => {
  const normalized = hex.replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16) / 255);
};

const channel = (value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [red, green, blue] = hexToRgb(hex).map(channel);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};
const contrast = (foreground, background) => {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

const surface = "#080603";
const textPairs = [
  ["primary", "#F5EDD8", 4.5],
  ["muted", "#D2C7AF", 4.5],
  ["soft", "#B9AD94", 4.5],
];
const themes = {
  "cathedral-dark": { accent: "#C49A28", actionText: "#0A0806" },
  crimson: { accent: "#E8294F", actionText: "#080603" },
  "illuminated-gold": { accent: "#F5C842", actionText: "#0A0806" },
  "parchment-cream": { accent: "#8F6418", actionText: "#FFF7EA" },
};

let failed = false;
for (const [label, foreground, minimum] of textPairs) {
  const ratio = contrast(foreground, surface);
  console.log(`text:${label} ${ratio.toFixed(2)}:1`);
  if (ratio < minimum) failed = true;
}
for (const [theme, { accent, actionText }] of Object.entries(themes)) {
  const ratio = contrast(actionText, accent);
  console.log(`action:${theme} ${ratio.toFixed(2)}:1`);
  if (ratio < 4.5) failed = true;
}
if (failed) process.exitCode = 1;
