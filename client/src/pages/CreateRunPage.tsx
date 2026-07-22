import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Undo2, Trash2, Navigation, Pencil } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateDistance, type Coordinates } from "@/lib/geo";
import { watchPosition, clearWatch } from "@/lib/capacitor/geolocation";
import {
  estimateDurationMinutes,
  formatRouteDuration,
  pathDistanceKm,
} from "@/lib/eventRoutes";
import RouteDrawMap from "@/components/map/RouteDrawMap";
import { ROUTES } from "@/navigation";

type Mode = "draw" | "record";
type ActivityType = "run" | "cycle" | "walk";

type SavedSummary = {
  activityType: ActivityType;
  distanceKm: number;
  durationSeconds: number;
  points: number;
  mode: Mode;
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatPace(seconds: number, km: number): string {
  if (km <= 0) return "—";
  const paceSec = seconds / km;
  const pm = Math.floor(paceSec / 60);
  const ps = Math.round(paceSec % 60);
  return `${pm}:${String(ps).padStart(2, "0")} /km`;
}

const DEFAULT_CENTER: Coordinates = { lat: 51.8985, lng: -8.4756 };

/**
 * Create / record a run like Strava:
 * - Draw: tap A → waypoints → B on the map (solid line, live distance)
 * - Record: live GPS track with distance, duration, pace
 */
export default function CreateRunPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("draw");
  const [activityType, setActivityType] = useState<ActivityType>("run");
  const [points, setPoints] = useState<Coordinates[]>([]);
  const [center, setCenter] = useState<Coordinates>(DEFAULT_CENTER);
  const [tracking, setTracking] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<SavedSummary | null>(null);
  const watchIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const distanceKm = useMemo(() => pathDistanceKm(points), [points]);
  const estMinutes = useMemo(
    () => estimateDurationMinutes(activityType, distanceKm),
    [activityType, distanceKm],
  );

  useEffect(() => {
    if (!tracking || !startedAt) return;
    const t = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => window.clearInterval(t);
  }, [tracking, startedAt]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => () => stopWatch(), [stopWatch]);

  const addPoint = useCallback((coord: Coordinates) => {
    setPoints((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1]!;
        if (calculateDistance(last, coord) < 0.005) return prev;
      }
      return [...prev, coord];
    });
  }, []);

  const undoPoint = () => setPoints((prev) => prev.slice(0, -1));
  const clearPoints = () => setPoints([]);

  const startRecording = useCallback(async () => {
    setMode("record");
    setPoints([]);
    setElapsed(0);
    const now = new Date();
    setStartedAt(now);
    setTracking(true);

    watchIdRef.current = await watchPosition(
      (point) => {
        setPoints((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1]!;
            if (calculateDistance(last, point) < 0.003) return prev;
          }
          return [...prev, point];
        });
        setCenter(point);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );

    if (watchIdRef.current === -1) {
      toast({ title: "GPS unavailable", variant: "destructive" });
      setTracking(false);
    }
  }, [toast]);

  const saveActivity = async (durationSeconds: number) => {
    if (points.length < 2 || distanceKm <= 0) {
      toast({
        title: "Need a full route",
        description: "Add at least Start (A) and Finish (B).",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const finishedAt = new Date();
      const started = startedAt ?? new Date(finishedAt.getTime() - durationSeconds * 1000);
      const routeCoordinates = points.map((c) => [c.lat, c.lng] as [number, number]);
      await apiRequest("POST", "/api/activities", {
        activityType,
        distanceKm: Number(distanceKm.toFixed(3)),
        durationSeconds,
        routeCoordinates,
        startedAt: started.toISOString(),
        finishedAt: finishedAt.toISOString(),
      });
      setSummary({
        activityType,
        distanceKm,
        durationSeconds,
        points: points.length,
        mode,
      });
      toast({ title: "Run saved", description: `${distanceKm.toFixed(2)} km logged` });
    } catch (err: unknown) {
      toast({
        title: "Couldn't save",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const finishDraw = async () => {
    const durationSeconds = Math.max(60, estMinutes * 60);
    await saveActivity(durationSeconds);
  };

  const finishRecord = async () => {
    stopWatch();
    setTracking(false);
    if (points.length < 2) {
      toast({ title: "Need more GPS data", description: "Keep moving before finishing.", variant: "destructive" });
      return;
    }
    await saveActivity(elapsed);
  };

  if (summary) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--surna-void)", color: "var(--surna-text)" }}>
        <header className="px-4 py-3 flex items-center gap-3 border-b" style={{ borderColor: "var(--surna-border)" }}>
          <button type="button" onClick={() => navigate(ROUTES.performance)} className="p-2 rounded-xl" aria-label="Done">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold">Activity saved</h1>
        </header>
        <div className="flex-1 px-4 py-8 max-w-md mx-auto w-full">
          <div
            className="rounded-3xl p-6 space-y-5"
            style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
          >
            <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--surna-text-secondary)" }}>
              {summary.activityType} · {summary.mode === "draw" ? "Planned route" : "Recorded"}
            </p>
            <p className="text-5xl font-black tabular-nums tracking-tight">
              {summary.distanceKm.toFixed(2)}
              <span className="text-xl font-bold ml-1" style={{ color: "var(--surna-text-secondary)" }}>
                km
              </span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase" style={{ color: "var(--surna-text-muted)" }}>
                  Duration
                </p>
                <p className="text-2xl font-bold tabular-nums">{formatDuration(summary.durationSeconds)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase" style={{ color: "var(--surna-text-muted)" }}>
                  Pace
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatPace(summary.durationSeconds, summary.distanceKm)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase" style={{ color: "var(--surna-text-muted)" }}>
                  Points
                </p>
                <p className="text-2xl font-bold tabular-nums">{summary.points}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase" style={{ color: "var(--surna-text-muted)" }}>
                  Est. moving
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatRouteDuration(estimateDurationMinutes(summary.activityType, summary.distanceKm))}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate(ROUTES.performance)}
              className="w-full h-12 rounded-2xl font-bold text-white"
              style={{ background: "var(--surna-text)", color: "var(--surna-void)" }}
            >
              View performance
            </button>
            <button
              type="button"
              onClick={() => {
                setSummary(null);
                setPoints([]);
                setElapsed(0);
                setStartedAt(null);
              }}
              className="w-full h-12 rounded-2xl font-semibold"
              style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
            >
              Create another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col z-50" style={{ background: "var(--surna-void)", color: "var(--surna-text)" }}>
      <header
        className="shrink-0 px-3 py-2.5 flex items-center gap-2 border-b"
        style={{ borderColor: "var(--surna-border)", paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <button type="button" onClick={() => navigate(ROUTES.create)} className="p-2 rounded-xl" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold flex-1">Create run</h1>
        {!tracking && mode === "draw" && (
          <>
            <button
              type="button"
              onClick={undoPoint}
              disabled={points.length === 0}
              className="p-2 rounded-xl disabled:opacity-30"
              aria-label="Undo point"
            >
              <Undo2 size={18} />
            </button>
            <button
              type="button"
              onClick={clearPoints}
              disabled={points.length === 0}
              className="p-2 rounded-xl disabled:opacity-30"
              aria-label="Clear route"
            >
              <Trash2 size={18} />
            </button>
          </>
        )}
      </header>

      {!tracking && (
        <div className="shrink-0 px-3 py-2 flex gap-2 border-b" style={{ borderColor: "var(--surna-border)" }}>
          {(
            [
              { id: "draw" as const, label: "Draw route", icon: Pencil },
              { id: "record" as const, label: "Record GPS", icon: Navigation },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                if (m.id === "record") {
                  void startRecording();
                } else {
                  stopWatch();
                  setTracking(false);
                  setMode("draw");
                  setPoints([]);
                }
              }}
              className="flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              style={{
                background: mode === m.id ? "var(--surna-text)" : "var(--surna-elevated)",
                color: mode === m.id ? "var(--surna-void)" : "var(--surna-text)",
                border: "1px solid var(--surna-border)",
              }}
            >
              <m.icon size={14} />
              {m.label}
            </button>
          ))}
        </div>
      )}

      {!tracking && (
        <div className="shrink-0 px-3 py-2 flex gap-2">
          {(["run", "cycle", "walk"] as ActivityType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActivityType(t)}
              className="flex-1 py-2 rounded-xl text-xs font-bold capitalize"
              style={{
                background: activityType === t ? "var(--surna-elevated)" : "transparent",
                border: `1px solid ${activityType === t ? "var(--surna-text)" : "var(--surna-border)"}`,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 relative min-h-0">
        <RouteDrawMap
          center={center}
          points={points}
          sportType={activityType}
          onAddPoint={mode === "draw" && !tracking ? addPoint : () => {}}
        />
        {mode === "draw" && points.length === 0 && (
          <div
            className="absolute left-3 right-3 top-3 rounded-2xl px-3 py-2.5 text-xs font-medium pointer-events-none"
            style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}
          >
            Tap the map: first point is <strong>A (Start)</strong>, last is <strong>B (Finish)</strong>. Add as many turns as you need.
          </div>
        )}
      </div>

      <div
        className="shrink-0 border-t px-4 py-4 space-y-3"
        style={{
          borderColor: "var(--surna-border)",
          background: "var(--surna-void)",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] uppercase" style={{ color: "var(--surna-text-muted)" }}>
              Distance
            </p>
            <p className="text-xl font-bold tabular-nums">{distanceKm.toFixed(2)} km</p>
          </div>
          <div>
            <p className="text-[10px] uppercase" style={{ color: "var(--surna-text-muted)" }}>
              {mode === "record" ? "Duration" : "Est. time"}
            </p>
            <p className="text-xl font-bold tabular-nums">
              {mode === "record" ? formatDuration(elapsed) : formatRouteDuration(estMinutes)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase" style={{ color: "var(--surna-text-muted)" }}>
              {mode === "record" ? "Pace" : "Points"}
            </p>
            <p className="text-xl font-bold tabular-nums">
              {mode === "record" ? formatPace(elapsed, distanceKm) : points.length}
            </p>
          </div>
        </div>

        {mode === "draw" ? (
          <button
            type="button"
            disabled={saving || points.length < 2}
            onClick={() => void finishDraw()}
            className="w-full h-12 rounded-2xl font-bold disabled:opacity-40"
            style={{ background: "var(--surna-text)", color: "var(--surna-void)" }}
          >
            {saving ? "Saving…" : "Save route"}
          </button>
        ) : tracking ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void finishRecord()}
            className="w-full h-12 rounded-2xl font-bold disabled:opacity-40"
            style={{ background: "var(--surna-text)", color: "var(--surna-void)" }}
          >
            {saving ? "Saving…" : "Finish & save"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void startRecording()}
            className="w-full h-12 rounded-2xl font-bold"
            style={{ background: "var(--surna-text)", color: "var(--surna-void)" }}
          >
            Start GPS
          </button>
        )}
      </div>
    </div>
  );
}
