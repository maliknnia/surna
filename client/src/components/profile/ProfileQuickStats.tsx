import { Shield, Target } from "lucide-react";

type ProfileQuickStatsProps = {
  winRate: number;
  level: number;
  onWinRateClick?: () => void;
  onLevelClick?: () => void;
};

export function ProfileQuickStats({ winRate, level, onWinRateClick, onLevelClick }: ProfileQuickStatsProps) {
  return (
    <section className="mb-5" aria-label="Quick Stats">
      <h3 className="text-[15px] font-semibold mb-2.5" style={{ color: "var(--surna-text)" }}>
        Quick Stats
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onWinRateClick}
          className="rounded-xl border p-4 text-left active:opacity-80 transition-opacity"
          style={{ borderColor: "var(--surna-border)", background: "var(--surna-elevated)" }}
          data-testid="profile-quick-win-rate"
        >
          <Target className="w-5 h-5 mb-2" style={{ color: "var(--surna-text-secondary)" }} strokeWidth={1.75} />
          <div className="text-[28px] font-bold leading-none tabular-nums" style={{ color: "var(--surna-text)" }}>
            {winRate}%
          </div>
          <div className="text-[13px] mt-1" style={{ color: "var(--surna-text-secondary)" }}>
            Win Rate
          </div>
        </button>

        <button
          type="button"
          onClick={onLevelClick}
          className="rounded-xl border p-4 text-left active:opacity-80 transition-opacity"
          style={{ borderColor: "var(--surna-border)", background: "var(--surna-elevated)" }}
          data-testid="profile-quick-level"
        >
          <Shield className="w-5 h-5 mb-2" style={{ color: "var(--surna-text-secondary)" }} strokeWidth={1.75} />
          <div
            className="text-[28px] font-bold leading-none tabular-nums"
            style={{ color: "var(--surna-gold, #f5c518)" }}
          >
            {level}
          </div>
          <div className="text-[13px] mt-1" style={{ color: "var(--surna-text-secondary)" }}>
            Level
          </div>
        </button>
      </div>
    </section>
  );
}
