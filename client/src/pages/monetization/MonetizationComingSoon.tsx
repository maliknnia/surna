import { Link, useRoute } from "wouter";
import { ArrowLeft, Hammer } from "lucide-react";

const TITLES: Record<string, string> = {
  "pitch-rental": "Rent Your Sports Pitch",
  "host-tournament": "Host Tournaments",
  "sell-gear": "Sell Sports Gear",
  "sponsor-event": "Sponsor Events",
  "verified-vendor": "Verified Vendor",
  "event-photography": "Event Photography",
  "online-classes": "Online Skill Classes",
};

export default function MonetizationComingSoon() {
  const [, params] = useRoute("/monetization/:program");
  const slug = params?.program ?? "";
  const title = TITLES[slug] ?? "Program";

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--surna-void)" }}>
      <div
        className="sticky top-0 z-40 glass-effect"
        style={{
          background: "var(--glass-bg, rgba(0,0,0,0.7))",
          borderBottom: "0.5px solid var(--surna-border)",
        }}
      >
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/join-us">
            <button type="button" className="p-2 rounded-xl active:scale-95" aria-label="Back to Join Us">
              <ArrowLeft className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
            </button>
          </Link>
          <h1 className="text-lg font-semibold" style={{ color: "var(--surna-text)" }}>
            {title}
          </h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-10">
        <div
          className="rounded-2xl p-6 text-center flex flex-col items-center gap-3"
          style={{
            background: "var(--surna-elevated)",
            border: "1px dashed var(--surna-border)",
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "var(--surna-bg-highlight)" }}
          >
            <Hammer className="w-6 h-6" style={{ color: "var(--surna-text)" }} />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
            {title} is coming soon
          </h2>
          <p className="text-xs max-w-[260px]" style={{ color: "var(--surna-text-secondary)" }}>
            We&apos;re building this earning path. Explore other options on Join Us, or check back shortly.
          </p>
          <Link href="/join-us">
            <button
              type="button"
              className="text-xs font-semibold px-4 py-2 rounded-full"
              style={{
                background: "var(--surna-text)",
                color: "var(--surna-bg)",
              }}
            >
              Back to Join Us
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
