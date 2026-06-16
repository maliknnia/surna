import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Share2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type EntityShareSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  path: string;
  shareText?: string;
};

export function EntityShareSheet({
  open,
  onClose,
  title,
  path,
  shareText = "Check this out on Surna",
}: EntityShareSheetProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const link = `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy link", variant: "destructive" });
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: link });
        onClose();
      } catch {
        /* user cancelled */
      }
      return;
    }
    void copyLink();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl p-5 pb-8 bg-background border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[17px] font-bold text-foreground">Share {title}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/40">
            <X size={16} />
          </button>
        </div>
        <p className="text-[13px] text-muted-foreground break-all mb-4">{link}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex-1 h-11 rounded-full bg-muted/40 text-[14px] font-semibold flex items-center justify-center gap-2"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={() => void nativeShare()}
            className="flex-1 h-11 rounded-full bg-foreground text-background text-[14px] font-semibold flex items-center justify-center gap-2"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
