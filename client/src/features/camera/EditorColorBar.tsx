import { EDITOR_COLORS, EDITOR_UI } from "./cameraTheme";

type Props = {
  value: string;
  onChange: (color: string) => void;
  className?: string;
};

/** One row of color swatches — same styling for text and draw tools. */
export default function EditorColorBar({ value, onChange }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        justifyContent: "center",
        padding: "8px 16px",
        background: EDITOR_UI.toolbarBg,
        borderRadius: 999,
        margin: "0 auto",
        width: "fit-content",
        maxWidth: "calc(100% - 32px)",
      }}
    >
      {EDITOR_COLORS.map((c) => {
        const selected = value === c.value;
        const isBlack = c.value === "#000000";
        return (
          <button
            key={c.value}
            type="button"
            aria-label={c.label}
            onClick={() => onChange(c.value)}
            style={{
              width: EDITOR_UI.swatchSize,
              height: EDITOR_UI.swatchSize,
              borderRadius: "50%",
              flexShrink: 0,
              background: c.value,
              border: selected ? EDITOR_UI.swatchRing : EDITOR_UI.swatchRingIdle,
              boxSizing: "border-box",
              cursor: "pointer",
              boxShadow: isBlack ? "inset 0 0 0 1px rgba(255,255,255,0.15)" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
