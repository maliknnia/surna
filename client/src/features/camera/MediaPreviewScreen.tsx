import { useCallback, useEffect, useRef, useState } from "react";

import { X, Undo2, Trash2, Type } from "lucide-react";

import { filterCss } from "./filterEngine";

import { SPORT_TAGS } from "./constants";

import {

  CAMERA_CARD,

  CAMERA_MUTED,

  CAMERA_TEXT,

  EDITOR_COLORS,

  EDITOR_UI,

  FONT_BARLOW,

} from "./cameraTheme";

import { uploadMediaBlob, postToFeed, postStory } from "./uploadMedia";

import { useSurnaCamera } from "./SurnaCameraContext";

import { useCameraEmbed } from "./SurnaCameraContent";

import { useToast } from "@/hooks/use-toast";

import ConversationPicker from "./ConversationPicker";

import StickerSheet from "./StickerSheet";

import EditorColorBar from "./EditorColorBar";



type Sticker = { id: string; label: string; x: number; y: number; scale: number };

type TextLayer = { id: string; text: string; x: number; y: number; color: string; font: string; align: string };

type DrawStroke = { points: { x: number; y: number }[]; color: string; size: number };



type Props = {

  previewUrl: string;

  blob: Blob;

  mediaType: "image" | "video";

  filterId: string;

  initialTool?: "stickers" | "text" | "draw" | null;

  onDone: () => void;

};



