import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CameraMode } from "./constants";
import { normalizeCameraMode } from "./constants";

export type CameraSource = "nav" | "feed" | "messenger" | "story";

export type CameraOpenOptions = {
  source?: CameraSource;
  mode?: CameraMode;
  initialView?: "camera" | "gif";
  conversationId?: string;
  onGifSelect?: (gifUrl: string) => void;
  onMediaSent?: (payload: { mediaId?: string; url: string; type: "image" | "video" }) => void;
  onStoryPosted?: () => void;
  onFeedPosted?: () => void;
};

const FEED_SLIDE_MS = 380;

type CameraContextValue = {
  isOpen: boolean;
  isClosing: boolean;
  view: "camera" | "gif" | "preview";
  options: CameraOpenOptions;
  /** True when feed-embedded camera should be slid into view */
  feedCameraSlideIn: boolean;
  openCamera: (opts?: CameraOpenOptions) => void;
  openGifPicker: (opts?: CameraOpenOptions) => void;
  closeCamera: () => void;
  requestClose: () => void;
  setView: (view: "camera" | "gif" | "preview") => void;
  setOptions: (opts: Partial<CameraOpenOptions>) => void;
};

const SurnaCameraContext = createContext<CameraContextValue | null>(null);

export function SurnaCameraProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [feedSlideReady, setFeedSlideReady] = useState(false);
  const [view, setView] = useState<"camera" | "gif" | "preview">("camera");
  const [options, setOptionsState] = useState<CameraOpenOptions>({});

  const isFeedSource = options.source === "feed";

  const openCamera = useCallback((opts: CameraOpenOptions = {}) => {
    setIsClosing(false);
    setOptionsState({
      ...opts,
      mode: normalizeCameraMode(opts.mode),
    });
    setView(opts.initialView === "gif" ? "gif" : "camera");
    setIsOpen(true);
    if (opts.source === "feed") {
      setFeedSlideReady(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFeedSlideReady(true));
      });
    } else {
      setFeedSlideReady(false);
    }
  }, []);

  const openGifPicker = useCallback((opts: CameraOpenOptions = {}) => {
    if (opts.source !== "messenger" && !opts.conversationId) {
      return;
    }
    setIsClosing(false);
    setOptionsState({ ...opts, source: "messenger" });
    setView("gif");
    setIsOpen(true);
    setFeedSlideReady(false);
  }, []);

  const finishClose = useCallback(() => {
    setIsOpen(false);
    setIsClosing(false);
    setFeedSlideReady(false);
    setView("camera");
    setOptionsState({});
  }, []);

  const closeCamera = useCallback(() => {
    finishClose();
  }, [finishClose]);

  const requestClose = useCallback(() => {
    if (options.source === "feed") {
      setIsClosing(true);
      setFeedSlideReady(false);
      window.setTimeout(finishClose, 220);
      return;
    }
    finishClose();
  }, [options.source, finishClose]);

  const setOptions = useCallback((patch: Partial<CameraOpenOptions>) => {
    setOptionsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const feedCameraSlideIn = isOpen && isFeedSource && feedSlideReady && !isClosing;

  const value = useMemo(
    () => ({
      isOpen,
      isClosing,
      view,
      options,
      feedCameraSlideIn,
      openCamera,
      openGifPicker,
      closeCamera,
      requestClose,
      setView,
      setOptions,
    }),
    [
      isOpen,
      isClosing,
      view,
      options,
      feedCameraSlideIn,
      openCamera,
      openGifPicker,
      closeCamera,
      requestClose,
    ],
  );

  return (
    <SurnaCameraContext.Provider value={value}>{children}</SurnaCameraContext.Provider>
  );
}

export function useSurnaCamera() {
  const ctx = useContext(SurnaCameraContext);
  if (!ctx) throw new Error("useSurnaCamera must be used within SurnaCameraProvider");
  return ctx;
}

export function useSurnaCameraOptional() {
  return useContext(SurnaCameraContext);
}
