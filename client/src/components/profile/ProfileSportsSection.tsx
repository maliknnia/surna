import { cn } from "@/lib/utils";

type ProfileSportsSectionProps = {
  sports: string[];
  selectedSport: string | null;
  onSelect: (sport: string | null) => void;
};

export function ProfileSportsSection({ sports, selectedSport, onSelect }: ProfileSportsSectionProps) {
  if (sports.length === 0) return null;

  return (
    <section className="mb-4" aria-label="Sports">
      <h3 className="text-[15px] font-semibold mb-2.5" style={{ color: "var(--surna-text)" }}>
        Sports
      </h3>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
        {sports.map((sport) => {
          const active = selectedSport === sport;
          return (
            <button
              key={sport}
              type="button"
              onClick={() => onSelect(active ? null : sport)}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium border transition-opacity active:opacity-70",
                active ? "border-transparent" : "border-[var(--surna-border)]",
              )}
              style={
                active
                  ? { background: "var(--surna-text)", color: "var(--surna-base)" }
                  : { background: "transparent", color: "var(--surna-text)" }
              }
              data-testid={`profile-sport-${sport.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {sport}
            </button>
          );
        })}
      </div>
    </section>
  );
}
