import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { ChevronRight, Clock, Sparkles, LayoutGrid } from "lucide-react";
import {
  CREATE_SECTIONS,
  getCreateOption,
  type CreateOption,
  type CreateOptionId,
} from "@/lib/createHub";
import { ROUTES } from "@/navigation";
import { useSurnaCameraOptional } from "@/features/camera";
import { cn } from "@/lib/utils";
import { HubManagePanel } from "@/components/create/HubManagePanel";
import { CreateHubComposer } from "@/components/create/CreateHubComposer";

function useCreateTypeParam(): CreateOptionId | null {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  if (!type) return null;
  return getCreateOption(type) ? (type as CreateOptionId) : null;
}

function OptionCard({
  option,
  highlighted,
  onSelect,
  onManage,
}: {
  option: CreateOption;
  highlighted: boolean;
  onSelect: (option: CreateOption) => void;
  onManage: (option: CreateOption) => void;
}) {
  const Icon = option.icon;
  const stepPreview = option.stepLabels.join(" → ");

  return (
    <div
      className={cn(
        "w-full rounded-3xl transition-all overflow-hidden",
        highlighted && "ring-2 ring-offset-2 ring-offset-[var(--surna-base)]",
      )}
      style={{
        background: "var(--surna-elevated)",
        border: highlighted ? "1px solid var(--surna-text)" : "1px solid var(--surna-separator)",
        boxShadow: highlighted ? "0 12px 40px rgba(0,0,0,0.08)" : "0 2px 12px rgba(0,0,0,0.04)",
      }}
    >
      <button
        type="button"
        data-create-id={option.id}
        onClick={() => onSelect(option)}
        className="w-full text-left p-4 active:scale-[0.99] transition-transform"
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "var(--surna-bg-highlight)", color: "var(--surna-text)" }}
          >
            <Icon size={22} strokeWidth={1.75} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold" style={{ color: "var(--surna-text)" }}>
                {option.title}
              </span>
              {option.badge ? (
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{ background: "var(--surna-bg-highlight)", color: "var(--surna-text-secondary)" }}
                >
                  {option.badge}
                </span>
              ) : null}
              <span
                className="text-[10px] font-medium flex items-center gap-1 ml-auto"
                style={{ color: "var(--surna-text-secondary)" }}
              >
                <Clock size={10} />
                {option.eta}
              </span>
            </div>
            <p className="text-sm mt-1" style={{ color: "var(--surna-text-secondary)" }}>
              {option.subtitle}
            </p>
            <p
              className="text-[11px] mt-2 font-medium truncate"
              style={{ color: "var(--surna-text-muted, var(--surna-text-secondary))" }}
            >
              {option.stepLabels.length} steps · {stepPreview}
            </p>
          </div>
          <ChevronRight size={18} className="shrink-0 mt-1" style={{ color: "var(--surna-text-secondary)" }} />
        </div>
      </button>
      <div
        className="px-4 pb-3 pt-0 flex justify-end border-t"
        style={{ borderColor: "var(--surna-separator)" }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onManage(option);
          }}
          className="text-[11px] font-semibold py-2 active:opacity-70"
          style={{ color: "var(--surna-text-secondary)" }}
        >
          {option.manageLabel} →
        </button>
      </div>
    </div>
  );
}

export default function CreateHub() {
  const [, navigate] = useLocation();
  const camera = useSurnaCameraOptional();
  const focusType = useCreateTypeParam();
  const focusRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [selectedType, setSelectedType] = useState<CreateOptionId | null>(focusType);
  const focusedOption = useMemo(
    () => (focusType ? getCreateOption(focusType) : undefined),
    [focusType],
  );

  useEffect(() => {
    if (focusType) setSelectedType(focusType);
  }, [focusType]);

  useEffect(() => {
    if (!focusType || !focusRef.current) return;
    const t = window.setTimeout(() => {
      focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [focusType]);

  const scrollToComposer = () => {
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelect = (option: CreateOption) => {
    if (option.id === "post") {
      if (camera) {
        camera.openCamera({ source: "feed", mode: "post" });
      } else {
        navigate(ROUTES.feed);
      }
      return;
    }
    setSelectedType(option.id);
    scrollToComposer();
  };

  const handleContinue = (route: string) => {
    navigate(route);
  };

  const handleManage = (option: CreateOption) => {
    navigate(option.manageRoute);
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--surna-base)" }}>
      <header
        className="sticky top-0 z-20 px-4 pt-4 pb-3 border-b"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px)",
          borderColor: "var(--surna-separator)",
        }}
      >
        <div className="max-w-lg mx-auto flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={18} style={{ color: "#000" }} />
              <h1 className="text-xl font-bold" style={{ color: "var(--surna-text)" }}>
                Create & Manage
              </h1>
            </div>
            <p className="text-sm" style={{ color: "var(--surna-text-secondary)" }}>
              Build something new or control what you already run.
            </p>
          </div>
          <Link href={ROUTES.myHub}>
            <button
              type="button"
              className="shrink-0 p-2 rounded-xl active:scale-95 transition-transform"
              style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-separator)" }}
              aria-label="Open My Hub"
            >
              <LayoutGrid size={18} style={{ color: "var(--surna-text)" }} />
            </button>
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-8">
        <div ref={composerRef}>
          <CreateHubComposer
            selectedType={selectedType}
            onSelectedTypeChange={setSelectedType}
            onContinue={handleContinue}
          />
        </div>

        <HubManagePanel compact />

        <div
          className="h-px"
          style={{ background: "var(--surna-separator)" }}
        />

        {CREATE_SECTIONS.map((section) => (
          <section key={section.id}>
            <div className="mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--surna-text)" }}>
                {section.title}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--surna-text-secondary)" }}>
                {section.subtitle}
              </p>
            </div>
            <div className="space-y-3">
              {section.options.map((option) => {
                const highlighted = focusType === option.id;
                return (
                  <div key={option.id} ref={highlighted ? focusRef : undefined}>
                    <OptionCard
                      option={option}
                      highlighted={highlighted}
                      onSelect={handleSelect}
                      onManage={handleManage}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {focusedOption ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 p-4 border-t"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "blur(20px)",
            borderColor: "var(--surna-separator)",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          <div className="max-w-lg mx-auto space-y-2">
            <button
              type="button"
              onClick={() => handleSelect(focusedOption)}
              className="w-full py-4 rounded-2xl text-[16px] font-bold active:scale-[0.98] transition-transform"
              style={{
                background: "var(--surna-text)",
                color: "var(--surna-base)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              }}
            >
              Continue · {focusedOption.title}
            </button>
            <button
              type="button"
              onClick={() => handleManage(focusedOption)}
              className="w-full py-2.5 rounded-2xl text-sm font-semibold active:scale-[0.98] transition-transform"
              style={{ color: "var(--surna-text-secondary)" }}
            >
              {focusedOption.manageLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
