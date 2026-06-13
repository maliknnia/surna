import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { X, SwitchCamera, Image as ImageIcon, Sparkles } from "lucide-react";

import {

  CAMERA_MODES,

  type CameraMode,

  type FilterCategory,

} from "./constants";

import { filterCss, getFiltersForCategory } from "./filterEngine";

import { captureVideoFrame } from "./arOverlays";

import { CAMERA_MUTED, CAMERA_TEXT, EDITOR_UI } from "./cameraTheme";

import { useSurnaCamera } from "./SurnaCameraContext";

import { useCameraEmbed } from "./SurnaCameraContent";

import FilterPickerSheet from "./FilterPickerSheet";
import { pickMediaFromGallery } from "@/lib/capacitor/camera";



const MAX_VIDEO_MS = 60_000;

const VISIBLE_MODES = CAMERA_MODES.filter((m) => m.id !== "live");



type Props = {

  initialMode?: CameraMode;

  onCaptured: (payload: {

    blob: Blob;

    previewUrl: string;

    type: "image" | "video";

    filterId: string;

    arId: string | null;

  }) => void;

};



export default function CameraView({ initialMode = "photo", onCaptured }: Props) {

  const { requestClose } = useSurnaCamera();

  const embedded = useCameraEmbed();

  const videoRef = useRef<HTMLVideoElement>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);

  const chunksRef = useRef<Blob[]>([]);

  const shutterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);



  const [mode, setMode] = useState<CameraMode>(initialMode);



  useEffect(() => {

    setMode(initialMode);

  }, [initialMode]);



  const [facing, setFacing] = useState<"user" | "environment">("environment");

  const [filterCategory, setFilterCategory] = useState<FilterCategory>("sport");

  const [filterId, setFilterId] = useState("none");

  const [showFilters, setShowFilters] = useState(false);

  const [recording, setRecording] = useState(false);

  const [recordMs, setRecordMs] = useState(0);

  const [cameraError, setCameraError] = useState<string | null>(null);



  const filters = getFiltersForCategory(filterCategory);

  const activeFilter = filters.find((f) => f.id === filterId) ?? filters[0];

  const arId = activeFilter?.isAr ? activeFilter.id : null;

  const cssF = filterCss(filterId);

  const filterActive = filterId !== "none";



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

        audio: mode === "video" || mode === "reel",

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

  }, [facing, mode]);



  useEffect(() => {

    startCamera();

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

      if (elapsed >= MAX_VIDEO_MS) stopRecording();

    }, 100);

    return () => clearInterval(iv);

  }, [recording, stopRecording]);



  const capturePhoto = useCallback(async () => {

    const video = videoRef.current;

    if (!video) return;

    try {

      const blob = await captureVideoFrame(video, filterId, arId, cssF);

      const previewUrl = URL.createObjectURL(blob);

      onCaptured({ blob, previewUrl, type: "image", filterId, arId });

    } catch (e) {

      console.error(e);

    }

  }, [filterId, arId, cssF, onCaptured]);



  const startRecording = () => {

    if (!streamRef.current || mode === "photo" || mode === "story") return;

    chunksRef.current = [];

    const rec = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });

    recorderRef.current = rec;

    rec.ondataavailable = (e) => {

      if (e.data.size) chunksRef.current.push(e.data);

    };

    rec.onstop = () => {

      const blob = new Blob(chunksRef.current, { type: "video/webm" });

      const previewUrl = URL.createObjectURL(blob);

      onCaptured({ blob, previewUrl, type: "video", filterId, arId });

      setRecording(false);

      setRecordMs(0);

    };

    rec.start(200);

    setRecording(true);

    setRecordMs(0);

  };



  const onShutterDown = () => {

    if (mode === "photo" || mode === "story") return;

    shutterTimer.current = setTimeout(() => startRecording(), 400);

  };



  const onShutterUp = () => {

    if (shutterTimer.current) {

      clearTimeout(shutterTimer.current);

      shutterTimer.current = null;

    }

    if (mode === "photo" || mode === "story") {

      capturePhoto();

      return;

    }

    if (recording) stopRecording();

    else if (mode !== "video" && mode !== "reel") capturePhoto();

    else if (!recording) capturePhoto();

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
    });
  };



  const recordPct = Math.min(100, (recordMs / MAX_VIDEO_MS) * 100);

  const isVideoMode = mode === "video" || mode === "reel";



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

          <div

            style={{

              position: "absolute",

              inset: 0,

              display: "flex",

              flexDirection: "column",

              alignItems: "center",

              justifyContent: "center",

              padding: 24,

              textAlign: "center",

              background: "#000000",

              gap: 16,

            }}

          >

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

        {arId && (

          <div style={arBadge}>{activeFilter.name}</div>

        )}

      </div>



      {/* Top bar */}

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

            background: filterActive || showFilters ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.35)",

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



      {/* Bottom controls */}

      <div style={bottomChrome}>

        <div className="surna-camera-no-scrollbar" style={modeRow}>

          {VISIBLE_MODES.map((m) => (

            <button

              key={m.id}

              type="button"

              onClick={() => setMode(m.id)}

              style={{

                flexShrink: 0,

                padding: "6px 12px",

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



        <div style={shutterRow}>

          <button type="button" onClick={() => void openGalleryPicker()} style={sideBtn} aria-label="Gallery">

            <ImageIcon size={26} color={CAMERA_TEXT} strokeWidth={1.5} />

          </button>



          <button

            type="button"

            aria-label={isVideoMode ? "Record" : "Take photo"}

            onPointerDown={onShutterDown}

            onPointerUp={onShutterUp}

            onPointerLeave={() => {

              if (shutterTimer.current) clearTimeout(shutterTimer.current);

            }}

            style={{

              width: 72,

              height: 72,

              borderRadius: "50%",

              background: recording ? "#fff" : "transparent",

              border: "3px solid #fff",

              boxShadow: recording ? "inset 0 0 0 4px #000" : "none",

              flexShrink: 0,

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

  paddingTop: 8,

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


