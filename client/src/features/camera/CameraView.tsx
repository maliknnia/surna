import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { X, SwitchCamera, Image as ImageIcon, Sparkles } from "lucide-react";
import {
  CAMERA_MODES,
  MODE_LIMITS,
  normalizeCameraMode,
  type CameraMode,
  type FilterCategory,
} from "./constants";
import { filterCss, getFiltersForCategory } from "./filterEngine";
import { captureVideoFrame } from "./arOverlays";
import { CAMERA_MUTED, CAMERA_TEXT } from "./cameraTheme";
import { useSurnaCamera } from "./SurnaCameraContext";
import { useCameraEmbed } from "./SurnaCameraContent";
import FilterPickerSheet from "./FilterPickerSheet";
import { pickMediaFromGallery } from "@/lib/capacitor/camera";

const HOLD_MS = 400;

type Props = {
  initialMode?: CameraMode | string;
  onCaptured: (payload: {
    blob: Blob;
    previewUrl: string;
    type: "image" | "video";
    filterId: string;
    arId: string | null;
    mode: CameraMode;
    durationSec?: number;
    filterBaked?: boolean;
  }) => void;
};

export default function CameraView({ initialMode = "post", onCaptured }: Props) {
  const { requestClose, options } = useSurnaCamera();
  const embedded = useCameraEmbed();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const shutterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordStartRef = useRef(0);

  const [mode, setMode] = useState<CameraMode>(() => normalizeCameraMode(initialMode));
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("sport");
  const [filterId, setFilterId] = useState("none");
  const [showFilters, setShowFilters] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const maxVideoMs = MODE_LIMITS[mode].maxMs;
  const filters = getFiltersForCategory(filterCategory);
  const activeFilter = filters.find((f) => f.id === filterId) ?? filters[0];
  const arId = activeFilter?.isAr ? activeFilter.id : null;
  const cssF = filterCss(filterId);

  useEffect(() => {
    setMode(normalizeCameraMode(options.mode ?? initialMode));
  }, [options.mode, initialMode]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera is not available in this browser.");
        return;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      console.error("Camera access failed", e);
      setCameraError("Allow camera access in your browser settings, then tap Try again.");
    }
  }, [facing]);

  useEffect(() => {
    void startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  useEffect(() => {
    if (!recording) return;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - t0;
      setRecordMs(elapsed);
      if (elapsed >= maxVideoMs) stopRecording();
    }, 100);
    return () => clearInterval(iv);
  }, [recording, maxVideoMs, stopRecording]);

  const emitCapture = useCallback(
    (blob: Blob, type: "image" | "video", durationSec?: number, filterBaked = false) => {
      onCaptured({
        blob,
        previewUrl: URL.createObjectURL(blob),
        type,
        filterId,
        arId,
        mode,
        durationSec,
        filterBaked,
      });
    },
    [filterId, arId, mode, onCaptured],
  );

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const blob = await captureVideoFrame(video, filterId, arId, cssF);
      emitCapture(blob, "image", undefined, true);
    } catch (e) {
      console.error(e);
    }
  }, [filterId, arId, cssF, emitCapture]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const rec = new MediaRecorder(streamRef.current, { mimeType: mime });
    recorderRef.current = rec;
    recordStartRef.current = Date.now();
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const durationSec = Math.round((Date.now() - recordStartRef.current) / 1000);
      emitCapture(blob, "video", durationSec);
      setRecording(false);
      setRecordMs(0);
    };
    rec.start(200);
    setRecording(true);
    setRecordMs(0);
  }, [emitCapture]);

  const onShutterDown = () => {
    if (mode === "reel") return;
    shutterTimer.current = setTimeout(() => startRecording(), HOLD_MS);
  };

  const onShutterUp = () => {
    if (shutterTimer.current) {
      clearTimeout(shutterTimer.current);
      shutterTimer.current = null;
    }

    if (mode === "reel") {
      if (recording) stopRecording();
      else startRecording();
      return;
    }

    if (recording) {
      stopRecording();
      return;
    }

    capturePhoto();
  };

  const openGalleryPicker = async () => {
    const file = await pickMediaFromGallery("image/*,video/*");
    if (!file) return;
    onCaptured({
      blob: file,
      previewUrl: URL.createObjectURL(file),
      type: file.type.startsWith("video") ? "video" : "image",
      filterId,
      arId,
      mode,
      filterBaked: false,
    });
  };

  const recordPct = Math.min(100, (recordMs / maxVideoMs) * 100);
  const limits = MODE_LIMITS[mode];

  return (
    <div
      className={`${embedded ? "absolute" : "fixed"} inset-0 z-[200] flex flex-col`}
      style={{ background: "#000", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {recording && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.2)", zIndex: 30 }}>
          <div style={{ height: "100%", width: `${recordPct}%`, background: "#fff", transition: "width 0.1s linear" }} />
        </div>
      )}

      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        {cameraError ? (
          <div style={errorWrap}>
            <p style={{ color: CAMERA_TEXT, fontSize: 15, fontWeight: 500, lineHeight: 1.45, maxWidth: 280 }}>{cameraError}</p>
            <button type="button" onClick={() => void startCamera()} style={retryBtn}>
              Try again
            </button>
          </div>
        ) : null}

        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: cssF === "none" ? undefined : cssF,
            opacity: cameraError ? 0 : 1,
          }}
        />

        {/* Aspect guide */}
        {!cameraError && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <div
              style={{
                width: limits.aspect === "9/16" ? "min(100%, calc((100vh - 180px) * 9 / 16))" : "100%",
                maxWidth: "100%",
                aspectRatio: limits.aspect.replace("/", " / "),
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 4,
              }}
            />
          </div>
        )}

        {arId && <div style={arBadge}>{activeFilter.name}</div>}
        {recording && (
          <div style={recBadge}>
            {Math.ceil((maxVideoMs - recordMs) / 1000)}s
          </div>
        )}
      </div>

      <div style={topBar}>
        <button type="button" onClick={requestClose} aria-label="Close" style={iconBtn}>
          <X size={22} color={CAMERA_TEXT} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          aria-label="Filters"
          style={{
            ...iconBtn,
            background: filterId !== "none" || showFilters ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.35)",
          }}
        >
          <Sparkles size={20} color={CAMERA_TEXT} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          aria-label="Flip camera"
          style={iconBtn}
        >
          <SwitchCamera size={22} color={CAMERA_TEXT} strokeWidth={1.75} />
        </button>
      </div>

      <FilterPickerSheet
        open={showFilters}
        filterCategory={filterCategory}
        filterId={filterId}
        onCategoryChange={setFilterCategory}
        onFilterChange={setFilterId}
        onClose={() => setShowFilters(false)}
      />

      <div style={bottomChrome}>
        <div className="surna-camera-no-scrollbar" style={modeRow}>
          {CAMERA_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: 999,
                border: "none",
                fontSize: 13,
                fontWeight: mode === m.id ? 600 : 500,
                background: mode === m.id ? "rgba(255,255,255,0.18)" : "transparent",
                color: mode === m.id ? CAMERA_TEXT : CAMERA_MUTED,
                cursor: "pointer",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: CAMERA_MUTED, margin: "0 0 6px" }}>
          {mode === "reel" ? "Tap to record" : "Tap photo · hold for video"}
        </p>

        <div style={shutterRow}>
          <button type="button" onClick={() => void openGalleryPicker()} style={sideBtn} aria-label="Gallery">
            <ImageIcon size={26} color={CAMERA_TEXT} strokeWidth={1.5} />
          </button>

          <button
            type="button"
            aria-label={mode === "reel" || recording ? "Record" : "Take photo"}
            onPointerDown={onShutterDown}
            onPointerUp={onShutterUp}
            onPointerLeave={() => {
              if (shutterTimer.current) clearTimeout(shutterTimer.current);
            }}
            style={{
              width: 72,
              height: 72,
              borderRadius: mode === "reel" && recording ? 12 : "50%",
              background: recording ? "#fff" : "transparent",
              border: "3px solid #fff",
              boxShadow: recording ? "inset 0 0 0 4px #000" : "none",
              flexShrink: 0,
              transition: "border-radius 0.15s ease",
            }}
          />

          <div style={{ width: 44 }} aria-hidden />
        </div>
      </div>
    </div>
  );
}

