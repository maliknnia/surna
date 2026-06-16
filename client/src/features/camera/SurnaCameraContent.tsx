import { createContext, useContext, useState, type ReactNode } from "react";
import { useSurnaCamera } from "./SurnaCameraContext";
import CameraView from "./CameraView";
import GifPickerSheet from "./GifPickerSheet";
import MediaPreviewScreen from "./MediaPreviewScreen";
import { normalizeCameraMode, type CameraMode } from "./constants";
import type { GiphyItem } from "./giphyApi";
import { publishGifToChat } from "./cameraPublishApi";

const CameraEmbedContext = createContext(false);

export function useCameraEmbed() {
  return useContext(CameraEmbedContext);
}

type CaptureState = {
  blob: Blob;
  previewUrl: string;
  type: "image" | "video";
  filterId: string;
  arId: string | null;
  mode: CameraMode;
  durationSec?: number;
  filterBaked?: boolean;
};

type Props = {
  /** Fills parent (feed slide panel) instead of fixed full-screen portal */
  inline?: boolean;
};

export default function SurnaCameraContent({ inline = false }: Props) {
  const { view, requestClose, setView, options } = useSurnaCamera();
  const [capture, setCapture] = useState<CaptureState | null>(null);

  const handleGif = async (gif: GiphyItem) => {
    if (options.onGifSelect) {
      options.onGifSelect(gif.url);
      requestClose();
      return;
    }
    if (options.conversationId) {
      await publishGifToChat(options.conversationId, gif.url);
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
        arId={capture.arId}
        filterBaked={capture.filterBaked}
        captureMode={capture.mode}
        durationSec={capture.durationSec}
        onDone={() => {
          setCapture(null);
          setView("camera");
        }}
      />
    );
  } else {
    content = (
      <div className={inline ? "surna-camera-inline-root" : "surna-camera-enter surna-camera-root"}>
        <CameraView
          initialMode={normalizeCameraMode(options.mode)}
          onCaptured={(payload) => {
            setCapture({
              blob: payload.blob,
              previewUrl: payload.previewUrl,
              type: payload.type,
              filterId: payload.filterId,
              arId: payload.arId,
              mode: payload.mode,
              durationSec: payload.durationSec,
              filterBaked: payload.filterBaked,
            });
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
