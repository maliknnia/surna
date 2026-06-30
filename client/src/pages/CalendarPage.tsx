import { ArrowLeft } from "lucide-react";
import { Calendar } from "@/components/Calendar";
import { useSmartBack } from "@/lib/navigation";

export default function CalendarPage() {
  const goBack = useSmartBack({ fallback: "/?panel=events" });

  return (
    <div className="min-h-screen pb-8" style={{ background: "var(--surna-base)" }}>
      <header
        className="sticky top-0 z-40 px-4 h-14 flex items-center gap-3 backdrop-blur-md border-b"
        style={{
          background: "color-mix(in srgb, var(--surna-base) 92%, transparent)",
          borderColor: "var(--surna-border)",
        }}
      >
        <button
          type="button"
          onClick={goBack}
          className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-80"
          style={{ background: "var(--surna-elevated)" }}
          aria-label="Back"
        >
          <ArrowLeft size={18} style={{ color: "var(--surna-text)" }} />
        </button>
        <div>
          <h1 className="text-[17px] font-bold leading-tight" style={{ color: "var(--surna-text)" }}>
            What's on
          </h1>
          <p className="text-[11px]" style={{ color: "var(--surna-text-secondary)" }}>
            Discover by location · set reminders · see your week
          </p>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto">
        <Calendar />
      </div>
    </div>
  );
}
