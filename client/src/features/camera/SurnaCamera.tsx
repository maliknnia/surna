import { createPortal } from "react-dom";
import "./SurnaCamera.css";
import { useSurnaCamera } from "./SurnaCameraContext";
import SurnaCameraContent from "./SurnaCameraContent";

export default function SurnaCamera() {
  const { isOpen, options } = useSurnaCamera();

  if (!isOpen) return null;

  const portalTarget = typeof document !== "undefined" ? document.body : null;
  const content = <SurnaCameraContent />;

  if (!portalTarget) return content;
  return createPortal(content, portalTarget);
}
