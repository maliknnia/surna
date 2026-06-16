import { useCallback, useEffect, useRef, useState } from "react";
import { X, Undo2, Trash2, Type, Smile, Pencil, Loader2 } from "lucide-react";
import { filterCss } from "./filterEngine";
import { MODE_LIMITS, SPORT_TAGS, normalizeCameraMode, type CameraMode } from "./constants";
import {
  CAMERA_MUTED,
  CAMERA_TEXT,
  EDITOR_COLORS,
  EDITOR_UI,
} from "./cameraTheme";
import { useSurnaCamera } from "./SurnaCameraContext";
import { useCameraEmbed } from "./SurnaCameraContent";
import { useToast } from "@/hooks/use-toast";
import { useCameraPublish } from "@/hooks/useCameraPublish";
import ConversationPicker from "./ConversationPicker";
import StickerSheet from "./StickerSheet";
import EditorColorBar from "./EditorColorBar";
import { exportEditedMedia, hasExportableEdits } from "./exportEditedMedia";

type Sticker = { id: string; label: string; x: number; y: number; scale: number };
type TextLayer = { id: string; text: string; x: number; y: number; color: string };
type DrawStroke = { points: { x: number; y: number }[]; color: string; size: number };

type Props = {
  previewUrl: string;
  blob: Blob;
  mediaType: "image" | "video";
  filterId: string;
  arId?: string | null;
  filterBaked?: boolean;
  captureMode?: CameraMode;
  durationSec?: number;
  onDone: () => void;
};

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: "5px 10px",
  borderRadius: 999,
  border: active ? "none" : EDITOR_UI.chipBorder,
  background: active ? "rgba(255,255,255,0.22)" : EDITOR_UI.chipBg,
  color: active ? CAMERA_TEXT : CAMERA_MUTED,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
});

