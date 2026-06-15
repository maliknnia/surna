import { useState } from "react";
import { Plus } from "lucide-react";
import { getSportColor } from "@/lib/sportColors";

export type DiscoveryCircleItem = {
  id: string;
  name: string;
  imageUrl?: string | null;
  emoji?: string;
  sport?: string | null;
  verified?: boolean;
};

type DiscoveryCircleStripProps = {
  items: DiscoveryCircleItem[];
  onItemClick: (id: string) => void;
  onCreate?: () => void;
  createLabel?: string;
  loading?: boolean;
};

function sportRingGradient(sport?: string | null): string {
  const { base, light } = getSportColor(sport);
  return `linear-gradient(135deg, ${light} 0%, ${base} 55%, ${base} 100%)`;
}

function CircleSkeleton() {
  return (
    <div className="discovery-circle-item shrink-0">
      <div className="discovery-circle-ring animate-pulse" style={{ background: "var(--surna-surface)" }}>
        <div className="discovery-circle-inner" style={{ background: "var(--surna-elevated)" }} />
      </div>
      <div
        className="mt-2.5 h-2.5 w-14 rounded-full animate-pulse mx-auto"
        style={{ background: "var(--surna-surface)" }}
      />
    </div>
  );
}

export default function DiscoveryCircleStrip({
  items,
  onItemClick,
  onCreate,
  createLabel = "Create",
  loading = false,
}: DiscoveryCircleStripProps) {
  const [pressedId, setPressedId] = useState<string | null>(null);

  if (!loading && items.length === 0 && !onCreate) return null;

  return (
    <div className="discovery-circle-strip">
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
        <div className="flex gap-4 pb-1">
          {loading
            ? Array.from({ length: 7 }).map((_, i) => <CircleSkeleton key={i} />)
            : items.map((item) => {
                const isPressed = pressedId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="discovery-circle-item shrink-0 text-left"
                    style={{
                      transform: isPressed ? "scale(0.94)" : "scale(1)",
                      transition: "transform 0.15s ease",
                    }}
                    onPointerDown={() => setPressedId(item.id)}
                    onPointerUp={() => setPressedId(null)}
                    onPointerLeave={() => setPressedId(null)}
                    onPointerCancel={() => setPressedId(null)}
                    onClick={() => onItemClick(item.id)}
                  >
                    <div
                      className="discovery-circle-ring"
                      style={{ background: sportRingGradient(item.sport) }}
                    >
                      <div className="discovery-circle-inner">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="discovery-circle-emoji" aria-hidden>
                            {item.emoji || "🏆"}
                          </span>
                        )}
                      </div>
                      {item.verified ? (
                        <span className="discovery-circle-verified" aria-label="Verified">
                          ✓
                        </span>
                      ) : null}
                    </div>
                    <span className="discovery-circle-name">{item.name}</span>
                  </button>
                );
              })}

          {!loading && onCreate ? (
            <button type="button" className="discovery-circle-item shrink-0 text-left" onClick={onCreate}>
              <div className="discovery-circle-ring discovery-circle-ring--create">
                <div className="discovery-circle-inner discovery-circle-inner--create">
                  <Plus size={26} style={{ color: "var(--surna-text-secondary)" }} />
                </div>
              </div>
              <span className="discovery-circle-name" style={{ color: "var(--surna-text-secondary)" }}>
                {createLabel}
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
