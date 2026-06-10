import { ArrowLeft } from "lucide-react";

interface PanelBackButtonProps {
  onClick: () => void;
  background?: string;
  color?: string;
}

export function PanelBackButton({
  onClick,
  background = "rgba(255,255,255,0.08)",
  color = "#ffffff",
}: PanelBackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform"
      style={{ background }}
      aria-label="Go back"
    >
      <ArrowLeft size={18} style={{ color }} />
    </button>
  );
}