export default function MediaPreviewScreen({
  previewUrl,
  blob,
  mediaType,
  filterId,
  arId = null,
  filterBaked = false,
  captureMode = "post",
  durationSec,
  onDone,
}: Props) {
  const { options, requestClose } = useSurnaCamera();
  const embedded = useCameraEmbed();
  const { toast } = useToast();
  const { publishFeed, publishStory, publishChat } = useCameraPublish();

  const mode = normalizeCameraMode(options.mode ?? captureMode);
  const isStoryEntry = options.source === "story" || mode === "story";
  const isMessenger = options.source === "messenger" || !!options.conversationId;
  const isReel = mode === "reel" || (mediaType === "video" && captureMode === "reel");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [texts, setTexts] = useState<TextLayer[]>([]);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<DrawStroke | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [showChatPicker, setShowChatPicker] = useState(false);
  const [showSport, setShowSport] = useState(false);
  const [caption, setCaption] = useState("");
  const [sport, setSport] = useState("");
  const [location, setLocation] = useState("");
  const [editorColor, setEditorColor] = useState<string>(EDITOR_COLORS[0].value);
  const [brushSize, setBrushSize] = useState(4);
  const [drawMode, setDrawMode] = useState(false);
  const [textToolActive, setTextToolActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const cssF = filterCss(filterId);
  const showLiveFilter = !filterBaked && cssF !== "none";
  const aspect = MODE_LIMITS[mode].aspect;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of [...strokes, ...(currentStroke ? [currentStroke] : [])]) {
      if (s.points.length < 2) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      ctx.stroke();
    }
  }, [strokes, currentStroke]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const addText = () => {
    setTextToolActive(true);
    setTexts((t) => [
      ...t,
      { id: `t-${Date.now()}`, text: "Tap to type", x: 50, y: 42, color: editorColor },
    ]);
  };

  const pointerToCanvas = (e: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const resolveExportBlob = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return { blob, mediaType };

    const rect = container.getBoundingClientRect();
    const input = {
      blob,
      mediaType,
      filterId,
      arId,
      filterBaked,
      displayWidth: rect.width,
      displayHeight: rect.height,
      stickers,
      texts,
      strokes,
    };

    if (!hasExportableEdits(input)) {
      return { blob, mediaType };
    }

    const exported = await exportEditedMedia(input);
    return { blob: exported, mediaType };
  }, [blob, mediaType, filterId, arId, filterBaked, stickers, texts, strokes]);

  const runPublish = async (action: "story" | "feed" | "reel") => {
    setUploading(true);
    try {
      const { blob: exportBlob, mediaType: exportType } = await resolveExportBlob();
      if (action === "story") {
        await publishStory(exportBlob, exportType, caption);
        options.onStoryPosted?.();
        toast({ title: "Added to your story" });
      } else {
        await publishFeed({
          blob: exportBlob,
          mediaType: exportType,
          caption,
          sport: sport || undefined,
          location: location || undefined,
          mode: action === "reel" ? "reel" : "post",
          durationSec,
        });
        options.onFeedPosted?.();
        toast({ title: action === "reel" ? "Reel posted" : "Posted to feed" });
      }
      onDone();
      requestClose();
    } catch (e) {
      console.error(e);
      toast({ title: "Couldn't share", description: "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSendChat = async (conversationId: string) => {
    setUploading(true);
    try {
      const { blob: exportBlob, mediaType: exportType } = await resolveExportBlob();
      const cid = options.conversationId ?? conversationId;
      const result = await publishChat({ blob: exportBlob, mediaType: exportType, conversationId: cid });
      options.onMediaSent?.({ url: result.url, mediaId: result.mediaId, type: exportType });
      onDone();
      requestClose();
    } catch (e) {
      console.error(e);
      toast({ title: "Couldn't send", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    if (window.confirm("Discard this capture?")) onDone();
  };

  const previewFrameStyle: React.CSSProperties = {
    position: "relative",
    width: mode === "story" || mode === "reel" ? "100%" : "100%",
    maxWidth: mode === "story" || mode === "reel" ? 360 : undefined,
    margin: mode === "post" ? "0 auto" : undefined,
    aspectRatio: aspect.replace("/", " / "),
    borderRadius: 12,
    overflow: "hidden",
    border: EDITOR_UI.previewFrame,
    background: "#0a0a0a",
    flexShrink: 0,
  };

  return (
    <div
      className={`${embedded ? "absolute" : "fixed"} inset-0 z-[205] flex flex-col`}
      style={{ background: "#000", fontFamily: "Inter, sans-serif" }}
    >
      <div
        style={{
          padding: "12px 16px",
          paddingTop: "max(12px, env(safe-area-inset-top))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button type="button" onClick={handleBack} style={iconBtn} aria-label="Back">
          <X size={22} color={CAMERA_TEXT} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: CAMERA_TEXT }}>
          {isStoryEntry ? "Story" : isReel ? "Reel" : "Post"}
        </span>
        <div style={{ width: 40 }} />
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          padding: "0 16px",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div ref={containerRef} style={previewFrameStyle}>
          {mediaType === "video" ? (
            <video
              src={previewUrl}
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: showLiveFilter ? cssF : undefined,
              }}
            />
          ) : (
            <img
              src={previewUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: showLiveFilter ? cssF : undefined,
              }}
            />
          )}

          {stickers.map((s) => (
            <div
              key={s.id}
              onPointerDown={() => setDragId(s.id)}
              onPointerMove={(e) => {
                if (dragId !== s.id) return;
                const p = pointerToCanvas(e);
                setStickers((list) => list.map((x) => (x.id === s.id ? { ...x, x: p.x, y: p.y } : x)));
              }}
              onPointerUp={() => setDragId(null)}
              onDoubleClick={() => setStickers((list) => list.filter((x) => x.id !== s.id))}
              style={{
                position: "absolute",
                left: s.x,
                top: s.y,
                transform: `translate(-50%, -50%) scale(${s.scale})`,
                fontSize: 36,
                cursor: "grab",
                userSelect: "none",
              }}
            >
              {s.label}
            </div>
          ))}

          {texts.map((t) => (
            <input
              key={t.id}
              value={t.text}
              onChange={(e) =>
                setTexts((list) => list.map((x) => (x.id === t.id ? { ...x, text: e.target.value } : x)))
              }
              style={{
                position: "absolute",
                left: `${t.x}%`,
                top: `${t.y}%`,
                transform: "translate(-50%, -50%)",
                background: "transparent",
                border: "none",
                color: t.color,
                fontSize: 18,
                fontWeight: 700,
                textAlign: "center",
                width: "80%",
                outline: "none",
              }}
            />
          ))}

          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: drawMode ? "auto" : "none",
            }}
            onPointerDown={(e) => {
              if (!drawMode) return;
              const p = pointerToCanvas(e);
              setCurrentStroke({ points: [p], color: editorColor, size: brushSize });
            }}
            onPointerMove={(e) => {
              if (!drawMode || !currentStroke) return;
              const p = pointerToCanvas(e);
              setCurrentStroke((s) => (s ? { ...s, points: [...s.points, p] } : s));
            }}
            onPointerUp={() => {
              if (currentStroke) {
                setStrokes((s) => [...s, currentStroke]);
                setCurrentStroke(null);
              }
            }}
          />
        </div>
      </div>

      {(drawMode || textToolActive) && (
        <div style={{ padding: "4px 0" }}>
          <EditorColorBar value={editorColor} onChange={setEditorColor} />
        </div>
      )}

      {drawMode && (
        <div style={{ padding: "4px 16px 8px", display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
          <input
            type="range"
            min={2}
            max={14}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            style={{ flex: 1, maxWidth: 160, accentColor: "#fff" }}
          />
          <button type="button" onClick={() => setStrokes((s) => s.slice(0, -1))} style={toolBtn} aria-label="Undo">
            <Undo2 size={16} color="#fff" />
          </button>
          <button type="button" onClick={() => setDrawMode(false)} style={{ ...toolBtn, width: "auto", padding: "0 12px", fontSize: 12, fontWeight: 600, color: "#fff" }}>
            Done
          </button>
        </div>
      )}

      {!isMessenger && !isStoryEntry && (
        <div style={{ padding: "8px 16px 0" }}>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption…"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: EDITOR_UI.previewFrame,
              background: "rgba(255,255,255,0.06)",
              color: CAMERA_TEXT,
              fontSize: 14,
            }}
          />
          <button
            type="button"
            onClick={() => setShowSport((v) => !v)}
            style={{ ...chipStyle(showSport), marginTop: 8 }}
          >
            {sport ? sport : "+ Sport"}
          </button>
          {showSport && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {SPORT_TAGS.map((s) => (
                <button key={s} type="button" onClick={() => setSport(s)} style={chipStyle(sport === s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!isMessenger && (
        <div style={{ padding: "8px 16px", display: "flex", gap: 20, justifyContent: "center" }}>
          {!isStoryEntry && (
            <button type="button" onClick={() => setShowStickers(true)} style={editLink} aria-label="Stickers">
              <Smile size={20} />
            </button>
          )}
          <button type="button" onClick={addText} style={editLink} aria-label="Text">
            <Type size={20} />
          </button>
          <button
            type="button"
            onClick={() => {
              setDrawMode(true);
              setTextToolActive(false);
            }}
            style={editLink}
            aria-label="Draw"
          >
            <Pencil size={20} />
          </button>
        </div>
      )}

      <div style={{ padding: "12px 16px", paddingBottom: "max(16px, env(safe-area-inset-bottom))", display: "flex", gap: 8 }}>
        {uploading ? (
          <div style={{ ...primaryBtn, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Finalizing…
          </div>
        ) : isMessenger ? (
          <button
            type="button"
            onClick={() => {
              if (options.conversationId) void handleSendChat(options.conversationId);
              else setShowChatPicker(true);
            }}
            style={{ ...primaryBtn, flex: 1 }}
          >
            Send
          </button>
        ) : isStoryEntry ? (
          <button type="button" onClick={() => void runPublish("story")} style={{ ...primaryBtn, flex: 1 }}>
            Add to story
          </button>
        ) : isReel ? (
          <button type="button" onClick={() => void runPublish("reel")} style={{ ...primaryBtn, flex: 1 }}>
            Share reel
          </button>
        ) : (
          <>
            <button type="button" onClick={() => void runPublish("story")} style={secondaryBtn}>
              Story
            </button>
            <button type="button" onClick={() => void runPublish("feed")} style={primaryBtn}>
              Post
            </button>
          </>
        )}
      </div>

      {showStickers && (
        <StickerSheet
          onClose={() => setShowStickers(false)}
          onPick={(label) => {
            setStickers((s) => [...s, { id: `s-${Date.now()}`, label, x: 120, y: 120, scale: 1 }]);
            setShowStickers(false);
          }}
        />
      )}

      {showChatPicker && (
        <ConversationPicker onSelect={handleSendChat} onClose={() => setShowChatPicker(false)} />
      )}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  flex: 1,
  padding: "14px 12px",
  borderRadius: 12,
  border: "none",
  background: "#fff",
  color: "#000",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  flex: 1,
  padding: "14px 10px",
  borderRadius: 12,
  border: EDITOR_UI.chipBorder,
  background: EDITOR_UI.chipBg,
  color: CAMERA_TEXT,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const editLink: React.CSSProperties = {
  background: "none",
  border: "none",
  color: CAMERA_MUTED,
  cursor: "pointer",
  padding: 4,
  display: "flex",
  alignItems: "center",
};

const toolBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: EDITOR_UI.chipBorder,
  background: EDITOR_UI.chipBg,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const iconBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  border: "none",
  background: EDITOR_UI.chipBg,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
