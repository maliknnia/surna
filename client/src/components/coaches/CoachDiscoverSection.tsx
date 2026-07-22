import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  children: ReactNode;
  textPrimary: string;
  textSecondary: string;
};

export default function CoachDiscoverSection({
  title,
  subtitle,
  onSeeAll,
  children,
  textPrimary,
  textSecondary,
}: Props) {
  return (
    <section className="mb-8">
      <div className="flex items-end justify-between px-4 mb-3.5">
        <div className="min-w-0">
          <h2
            className="text-[17px] font-semibold tracking-tight leading-tight"
            style={{ color: textPrimary }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="text-[12px] mt-0.5 truncate" style={{ color: textSecondary }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {onSeeAll ? (
          <button
            type="button"
            onClick={onSeeAll}
            className="flex items-center gap-0.5 text-[12px] font-medium shrink-0 ml-2 active:opacity-70"
            style={{ color: textSecondary }}
          >
            See all
            <ChevronRight size={14} />
          </button>
        ) : null}
      </div>
      <div className="flex gap-3.5 surna-h-scroll no-scrollbar px-4 pb-1">{children}</div>
    </section>
  );
}
