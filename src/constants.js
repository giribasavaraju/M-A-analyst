export const C = {
  bg: "#0D0F1A",
  surface: "#13162A",
  card: "#1A1E35",
  border: "#252A45",
  accent: "#00E5C3",
  accent2: "#FF6B6B",
  accent3: "#FFB800",
  accent4: "#7B6FFF",
  text: "#E8ECF4",
  muted: "#6B7494",
  green: "#00C896",
  red: "#FF4757",
  yellow: "#FFD32A",
  blue: "#4A9EFF",
};

export const TA_COLORS = {
  Oncology: "#FF6B6B",
  Immunology: "#7B6FFF",
  Diabetes: "#FFB800",
  Cardiovascular: "#FF4757",
  Neurology: "#00E5C3",
  Vaccines: "#4A9EFF",
  Other: "#6B7494",
};

export const TIER_CONFIG = {
  Blockbuster: { color: "#FFB800", min: 10000, label: "> $10B" },
  "Major Brand": { color: "#00E5C3", min: 1000, label: "$1B–$10B" },
  "Mid-Market": { color: "#7B6FFF", min: 100, label: "$100M–$1B" },
  Emerging: { color: "#4A9EFF", min: 0, label: "< $100M" },
};

export const GROWTH_CONFIG = [
  { label: "High Growth", color: "#00C896", min: 50 },
  { label: "Growth", color: "#4A9EFF", min: 10 },
  { label: "Stable", color: "#6B7494", min: -10 },
  { label: "Decline", color: "#FFB800", min: -30 },
  { label: "Sig. Decline", color: "#FF4757", min: -Infinity },
];
