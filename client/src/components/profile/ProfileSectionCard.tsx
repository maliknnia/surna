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
      style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
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
