import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, CheckCircle, XCircle, Ban, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PlaceSlotCalendarEntry } from "@shared/placeBooking";

interface PlaceOwnerSlotCalendarProps {
  placeId: string;
  slotDurationMinutes?: number | null;
  onUpdateBooking?: (bookingId: string, status: "confirmed" | "cancelled") => void;
  isUpdating?: boolean;
}

function formatDateChip(iso: string): { weekday: string; day: string; month: string } {
  const d = new Date(`${iso}T12:00:00`);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    day: d.getDate().toString(),
    month: d.toLocaleDateString(undefined, { month: "short" }),
  };
}

function nextDates(count: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const STATE_STYLES: Record<
  PlaceSlotCalendarEntry["state"],
  { bg: string; text: string; label: string }
> = {
  available: {
    bg: "bg-emerald-500/15 border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Open",
  },
  booked: {
    bg: "bg-primary/15 border-primary/30",
    text: "text-primary",
    label: "Booked",
  },
  pending: {
    bg: "bg-amber-500/15 border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    label: "Pending",
  },
  blocked: {
    bg: "bg-red-500/15 border-red-500/30",
    text: "text-red-600 dark:text-red-400",
    label: "Blocked",
  },
  past: {
    bg: "bg-token-text/5 border-token-text/10",
    text: "text-token-text-muted",
    label: "Past",
  },
  closed: {
    bg: "bg-token-text/5 border-token-text/10",
    text: "text-token-text-muted",
    label: "Closed",
  },
};

export function PlaceOwnerSlotCalendar({
  placeId,
  slotDurationMinutes,
  onUpdateBooking,
  isUpdating,
}: PlaceOwnerSlotCalendarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const dates = useMemo(() => nextDates(14), []);
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [selectedEntry, setSelectedEntry] = useState<PlaceSlotCalendarEntry | null>(null);
  const [blockReason, setBlockReason] = useState("");

  const calendarKey = ["/api/places", placeId, "slot-calendar", selectedDate] as const;

  const { data, isLoading } = useQuery<{
    entries: PlaceSlotCalendarEntry[];
    closed: boolean;
    bookingMode: string;
  }>({
    queryKey: calendarKey,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/places/${placeId}/slot-calendar?date=${selectedDate}`);
      return res.json();
    },
    enabled: !!placeId,
  });

  const invalidateCalendar = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/places", placeId, "slot-calendar"] });
  };

  const blockMutation = useMutation({
    mutationFn: async (entry: PlaceSlotCalendarEntry) => {
      const res = await apiRequest("POST", `/api/places/${placeId}/slot-blocks`, {
        startTime: entry.startTime,
        endTime: entry.endTime,
        reason: blockReason.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      setSelectedEntry(null);
      setBlockReason("");
      invalidateCalendar();
      toast({ title: "Slot blocked", description: "Guests can no longer book this time." });
    },
    onError: (err: Error) => {
      toast({ title: "Could not block slot", description: err.message, variant: "destructive" });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      await apiRequest("DELETE", `/api/places/${placeId}/slot-blocks/${blockId}`);
    },
    onSuccess: () => {
      setSelectedEntry(null);
      invalidateCalendar();
      toast({ title: "Slot unblocked", description: "This time is open for booking again." });
    },
    onError: (err: Error) => {
      toast({ title: "Could not unblock slot", description: err.message, variant: "destructive" });
    },
  });

  const entries = data?.entries ?? [];
  const closed = data?.closed ?? false;

  const stats = useMemo(() => {
    const open = entries.filter((e) => e.state === "available").length;
    const booked = entries.filter((e) => e.state === "booked").length;
    const pending = entries.filter((e) => e.state === "pending").length;
    const blocked = entries.filter((e) => e.state === "blocked").length;
    return { open, booked, pending, blocked };
  }, [entries]);

  const handleAction = (status: "confirmed" | "cancelled") => {
    if (!selectedEntry?.bookingId || !onUpdateBooking) return;
    onUpdateBooking(selectedEntry.bookingId, status);
    setSelectedEntry(null);
    invalidateCalendar();
  };

  const slotBusy = blockMutation.isPending || unblockMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-token-text flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Slot calendar
          </h3>
          <p className="text-sm text-token-text-muted mt-1">
            {slotDurationMinutes ? `${slotDurationMinutes}-minute slots · ` : ""}
            tap open slots to block, blocked slots to reopen
          </p>
        </div>
        <div className="flex gap-2 text-xs flex-wrap">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            {stats.open} open
          </Badge>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            {stats.booked} booked
          </Badge>
          {stats.pending > 0 ? (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
              {stats.pending} pending
            </Badge>
          ) : null}
          {stats.blocked > 0 ? (
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
              {stats.blocked} blocked
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {dates.map((iso) => {
          const chip = formatDateChip(iso);
          const active = iso === selectedDate;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setSelectedDate(iso)}
              className={`shrink-0 w-[52px] py-2 rounded-xl text-center border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-token-text/5 text-token-text-muted border-token-text/10"
              }`}
            >
              <div className="text-[10px] font-medium opacity-80">{chip.weekday}</div>
              <div className="text-[15px] font-bold leading-tight">{chip.day}</div>
              <div className="text-[10px] opacity-70">{chip.month}</div>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="text-sm text-token-text-muted py-8 text-center">Loading calendar…</p>
      ) : closed ? (
        <p className="text-sm text-token-text-muted py-8 text-center rounded-xl border border-token-text/10">
          Closed this day — check your venue hours.
        </p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-token-text-muted py-8 text-center rounded-xl border border-token-text/10">
          No slots configured for this day.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {entries.map((entry) => {
            const style = STATE_STYLES[entry.state];
            const clickable =
              entry.state === "available" ||
              entry.state === "blocked" ||
              entry.bookingId != null;
            return (
              <button
                key={entry.startTime}
                type="button"
                disabled={!clickable}
                onClick={() => {
                  if (clickable) {
                    setBlockReason(entry.blockReason ?? "");
                    setSelectedEntry(entry);
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all ${style.bg} ${
                  clickable ? "hover:opacity-90 cursor-pointer" : "cursor-default opacity-70"
                }`}
                data-testid={`owner-slot-${entry.label.replace(/\s/g, "-")}`}
              >
                <p className={`text-sm font-bold ${style.text}`}>{entry.label}</p>
                <p className={`text-[11px] mt-1 ${style.text} opacity-80`}>{style.label}</p>
                {entry.bookingTitle ? (
                  <p className="text-[10px] mt-1 text-token-text-muted truncate">{entry.bookingTitle}</p>
                ) : null}
                {entry.blockReason ? (
                  <p className="text-[10px] mt-1 text-token-text-muted truncate">{entry.blockReason}</p>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slot details</DialogTitle>
          </DialogHeader>
          {selectedEntry ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-token-text-muted">Time</p>
                <p className="font-medium text-token-text">
                  {new Date(selectedEntry.startTime).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {" – "}
                  {new Date(selectedEntry.endTime).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {selectedEntry.bookingTitle ? (
                <div>
                  <p className="text-sm text-token-text-muted">Booking</p>
                  <p className="font-medium text-token-text">{selectedEntry.bookingTitle}</p>
                  <Badge className="mt-2 capitalize">{selectedEntry.bookingStatus}</Badge>
                </div>
              ) : null}

              {selectedEntry.state === "blocked" && selectedEntry.blockReason ? (
                <div>
                  <p className="text-sm text-token-text-muted">Block reason</p>
                  <p className="text-sm text-token-text">{selectedEntry.blockReason}</p>
                </div>
              ) : null}

              {selectedEntry.state === "available" ? (
                <div className="space-y-2 pt-1">
                  <Label htmlFor="block-reason">Reason (optional)</Label>
                  <Input
                    id="block-reason"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Private event, maintenance…"
                  />
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={() => blockMutation.mutate(selectedEntry)}
                    disabled={slotBusy}
                  >
                    <Ban className="w-4 h-4 mr-1" />
                    {blockMutation.isPending ? "Blocking…" : "Block this slot"}
                  </Button>
                </div>
              ) : null}

              {selectedEntry.state === "blocked" && selectedEntry.blockId ? (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => unblockMutation.mutate(selectedEntry.blockId!)}
                  disabled={slotBusy}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {unblockMutation.isPending ? "Unblocking…" : "Unblock slot"}
                </Button>
              ) : null}

              {selectedEntry.bookingStatus === "pending" && selectedEntry.bookingId && onUpdateBooking ? (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleAction("confirmed")}
                    disabled={isUpdating}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleAction("cancelled")}
                    disabled={isUpdating}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Decline
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
