import { useRef, useEffect } from "react";
import { Plus, Send, Mic, Camera } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { getMessengerTheme } from "./messengerTheme";

export interface ChatComposerProps {
  message: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onPlus: () => void;
  onCamera?: () => void;
  onVoice?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isPending?: boolean;
  replyBar?: React.ReactNode;
  topBar?: React.ReactNode;
  linkPreview?: React.ReactNode;
}

export default function ChatComposer({
  message,
  onChange,
  onSend,
  onPlus,
  onCamera,
  onVoice,
  onKeyDown,
  onFocus,
  onBlur,
  placeholder = "Message",
  disabled = false,
  isPending = false,
  replyBar,
  topBar,
  linkPreview,
}: ChatComposerProps) {
  const { isDark } = useTheme();
  const t = getMessengerTheme(isDark);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const canSend = Boolean(message.trim()) && !disabled && !isPending;

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [message]);

  return (
    <div
      style={{
        background: t.inputBarBg,
        borderTop: `1px solid ${t.border}`,
        padding: "8px 12px",
        paddingBottom: "max(env(safe-area-inset-bottom), 10px)",
        flexShrink: 0,
      }}
    >
      {topBar}
      {replyBar}
      {linkPreview}

      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
        <button
          type="button"
          onClick={onPlus}
          disabled={disabled}
          aria-label="More actions"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: t.actionBg,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: disabled ? "default" : "pointer",
            flexShrink: 0,
            opacity: disabled ? 0.45 : 1,
          }}
          data-testid="button-plus"
        >
          <Plus size={18} color={t.iconMuted} strokeWidth={2.25} />
        </button>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "flex-end",
            gap: 4,
            padding: "6px 6px 6px 14px",
            borderRadius: 22,
            background: t.composerBg,
            border: `1px solid ${t.composerBorder}`,
          }}
        >
          <textarea
            ref={taRef}
            rows={1}
            value={message}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled || isPending}
            data-testid="input-message"
            style={{
              flex: 1,
              minWidth: 0,
              maxHeight: 120,
              resize: "none",
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: 15,
              lineHeight: 1.4,
              color: t.inputText,
              padding: "4px 0",
              fontFamily: "inherit",
            }}
          />
          {onCamera && (
            <button
              type="button"
              onClick={onCamera}
              disabled={disabled}
              aria-label="Camera"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "none",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: disabled ? "default" : "pointer",
                flexShrink: 0,
              }}
              data-testid="button-camera"
            >
              <Camera size={20} color={t.iconMuted} strokeWidth={2} />
            </button>
          )}
        </div>

        {canSend ? (
          <button
            type="button"
            onClick={onSend}
            disabled={isPending}
            aria-label="Send"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: t.sendBg,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
            data-testid="button-send"
          >
            <Send size={17} color={t.sendIcon} strokeWidth={2.25} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onVoice}
            disabled={disabled || !onVoice}
            aria-label="Voice message"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: t.actionBg,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: onVoice && !disabled ? "pointer" : "default",
              flexShrink: 0,
              opacity: onVoice && !disabled ? 1 : 0.45,
            }}
            data-testid="button-voice"
          >
            <Mic size={19} color={t.iconMuted} strokeWidth={2.25} />
          </button>
        )}
      </div>
    </div>
  );
}
