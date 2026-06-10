import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { GIF_CATEGORIES } from "./constants";
import { fetchGifs, type GiphyItem } from "./giphyApi";
import { CAMERA_BG, CAMERA_CARD, CAMERA_PURPLE, CAMERA_TEXT, CAMERA_MUTED } from "./cameraTheme";
import { useSurnaCamera } from "./SurnaCameraContext";
import { useCameraEmbed } from "./SurnaCameraContent";

type Props = {
  onSelect: (gif: GiphyItem) => void;
};

export default function GifPickerSheet({ onSelect }: Props) {
  const { requestClose } = useSurnaCamera();
  const embedded = useCameraEmbed();
  const [category, setCategory] = useState<string>(GIF_CATEGORIES[0]);
  const [search, setSearch] = useState("");
  const [gifs, setGifs] = useState<GiphyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchGifs(category, search)
      .then((list) => {
        if (!cancelled) setGifs(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, search]);

  return (
    <div
      className={`${embedded ? "absolute" : "fixed"} inset-0 z-[210] flex flex-col justify-end surna-camera-sheet-up`}
      style={{ background: "rgba(0,0,0,0.65)", fontFamily: "Inter, sans-serif" }}
      onClick={requestClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: CAMERA_BG,
          borderRadius: "24px 24px 0 0",
          maxHeight: "78vh",
          display: "flex",
          flexDirection: "column",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: CAMERA_TEXT }}>GIFs</h2>
          <button type="button" onClick={requestClose} style={{ background: "none", border: "none" }}>
            <X size={22} color={CAMERA_TEXT} />
          </button>
        </div>

        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: CAMERA_CARD, borderRadius: 12, padding: "10px 12px" }}>
            <Search size={18} color={CAMERA_MUTED} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search GIFs..."
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: CAMERA_TEXT, fontSize: 14 }}
            />
          </div>
        </div>

        <div className="surna-camera-no-scrollbar" style={{ display: "flex", gap: 8, padding: "0 16px 12px", overflowX: "auto" }}>
          {GIF_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: 99,
                border: "none",
                fontSize: 12,
                fontWeight: 700,
                background: category === c ? CAMERA_PURPLE : CAMERA_CARD,
                color: CAMERA_TEXT,
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
          {loading ? (
            <p style={{ color: CAMERA_MUTED, textAlign: "center", padding: 24 }}>Loading...</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {gifs.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onSelect(g)}
                  style={{ border: "none", padding: 0, borderRadius: 8, overflow: "hidden", aspectRatio: "1", background: CAMERA_CARD }}
                >
                  <img src={g.preview} alt={g.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
