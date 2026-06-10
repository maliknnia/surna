import { createContext, useContext, useState, type ReactNode } from "react";
import { useSurnaCamera } from "./SurnaCameraContext";

const CameraEmbedContext = createContext(false);

export function useCameraEmbed() {
  return useContext(CameraEmbedContext);
}
import CameraView from "./CameraView";
import GifPickerSheet from "./GifPickerSheet";
import MediaPreviewScreen from "./MediaPreviewScreen";
import type { CameraMode } from "./constants";
import type { GiphyItem } from "./giphyApi";

type CaptureState = {
  blob: Blob;
  previewUrl: string;
  type: "image" | "video";
  filterId: string;
  arId: string | null;
};

type Props = {
  /** Fills parent (feed slide panel) instead of fixed full-screen portal */
  inline?: boolean;
};

export default function SurnaCameraContent({ inline = false }: Props) {
  const { view, requestClose, setView, options } = useSurnaCamera();
  const [capture, setCapture] = useState<CaptureState | null>(null);
  const [pendingTool, setPendingTool] = useState<"stickers" | "text" | "draw" | null>(null);

  const handleGif = async (gif: GiphyItem) => {
    if (options.onGifSelect) {
      options.onGifSelect(gif.url);
      requestClose();
      return;
    }
    if (options.conversationId) {
      await fetch("/api/messenger/dm/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversationId: options.conversationId, body: gif.url }),
      });
      options.onMediaSent?.({ url: gif.url, type: "image" });
      requestClose();
      return;
    }
    requestClose();
  };

  let content: ReactNode;

  if (view === "gif") {
    content = <GifPickerSheet onSelect={handleGif} />;
  } else if (view === "preview" && capture) {
    content = (
      <MediaPreviewScreen
        previewUrl={capture.previewUrl}
        blob={capture.blob}
        mediaType={capture.type}
        filterId={capture.filterId}
        initialTool={pendingTool}
        onDone={() => {
          setCapture(null);
          setPendingTool(null);
          setView("camera");
        }}
      />
    );
  } else {
    content = (
      <div className={inline ? "surna-camera-inline-root" : "surna-camera-enter surna-camera-root"}>
        <CameraView
          initialMode={(options.mode as CameraMode) ?? "photo"}
          onCaptured={(payload) => {
            setCapture(payload);
            setView("preview");
          }}
        />
      </div>
    );
  }

  return (
    <CameraEmbedContext.Provider value={inline}>{content}</CameraEmbedContext.Provider>
  );
}
