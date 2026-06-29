export type EntityTab = {
  id: string;
  label: string;
};

type EntitySectionTabsProps = {
  tabs: EntityTab[];
  activeId: string;
  onChange: (id: string) => void;
  stickyTop?: string;
  testIdPrefix?: string;
  /** Sport/venue accent; defaults to entity gold. */
  accentColor?: string;
};

export function EntitySectionTabs({
  tabs,
  activeId,
  onChange,
  stickyTop = "top-11",
  testIdPrefix = "entity-section",
  accentColor,
}: EntitySectionTabsProps) {
  const indicator = accentColor ?? "var(--surna-gold, #f5c518)";
  return (
    <nav
      className={`-mx-4 px-4 sticky ${stickyTop} z-30 backdrop-blur-md border-b mb-4`}
      style={{
        background: "color-mix(in srgb, var(--surna-base) 92%, transparent)",
        borderColor: "var(--surna-border)",
      }}
    >
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const active = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className="px-3.5 py-3 text-[13px] font-semibold whitespace-nowrap relative shrink-0 active:opacity-70"
              style={{ color: active ? "var(--surna-text)" : "var(--surna-text-secondary)" }}
              data-testid={`${testIdPrefix}-${tab.id}`}
            >
              {tab.label}
              {active ? (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full"
                  style={{ background: indicator }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