const chipStyle = (active: boolean): React.CSSProperties => ({

  padding: "6px 12px",

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

  initialTool = null,

  onDone,

}: Props) {

  const { options, requestClose } = useSurnaCamera();

  const embedded = useCameraEmbed();

  const { toast } = useToast();

  const isStory = options.mode === "story" || options.source === "story";

  const isMessenger = options.source === "messenger" || !!options.conversationId;



  const canvasRef = useRef<HTMLCanvasElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);



  const [stickers, setStickers] = useState<Sticker[]>([]);

  const [texts, setTexts] = useState<TextLayer[]>([]);

  const [strokes, setStrokes] = useState<DrawStroke[]>([]);

  const [currentStroke, setCurrentStroke] = useState<DrawStroke | null>(null);

  const [showStickers, setShowStickers] = useState(initialTool === "stickers");

  const [showFeedForm, setShowFeedForm] = useState(false);

  const [showChatPicker, setShowChatPicker] = useState(false);

  const [caption, setCaption] = useState("");

  const [sport, setSport] = useState("");

  const [location, setLocation] = useState("");

  const [editorColor, setEditorColor] = useState<string>(EDITOR_COLORS[0].value);

  const [brushSize, setBrushSize] = useState(4);

  const [drawMode, setDrawMode] = useState(initialTool === "draw");

  const [textToolActive, setTextToolActive] = useState(initialTool === "text");

  const [uploading, setUploading] = useState(false);

  const [dragId, setDragId] = useState<string | null>(null);



  const cssF = filterCss(filterId);

  const showColorBar = drawMode || textToolActive || texts.length > 0;



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

    const all = [...strokes, ...(currentStroke ? [currentStroke] : [])];

    for (const s of all) {

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

      {

        id: `t-${Date.now()}`,

        text: "Tap to type",

        x: 50,

        y: 42,

        color: editorColor,

        font: "inter",

        align: "center",

      },

    ]);

  };



  useEffect(() => {

    if (initialTool === "text") addText();

  }, []);



  useEffect(() => {

    if (!textToolActive && texts.length === 0) return;

    setTexts((list) => list.map((t) => ({ ...t, color: editorColor })));

  }, [editorColor, textToolActive, texts.length]);



  const handlePostStory = async () => {

    setUploading(true);

    try {

      const { url } = await uploadMediaBlob(blob, `story.${mediaType === "video" ? "webm" : "jpg"}`);

      await postStory(url, mediaType);

      options.onStoryPosted?.();

      toast({ title: "Added to your story" });

      onDone();

      requestClose();

    } catch (e) {

      console.error(e);

      toast({ title: "Couldn't share story", variant: "destructive" });

    } finally {

      setUploading(false);

    }

  };



  const handlePostFeed = async () => {

    setUploading(true);

    try {

      const { url } = await uploadMediaBlob(blob, `post.${mediaType === "video" ? "webm" : "jpg"}`);

      await postToFeed({

        content: caption,

        imageUrl: mediaType === "image" ? url : undefined,

        videoUrl: mediaType === "video" ? url : undefined,

        mediaType,

        location,

        sport,

      });

      options.onFeedPosted?.();

      toast({ title: "Posted to feed" });

      onDone();

      requestClose();

    } catch (e) {

      console.error(e);

      toast({ title: "Couldn't post to feed", variant: "destructive" });

    } finally {

      setUploading(false);

    }

  };



  const handleSendChat = async (conversationId: string) => {

    setUploading(true);

    try {

      const { url, mediaId } = await uploadMediaBlob(blob, `chat.${mediaType === "video" ? "webm" : "jpg"}`);

      if (options.conversationId || conversationId) {

        const cid = options.conversationId ?? conversationId;

        if (mediaId) {

          await fetch("/api/messenger/dm/messages", {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            credentials: "include",

            body: JSON.stringify({ conversationId: cid, mediaId }),

          });

        } else {

          await fetch("/api/messenger/dm/messages", {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            credentials: "include",

            body: JSON.stringify({ conversationId: cid, body: url }),

          });

        }

        options.onMediaSent?.({ url, mediaId, type: mediaType });

      }

      onDone();

      requestClose();

    } catch (e) {

      console.error(e);

    } finally {

      setUploading(false);

    }

  };



  const pointerToCanvas = (e: React.PointerEvent) => {

    const rect = containerRef.current!.getBoundingClientRect();

    return { x: e.clientX - rect.left, y: e.clientY - rect.top };

  };



  const previewFrameStyle: React.CSSProperties = isStory

    ? {

        position: "relative",

        width: "100%",

        maxWidth: 360,

        aspectRatio: "9/16",

        borderRadius: 16,

        overflow: "hidden",

        border: EDITOR_UI.previewFrame,

        background: "#0a0a0a",

        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",

      }

    : {

        position: "relative",

        flex: 1,

        margin: "0 16px",

        borderRadius: 16,

        overflow: "hidden",

        border: EDITOR_UI.previewFrame,

        background: "#0a0a0a",

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

        <span style={{ fontSize: 15, fontWeight: 600, color: CAMERA_TEXT }}>

          {isStory ? "Your story" : "Edit"}

        </span>

        <button type="button" onClick={onDone} style={iconBtn} aria-label="Close">

          <X size={22} color={CAMERA_TEXT} />

        </button>

      </div>



      <div

        style={

          isStory

            ? { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px", minHeight: 0 }

            : { flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }

        }

      >

        <div ref={containerRef} style={previewFrameStyle}>

          {mediaType === "video" ? (

            <video

              src={previewUrl}

              controls

              style={{ width: "100%", height: "100%", objectFit: "cover", filter: cssF === "none" ? undefined : cssF }}

            />

          ) : (

            <img

              src={previewUrl}

              alt=""

              style={{ width: "100%", height: "100%", objectFit: "cover", filter: cssF === "none" ? undefined : cssF }}

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

            <div

              key={t.id}

              contentEditable

              suppressContentEditableWarning

              onFocus={() => {

                setTextToolActive(true);

                setEditorColor(t.color);

              }}

              onBlur={(e) =>

                setTexts((list) =>

                  list.map((x) => (x.id === t.id ? { ...x, text: e.currentTarget.textContent || "" } : x)),

                )

              }

              onPointerDown={() => setDragId(t.id)}

              onPointerMove={(e) => {

                if (dragId !== t.id) return;

                const p = pointerToCanvas(e);

                setTexts((list) => list.map((x) => (x.id === t.id ? { ...x, x: p.x, y: p.y } : x)));

              }}

              onPointerUp={() => setDragId(null)}

              onDoubleClick={() => setTexts((list) => list.filter((x) => x.id !== t.id))}

              style={{

                position: "absolute",

                left: t.x,

                top: t.y,

                transform: "translate(-50%, -50%)",

                color: t.color,

                fontFamily: t.font === "barlow" ? FONT_BARLOW : "Inter, sans-serif",

                fontWeight: 800,

                fontSize: 22,

                textAlign: t.align as CanvasTextAlign,

                cursor: "grab",

                minWidth: 40,

                textShadow: t.color === "#000000" ? "0 0 4px rgba(255,255,255,0.4)" : "0 1px 3px rgba(0,0,0,0.55)",

              }}

            >

              {t.text}

            </div>

          ))}

          <canvas

            ref={canvasRef}

            style={{ position: "absolute", inset: 0, pointerEvents: drawMode ? "auto" : "none" }}

            onPointerDown={(e) => {

              if (!drawMode) return;

              const p = pointerToCanvas(e);

              setCurrentStroke({ points: [p], color: editorColor, size: brushSize });

            }}

            onPointerMove={(e) => {

              if (!currentStroke) return;

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



      {showColorBar && (

        <div style={{ padding: "8px 0 4px" }}>

          <EditorColorBar value={editorColor} onChange={setEditorColor} />

        </div>

      )}



      {drawMode && (

        <div

          style={{

            padding: "4px 16px 8px",

            display: "flex",

            gap: 8,

            alignItems: "center",

            justifyContent: "center",

          }}

        >

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

          <button type="button" onClick={() => setStrokes([])} style={toolBtn} aria-label="Clear">

            <Trash2 size={16} color="#fff" />

          </button>

          <button

            type="button"

            onClick={() => setDrawMode(false)}

            style={{ ...toolBtn, padding: "0 12px", width: "auto", fontSize: 12, fontWeight: 600, color: "#fff" }}

          >

            Done

          </button>

        </div>

      )}



      {showFeedForm ? (

        <div style={{ padding: 16, background: CAMERA_CARD, margin: "0 16px 16px", borderRadius: 16, border: EDITOR_UI.previewFrame }}>

          <p style={{ fontSize: 13, fontWeight: 600, color: CAMERA_TEXT, marginBottom: 10 }}>New post</p>

          <textarea

            value={caption}

            onChange={(e) => setCaption(e.target.value)}

            placeholder="What is happening in sport today?"

            style={{

              width: "100%",

              minHeight: 72,

              background: "#0a0a0a",

              border: EDITOR_UI.previewFrame,

              borderRadius: 12,

              padding: 12,

              color: CAMERA_TEXT,

              fontSize: 14,

              resize: "none",

            }}

          />

          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>

            {SPORT_TAGS.map((s) => (

              <button key={s} type="button" onClick={() => setSport(s)} style={chipStyle(sport === s)}>

                {s}

              </button>

            ))}

          </div>

          <input

            value={location}

            onChange={(e) => setLocation(e.target.value)}

            placeholder="Add location"

            style={{

              width: "100%",

              marginTop: 8,

              padding: 10,

              borderRadius: 10,

              border: EDITOR_UI.previewFrame,

              background: "#0a0a0a",

              color: CAMERA_TEXT,

            }}

          />

          <button type="button" disabled={uploading} onClick={handlePostFeed} style={primaryBtn}>

            {uploading ? "Posting…" : "Post to feed"}

          </button>

        </div>

      ) : (

        <>

          {!isStory && !isMessenger && (

            <div style={{ padding: "6px 16px 0", display: "flex", gap: 20, justifyContent: "center" }}>

              <button type="button" onClick={() => setShowStickers(true)} style={editLink}>

                Stickers

              </button>

              <button type="button" onClick={addText} style={editLink}>

                <Type size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />

                Text

              </button>

              <button

                type="button"

                onClick={() => {

                  setDrawMode(true);

                  setTextToolActive(false);

                }}

                style={editLink}

              >

                Draw

              </button>

            </div>

          )}



          {isStory && !drawMode && (

            <div style={{ padding: "6px 16px 0", display: "flex", gap: 20, justifyContent: "center" }}>

              <button type="button" onClick={addText} style={editLink}>

                Text

              </button>

              <button

                type="button"

                onClick={() => {

                  setDrawMode(true);

                  setTextToolActive(false);

                }}

                style={editLink}

              >

                Draw

              </button>

            </div>

          )}



          <div style={{ padding: "12px 16px", paddingBottom: "max(16px, env(safe-area-inset-bottom))", display: "flex", gap: 8 }}>

            {isMessenger ? (

              <button

                type="button"

                disabled={uploading}

                onClick={() => {

                  if (options.conversationId) void handleSendChat(options.conversationId);

                  else setShowChatPicker(true);

                }}

                style={{ ...primaryBtn, flex: 1 }}

              >

                Send

              </button>

            ) : isStory ? (

              <button type="button" disabled={uploading} onClick={handlePostStory} style={{ ...primaryBtn, flex: 1 }}>

                {uploading ? "Sharing…" : "Add to story"}

              </button>

            ) : (

              <>

                <button type="button" disabled={uploading} onClick={handlePostStory} style={secondaryBtn}>

                  Story

                </button>

                <button type="button" disabled={uploading} onClick={() => setShowFeedForm(true)} style={primaryBtn}>

                  Post

                </button>

                <button type="button" disabled={uploading} onClick={() => setShowChatPicker(true)} style={secondaryBtn}>

                  Send

                </button>

              </>

            )}

          </div>

        </>

      )}



      {showStickers && (

        <StickerSheet

          onClose={() => setShowStickers(false)}

          onPick={(label) => {

            setStickers((s) => [...s, { id: `s-${Date.now()}`, label, x: 120, y: 120, scale: 1 }]);

            setShowStickers(false);

          }}

        />

      )}

      {showChatPicker && <ConversationPicker onSelect={handleSendChat} onClose={() => setShowChatPicker(false)} />}

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

  fontSize: 13,

  fontWeight: 500,

  cursor: "pointer",

  padding: "4px 0",

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


