import type { ReactNode } from "react";

type ProfileSectionCardProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
};

export function ProfileSectionCard({ title, children, action }: ProfileSectionCardProps) {
  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: "linear-gradient(160deg, color-mix(in srgb, var(--spotify-red, #8b2635) 18%, var(--surna-bg-card)) 0%, var(--surna-bg-card) 100%)",
        border: "1px solid color-mix(in srgb, var(--spotify-red, #8b2635) 20%, var(--surna-border))",
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3
          className="text-[13px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--surna-text-secondary)" }}
        >
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}
