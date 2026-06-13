import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { lazy, Suspense } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateDistance, type Coordinates } from "@/lib/geo";
import { watchPosition, clearWatch } from "@/lib/capacitor/geolocation";
import type { MapRoute } from "@/components/map/surnaMapRoutes";

const InteractiveMap = lazy(() =>
  import("@/components/map/InteractiveMap").then((m) => ({ default: m.default })),
);

type ActivityType = "run" | "cycle" | "walk";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatPace(seconds: number, km: number): string {
  if (km <= 0) return "—";
  const paceSec = seconds / km;
  const pm = Math.floor(paceSec / 60);
  const ps = Math.round(paceSec % 60);
  return `${pm}:${String(ps).padStart(2, "0")} /km`;
}

export default function ActivityTrackPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activityType, setActivityType] = useState<ActivityType>("run");
  const [tracking, setTracking] = useState(false);
  const [coords, setCoords] = useState<Coordinates[]>([]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const watchIdRef = useRef<string | number | null>(null);

  const distanceKm = useMemo(() => {
    if (coords.length < 2) return 0;
    let km = 0;
    for (let i = 1; i < coords.length; i++) {
      km += calculateDistance(coords[i - 1], coords[i]);
    }
    return km;
  }, [coords]);

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

  const startTracking = useCallback(async () => {
    const now = new Date();
    setStartedAt(now);
    setTracking(true);
    setCoords([]);
    setElapsed(0);

    watchIdRef.current = await watchPosition(
      (point) => {
        setCoords((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            if (calculateDistance(last, point) < 0.003) return prev;
          }
          return [...prev, point];
        });
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );

    if (watchIdRef.current === -1) {
      toast({ title: "GPS unavailable", variant: "destructive" });
      setTracking(false);
    }
  }, [toast]);

  const finishActivity = async () => {
    stopWatch();
    setTracking(false);
    if (!startedAt || coords.length < 2) {
      toast({ title: "Need more GPS data", description: "Keep moving before finishing.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const finishedAt = new Date();
      const routeCoordinates = coords.map((c) => [c.lat, c.lng] as [number, number]);
      const res = await apiRequest("POST", "/api/activities", {
        activityType,
        distanceKm,
        durationSeconds: elapsed,
        routeCoordinates,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
      });
      const json = await res.json();
      const pbs = json.personalBestsBeaten as string[] | undefined;
      toast({
        title: "Activity saved",
        description: pbs?.length ? `New personal best! +50 pts` : `${distanceKm.toFixed(2)} km logged`,
      });
      navigate("/performance");
    } catch (err: unknown) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => () => stopWatch(), [stopWatch]);

  const liveRoute: MapRoute[] =
    coords.length >= 2
      ? [
          {
            id: "live-track",
            coordinates: coords,
            sportType: activityType,
            title: "Live track",
          },
        ]
      : [];

  const userPos = coords.length > 0 ? coords[coords.length - 1] : null;
  const mapCenter: Coordinates = userPos ?? { lat: 53.3498, lng: -6.2603 };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#121212] text-white z-50">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <button type="button" onClick={() => navigate("/performance")} className="text-sm text-white/70">
          Cancel
        </button>
        <h1 className="text-sm font-bold">Track activity</h1>
        <div className="w-12" />
      </header>

      {!tracking && (
        <div className="px-4 py-3 flex gap-2 shrink-0">
          {(["run", "cycle", "walk"] as ActivityType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActivityType(t)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold capitalize"
              style={{
                background: activityType === t ? "#1DB954" : "rgba(255,255,255,0.08)",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 relative min-h-0">
        <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-white/50">Loading map…</div>}>
          <InteractiveMap
            center={mapCenter}
            pins={[]}
            onPinClick={() => {}}
            mapActive
            userDisplayCoords={userPos ?? undefined}
            routes={liveRoute}
            flyTo={userPos}
            flyToZoom={15}
            externalStyleControl
          />
        </Suspense>
      </div>

      <div className="shrink-0 border-t border-white/10 px-4 py-4 space-y-3 bg-[#121212]">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[11px] text-white/50 uppercase">Distance</p>
            <p className="text-xl font-bold tabular-nums">{distanceKm.toFixed(2)} km</p>
          </div>
          <div>
            <p className="text-[11px] text-white/50 uppercase">Duration</p>
            <p className="text-xl font-bold tabular-nums">{formatDuration(elapsed)}</p>
          </div>
          <div>
            <p className="text-[11px] text-white/50 uppercase">Pace</p>
            <p className="text-xl font-bold tabular-nums">{formatPace(elapsed, distanceKm)}</p>
          </div>
        </div>

        {!tracking ? (
          <button
            type="button"
            onClick={startTracking}
            className="w-full h-12 rounded-2xl font-bold text-[#121212]"
            style={{ background: "#1DB954" }}
          >
            Start tracking
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={finishActivity}
            className="w-full h-12 rounded-2xl font-bold"
            style={{ background: "#fff", color: "#121212", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : "Finish"}
          </button>
        )}
      </div>
    </div>
  );
}
