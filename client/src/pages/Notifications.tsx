import { ArrowLeft } from "lucide-react";
import { useSmartBack } from "@/lib/navigation";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";

export default function NotificationsPage() {
  const goBack = useSmartBack({ fallback: "/" });

  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--surna-bg)" }}>
      <header
        className="sticky top-0 z-50 flex items-center gap-3 border-b px-4 py-3"
        style={{
          background: "var(--surna-bg)",
          borderColor: "var(--surna-border)",
          paddingTop: "max(12px, env(safe-area-inset-top))",
        }}
      >
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          className="flex h-9 w-9 items-center justify-center rounded-full active:scale-95 transition-transform"
          style={{ background: "var(--surna-bg-highlight)" }}
        >
          <ArrowLeft size={18} style={{ color: "var(--surna-text)" }} />
        </button>
      </header>

      <NotificationsPanel />
    </div>
  );
}
