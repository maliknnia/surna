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
    <section className="mb-9">
      <div className="flex items-end justify-between px-4 mb-4">
        <div className="min-w-0">
          <h2 className="text-[20px] font-bold tracking-tight leading-tight" style={{ color: textPrimary }}>
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
            className="flex items-center gap-0.5 text-[12px] font-semibold shrink-0 ml-2 active:opacity-70"
            style={{ color: textSecondary }}
          >
            See all
            <ChevronRight size={14} />
          </button>
        ) : null}
      </div>
      <div
        className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {children}
      </div>
    </section>
  );
}
