import { X } from "lucide-react";
import { STICKER_CATEGORIES } from "./constants";
import { CAMERA_BG, CAMERA_CARD, CAMERA_PURPLE, CAMERA_TEXT } from "./cameraTheme";
import { useCameraEmbed } from "./SurnaCameraContent";

const STICKERS: Record<string, string[]> = {
  Sport: ["⚽", "🏀", "🏈", "🎾", "🏉", "🥊", "🏃", "🏋️", "🧘", "🏊"],
  Location: ["📍 Dublin", "📍 Cork", "📍 Galway", "📍 Lahore", "📍 Mumbai"],
  Score: ["2 - 1", "3 - 0", "1 - 1", "FT", "HT"],
  Weather: ["☀️", "🌧️", "❄️", "💨", "🌤️"],
  Time: [new Date().toLocaleDateString(), new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })],
  SURNA: ["⚡", "🏆", "SURNA", "🔥", "💪"],
};

type Props = {
  onClose: () => void;
  onPick: (label: string) => void;
};

export default function StickerSheet({ onClose, onPick }: Props) {
  const embedded = useCameraEmbed();
  return (
    <div
      className={`${embedded ? "absolute" : "fixed"} inset-0 z-[220] flex flex-col justify-end`}
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="surna-camera-sheet-up"
        onClick={(e) => e.stopPropagation()}
        style={{ background: CAMERA_BG, borderRadius: "24px 24px 0 0", padding: 16, paddingBottom: "max(20px, env(safe-area-inset-bottom))", maxHeight: "50vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ color: CAMERA_TEXT, fontWeight: 800, fontSize: 16 }}>Stickers</span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none" }}><X color="#fff" /></button>
        </div>
        {STICKER_CATEGORIES.map((cat) => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>{cat}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(STICKERS[cat] ?? []).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onPick(s)}
                  style={{ padding: "10px 14px", borderRadius: 12, border: "none", background: CAMERA_CARD, color: CAMERA_TEXT, fontSize: cat === "Sport" ? 24 : 13, fontWeight: 600 }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
