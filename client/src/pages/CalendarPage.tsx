import { ArrowLeft } from "lucide-react";
import { Calendar } from "@/components/Calendar";
import { useSmartBack } from "@/lib/navigation";

export default function CalendarPage() {
  const goBack = useSmartBack({ fallback: "/?panel=events" });

  return (
    <div className="min-h-screen pb-8" style={{ background: "var(--surna-base, #000)" }}>
      <header
        className="sticky top-0 z-40 px-4 h-14 flex items-center gap-3 backdrop-blur-xl border-b border-border/40"
        style={{ background: "color-mix(in srgb, var(--surna-base, #000) 88%, transparent)" }}
      >
        <button
          type="button"
          onClick={goBack}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/40 active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <div>
          <h1 className="text-[17px] font-bold text-foreground leading-tight">Schedule</h1>
          <p className="text-[11px] text-muted-foreground">Events · training · your RSVPs</p>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto">
        <Calendar />
      </div>
    </div>
  );
}