const topBar: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  padding: "12px 16px",
  paddingTop: "max(12px, env(safe-area-inset-top))",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  zIndex: 20,
  background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)",
};

const bottomChrome: CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 18,
  paddingBottom: "max(12px, env(safe-area-inset-bottom))",
  background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)",
};

const modeRow: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 4,
  padding: "10px 16px 4px",
  overflowX: "auto",
};

const shutterRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingLeft: 28,
  paddingRight: 28,
  paddingTop: 4,
};

const iconBtn: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "rgba(0,0,0,0.35)",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const sideBtn: CSSProperties = {
  width: 44,
  height: 44,
  background: "none",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const retryBtn: CSSProperties = {
  padding: "10px 22px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.35)",
  background: "transparent",
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const arBadge: CSSProperties = {
  position: "absolute",
  top: "12%",
  left: "50%",
  transform: "translateX(-50%)",
  padding: "6px 12px",
  borderRadius: 8,
  background: "rgba(0,0,0,0.55)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 500,
  pointerEvents: "none",
};

const recBadge: CSSProperties = {
  position: "absolute",
  top: 72,
  left: "50%",
  transform: "translateX(-50%)",
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(255,59,48,0.9)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,
  pointerEvents: "none",
};

const errorWrap: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  textAlign: "center",
  background: "#000",
  gap: 16,
};
