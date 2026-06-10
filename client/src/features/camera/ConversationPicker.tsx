import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { CAMERA_BG, CAMERA_CARD, CAMERA_PURPLE, CAMERA_TEXT } from "./cameraTheme";
import { useCameraEmbed } from "./SurnaCameraContent";

type Props = {
  onSelect: (conversationId: string) => void;
  onClose: () => void;
};

export default function ConversationPicker({ onSelect, onClose }: Props) {
  const embedded = useCameraEmbed();
  const { data } = useQuery<{ items?: { id: string; peer?: { displayName?: string } }[] }>({
    queryKey: ["/api/messenger/dm/conversations"],
    queryFn: async () => {
      const r = await fetch("/api/messenger/dm/conversations", { credentials: "include" });
      if (!r.ok) return { items: [] };
      return r.json();
    },
  });

  const items = data?.items ?? [];

  return (
    <div
      className={`${embedded ? "absolute" : "fixed"} inset-0 z-[225] flex flex-col justify-end`}
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="surna-camera-sheet-up"
        onClick={(e) => e.stopPropagation()}
        style={{ background: CAMERA_BG, borderRadius: "24px 24px 0 0", padding: 16, maxHeight: "60vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ color: CAMERA_TEXT, fontWeight: 800 }}>Send to chat</span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none" }}><X color="#fff" /></button>
        </div>
        {items.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>No conversations yet</p>
        ) : (
          items.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: 14,
                marginBottom: 8,
                borderRadius: 12,
                border: "none",
                background: CAMERA_CARD,
                color: CAMERA_TEXT,
                fontWeight: 600,
              }}
            >
              {c.peer?.displayName ?? "Chat"}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
