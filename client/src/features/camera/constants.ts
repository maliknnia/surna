export type CameraMode = "photo" | "video" | "story" | "reel" | "live";

export const CAMERA_MODES: { id: CameraMode; label: string }[] = [
  { id: "photo", label: "Photo" },
  { id: "video", label: "Video" },
  { id: "story", label: "Story" },
  { id: "reel", label: "Reel" },
  { id: "live", label: "Live" },
];

export type FilterCategory = "sport" | "cultural" | "cinematic" | "energy" | "ar";

export type CameraFilter = {
  id: string;
  name: string;
  category: FilterCategory;
  cssFilter: string;
  previewGradient: string;
  isAr?: boolean;
};

export const FILTER_CATEGORIES: { id: FilterCategory; label: string }[] = [
  { id: "sport", label: "Natural" },
  { id: "cultural", label: "Mood" },
  { id: "cinematic", label: "Film" },
  { id: "energy", label: "Bold" },
  { id: "ar", label: "AR" },
];

export const CAMERA_FILTERS: CameraFilter[] = [
  { id: "none", name: "Normal", category: "sport", cssFilter: "none", previewGradient: "linear-gradient(135deg,#444,#222)" },
  { id: "match-day", name: "Match Day", category: "sport", cssFilter: "contrast(1.15) saturate(1.35) hue-rotate(-8deg) brightness(1.05)", previewGradient: "linear-gradient(135deg,#1e4d2b,#0a1628)" },
  { id: "floodlights", name: "Floodlights", category: "sport", cssFilter: "contrast(1.25) brightness(1.2) saturate(0.9)", previewGradient: "linear-gradient(135deg,#e8e4d9,#1a1a2e)" },
  { id: "mud-glory", name: "Mud and Glory", category: "sport", cssFilter: "sepia(0.35) contrast(1.2) saturate(1.1)", previewGradient: "linear-gradient(135deg,#5c4033,#2d1f14)" },
  { id: "training", name: "Training Ground", category: "sport", cssFilter: "saturate(1.2) contrast(1.05) brightness(0.95)", previewGradient: "linear-gradient(135deg,#3d5a3d,#1a2e1a)" },
  { id: "tunnel", name: "Tunnel", category: "sport", cssFilter: "brightness(0.75) contrast(1.3) saturate(0.8)", previewGradient: "linear-gradient(135deg,#111,#333)" },
  { id: "half-time", name: "Half Time", category: "sport", cssFilter: "saturate(0.85) contrast(1.1) brightness(1.08)", previewGradient: "linear-gradient(135deg,#4a5568,#2d3748)" },
  { id: "victory", name: "Victory", category: "sport", cssFilter: "saturate(1.5) contrast(1.15) brightness(1.1) hue-rotate(5deg)", previewGradient: "linear-gradient(135deg,#fbbf24,#7c3aed)" },
  { id: "last-minute", name: "Last Minute", category: "sport", cssFilter: "contrast(1.35) saturate(1.4) brightness(0.9)", previewGradient: "linear-gradient(135deg,#dc2626,#1e1b4b)" },
  { id: "cork-green", name: "Cork Green", category: "cultural", cssFilter: "hue-rotate(85deg) saturate(1.4) contrast(1.1)", previewGradient: "linear-gradient(135deg,#166534,#14532d)" },
  { id: "emerald-isle", name: "Emerald Isle", category: "cultural", cssFilter: "hue-rotate(95deg) saturate(1.25) brightness(1.05)", previewGradient: "linear-gradient(135deg,#059669,#064e3b)" },
  { id: "rebel-red", name: "Rebel Red", category: "cultural", cssFilter: "hue-rotate(-25deg) saturate(1.5) contrast(1.15)", previewGradient: "linear-gradient(135deg,#b91c1c,#7f1d1d)" },
  { id: "lahore-gold", name: "Lahore Gold", category: "cultural", cssFilter: "sepia(0.25) saturate(1.3) hue-rotate(15deg) brightness(1.1)", previewGradient: "linear-gradient(135deg,#d97706,#92400e)" },
  { id: "mumbai-blue", name: "Mumbai Blue", category: "cultural", cssFilter: "hue-rotate(190deg) saturate(1.2) contrast(1.1)", previewGradient: "linear-gradient(135deg,#2563eb,#1e3a8a)" },
  { id: "dublin-grey", name: "Dublin Grey", category: "cultural", cssFilter: "saturate(0.4) contrast(1.15) brightness(1.05)", previewGradient: "linear-gradient(135deg,#6b7280,#374151)" },
  { id: "documentary", name: "Documentary", category: "cinematic", cssFilter: "contrast(1.1) saturate(0.75) sepia(0.15)", previewGradient: "linear-gradient(135deg,#78716c,#44403c)" },
  { id: "champions", name: "Champions League", category: "cinematic", cssFilter: "contrast(1.2) saturate(1.1) brightness(0.92) hue-rotate(-5deg)", previewGradient: "linear-gradient(135deg,#1e3a5f,#0f172a)" },
  { id: "underdog", name: "Underdog", category: "cinematic", cssFilter: "contrast(1.25) saturate(0.9) brightness(0.88)", previewGradient: "linear-gradient(135deg,#292524,#1c1917)" },
  { id: "legacy", name: "Legacy", category: "cinematic", cssFilter: "sepia(0.4) contrast(1.15) saturate(0.85)", previewGradient: "linear-gradient(135deg,#a8a29e,#57534e)" },
  { id: "broadcast", name: "Broadcast", category: "cinematic", cssFilter: "contrast(1.3) saturate(1.25) brightness(1.05)", previewGradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
  { id: "press-box", name: "Press Box", category: "cinematic", cssFilter: "saturate(0.7) contrast(1.2) brightness(1.1)", previewGradient: "linear-gradient(135deg,#e5e7eb,#9ca3af)" },
  { id: "pre-match", name: "Pre Match", category: "energy", cssFilter: "saturate(1.35) contrast(1.1) brightness(1.05)", previewGradient: "linear-gradient(135deg,#7c3aed,#4c1d95)" },
  { id: "in-zone", name: "In The Zone", category: "energy", cssFilter: "contrast(1.2) saturate(1.5) brightness(0.95)", previewGradient: "linear-gradient(135deg,#06b6d4,#0891b2)" },
  { id: "grind", name: "Grind", category: "energy", cssFilter: "contrast(1.35) saturate(0.95) brightness(0.9)", previewGradient: "linear-gradient(135deg,#374151,#111827)" },
  { id: "winning", name: "Winning", category: "energy", cssFilter: "saturate(1.6) contrast(1.15) brightness(1.12) hue-rotate(8deg)", previewGradient: "linear-gradient(135deg,#facc15,#ea580c)" },
  { id: "legendary", name: "Legendary", category: "energy", cssFilter: "contrast(1.25) saturate(1.45) brightness(1.08) sepia(0.1)", previewGradient: "linear-gradient(135deg,#fcd34d,#7c3aed)" },
  { id: "score-badge", name: "Score Badge", category: "ar", cssFilter: "none", previewGradient: "linear-gradient(135deg,#7c3aed,#4c1d95)", isAr: true },
  { id: "lightning", name: "Lightning Bolt", category: "ar", cssFilter: "none", previewGradient: "linear-gradient(135deg,#fbbf24,#7c3aed)", isAr: true },
  { id: "stadium", name: "Stadium Crowd", category: "ar", cssFilter: "none", previewGradient: "linear-gradient(135deg,#1e40af,#0f172a)", isAr: true },
  { id: "trophy-ar", name: "Trophy", category: "ar", cssFilter: "none", previewGradient: "linear-gradient(135deg,#eab308,#a16207)", isAr: true },
  { id: "cork-pin", name: "Cork Pin", category: "ar", cssFilter: "none", previewGradient: "linear-gradient(135deg,#166534,#14532d)", isAr: true },
  { id: "surna-stamp", name: "SURNA Stamp", category: "ar", cssFilter: "none", previewGradient: "linear-gradient(135deg,#7c3aed,#000)", isAr: true },
];

export const GIF_CATEGORIES = [
  "Trending",
  "Sports",
  "Celebration",
  "Reactions",
  "GAA",
  "Football",
  "Cricket",
] as const;

export const STICKER_CATEGORIES = [
  "Sport",
  "Location",
  "Score",
  "Weather",
  "Time",
  "SURNA",
] as const;

/** @deprecated use EDITOR_COLORS from cameraTheme */
export const TEXT_COLORS = ["#FFFFFF", "#000000", "#FF453A", "#FFD60A"] as const;
/** @deprecated use EDITOR_COLORS from cameraTheme */
export const DRAW_COLORS = ["#FFFFFF", "#000000", "#FF453A", "#FFD60A"] as const;

export const SPORT_TAGS = [
  "Football",
  "GAA",
  "Rugby",
  "Basketball",
  "Running",
  "MMA",
  "Tennis",
  "Other",
] as const;
