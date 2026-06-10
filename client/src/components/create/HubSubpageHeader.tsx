import { Link } from "wouter";
import { ArrowLeft, Plus } from "lucide-react";
import { ROUTES } from "@/navigation";
import { createHubPath, type CreateOptionId } from "@/lib/createHub";

type HubSubpageHeaderProps = {
  title: string;
  createType?: CreateOptionId;
  testId?: string;
};

export function HubSubpageHeader({ title, createType, testId }: HubSubpageHeaderProps) {
  const createHref = createType ? createHubPath(createType) : ROUTES.create;

  return (
    <div
      className="sticky top-0 z-40 glass-effect"
      style={{
        background: "var(--glass-bg, rgba(0,0,0,0.7))",
        borderBottom: "0.5px solid var(--surna-border)",
      }}
    >
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <Link href={ROUTES.create}>
          <button
            type="button"
            className="p-2 rounded-xl active:scale-95"
            data-testid="back-to-create-hub"
            aria-label="Back to hub"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
          </button>
        </Link>
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--surna-text)" }}
          data-testid={testId}
        >
          {title}
        </h1>
        <Link href={createHref}>
          <button
            type="button"
            className="p-2 rounded-xl active:scale-95"
            aria-label="Create new"
          >
            <Plus className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
          </button>
        </Link>
      </div>
    </div>
  );
}
