import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Calendar, Download } from "lucide-react";
import {
  type CalendarEventInput,
  downloadIcsFile,
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  openAppleCalendar,
  fetchServerCalendarUrls,
} from "@/lib/eventCalendar";

type Props = {
  open: boolean;
  onClose: () => void;
  event: CalendarEventInput | null;
};

const PROVIDERS = [
  { id: "apple", label: "Apple Calendar", sub: "Download .ics file" },
  { id: "google", label: "Google Calendar", sub: "Add in browser" },
  { id: "outlook", label: "Outlook", sub: "Add in browser" },
  { id: "ics", label: "Download .ics", sub: "Any calendar app" },
] as const;

export function AddToCalendarSheet({ open, onClose, event }: Props) {
  const [urls, setUrls] = useState<{ google?: string; outlook?: string } | null>(null);

  useEffect(() => {
    if (!open || !event?.id) {
      setUrls(null);
      return;
    }
    fetchServerCalendarUrls(event.id).then(setUrls);
  }, [open, event?.id]);

  if (!open || !event || typeof document === "undefined") return null;

  const handlePick = (id: (typeof PROVIDERS)[number]["id"]) => {
    switch (id) {
      case "apple":
        openAppleCalendar(event);
        break;
      case "google":
        window.open(urls?.google || getGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
        break;
      case "outlook":
        window.open(urls?.outlook || getOutlookCalendarUrl(event), "_blank", "noopener,noreferrer");
        break;
      case "ics":
        downloadIcsFile(event);
        break;
    }
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[220]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto"
        style={{ animation: "slideUpSheet 0.32s cubic-bezier(0.32, 0.72, 0, 1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-t-[22px] border-t border-border/60 px-4 pt-2 pb-8"
          style={{ background: "var(--surna-elevated, var(--background))" }}
        >
          <div className="flex justify-center py-2" onClick={onClose}>
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={18} className="text-muted-foreground" />
                <h3 className="text-lg font-bold text-foreground">Add to calendar</h3>
              </div>
              <p className="text-[14px] text-muted-foreground line-clamp-2">{event.title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/50 shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePick(p.id)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl text-left active:scale-[0.99] transition-transform bg-muted/30 hover:bg-muted/50"
              >
                <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-background border border-border/50">
                  {p.id === "ics" || p.id === "apple" ? <Download size={18} /> : <Calendar size={18} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold text-foreground">{p.label}</span>
                  <span className="block text-[12px] text-muted-foreground">{p.sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
