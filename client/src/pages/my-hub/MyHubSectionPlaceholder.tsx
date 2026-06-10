import { Link, useRoute } from "wouter";
import { ArrowLeft, Hammer } from "lucide-react";

const TITLES: Record<string, string> = {
  events: "Events",
  teams: "Teams",
  places: "Places",
  requests: "Requests",
};

export default function MyHubSectionPlaceholder() {
  const [, params] = useRoute("/my-hub/:section");
  const section = params?.section ?? "";
  const title = TITLES[section] ?? "Section";

  return (
    <div
      className="min-h-screen pb-32"
      style={{ background: "var(--surna-void)" }}
      data-testid="my-hub-section-placeholder"
    >
      <div
        className="sticky top-0 z-40 glass-effect"
        style={{
          background: "var(--glass-bg, rgba(0,0,0,0.7))",
          borderBottom: "0.5px solid var(--surna-border)",
        }}
      >
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/my-hub">
            <button
              className="p-2 rounded-xl active:scale-95"
              data-testid="back-to-hub"
            >
              <ArrowLeft
                className="w-5 h-5"
                style={{ color: "var(--surna-text)" }}
              />
            </button>
          </Link>
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--surna-text)" }}
          >
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
            <Hammer
              className="w-6 h-6"
              style={{ color: "var(--surna-text)" }}
            />
          </div>
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--surna-text)" }}
          >
            {title} is on the way
          </h2>
          <p
            className="text-xs max-w-[260px]"
            style={{ color: "var(--surna-text-secondary)" }}
          >
            We're putting the finishing touches on this section. Head back to
            My Hub for now.
          </p>
          <Link href="/my-hub">
            <button
              className="text-xs font-semibold px-4 py-2 rounded-full"
              style={{
                background: "var(--surna-text)",
                color: "var(--surna-bg)",
              }}
            >
              Back to My Hub
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
