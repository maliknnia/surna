import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import {
  CREATE_SECTIONS,
  getCreateOption,
  type CreateOptionId,
} from "@/lib/createHub";
import { saveCreateDraft } from "@/lib/createDraftStorage";
import {
  CreateMediaSection,
  type CreateMediaValue,
} from "@/components/create/CreateMediaSection";
import { cn } from "@/lib/utils";

const ALL_CREATE_TYPES = CREATE_SECTIONS.flatMap((s) => s.options);

type CreateHubComposerProps = {
  selectedType: CreateOptionId | null;
  onSelectedTypeChange: (type: CreateOptionId) => void;
  onContinue: (route: string) => void;
};

export function CreateHubComposer({
  selectedType,
  onSelectedTypeChange,
  onContinue,
}: CreateHubComposerProps) {
  const [cover, setCover] = useState<CreateMediaValue>(null);
  const [logo, setLogo] = useState<CreateMediaValue>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [title, setTitle] = useState("");

  const option = selectedType ? getCreateOption(selectedType) : undefined;
  const showLogo = selectedType === "team" || selectedType === "place";
  const showGallery = selectedType === "place" || selectedType === "event";

  useEffect(() => {
    if (!selectedType) return;
    if (selectedType !== "team" && selectedType !== "place") setLogo(null);
    if (selectedType !== "place" && selectedType !== "event") setGallery([]);
  }, [selectedType]);

  const handleContinue = () => {
    if (!option) return;
    saveCreateDraft({
      type: selectedType ?? undefined,
      title: title.trim() || undefined,
      cover,
      logo: showLogo ? logo : undefined,
      gallery: showGallery && gallery.length ? gallery : undefined,
    });
    onContinue(option.route);
  };

  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--surna-elevated)",
        border: "1px solid var(--surna-separator)",
      }}
      data-testid="create-hub-composer"
    >
      <div
        className="px-4 py-3 border-b flex items-center gap-2"
        style={{ borderColor: "var(--surna-separator)" }}
      >
        <ImagePlus size={18} style={{ color: "var(--surna-text)" }} />
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--surna-text)" }}>
            Start with photos
          </h2>
          <p className="text-xs" style={{ color: "var(--surna-text-secondary)" }}>
            Add images first — they carry into your event, team, or venue setup.
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <CreateMediaSection
          cover={cover}
          onCoverChange={setCover}
          logo={showLogo ? logo : undefined}
          onLogoChange={showLogo ? setLogo : undefined}
          gallery={showGallery ? gallery : undefined}
          onGalleryChange={showGallery ? setGallery : undefined}
          maxGallery={showGallery ? 6 : 0}
          coverLabel={
            selectedType === "team"
              ? "Team cover"
              : selectedType === "place"
                ? "Venue cover"
                : selectedType === "event"
                  ? "Event cover"
                  : selectedType === "pickup"
                    ? "Game cover"
                    : selectedType === "challenge"
                      ? "Challenge cover"
                      : "Cover photo"
          }
          coverHint="Shows on cards, map pins, and when people share what you create."
        />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--surna-text-secondary)" }}>
            What are you creating?
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_CREATE_TYPES.filter((t) => t.id !== "live").map((t) => {
              const Icon = t.icon;
              const active = selectedType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectedTypeChange(t.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]",
                    active && "ring-2 ring-offset-1",
                  )}
                  style={{
                    background: active ? "#000" : "var(--surna-base)",
                    color: active ? "#fff" : "var(--surna-text)",
                    border: active ? "none" : "1px solid var(--surna-separator)",
                  }}
                  data-testid={`create-type-${t.id}`}
                >
                  <Icon size={14} />
                  {t.title}
                </button>
              );
            })}
          </div>
        </div>

        {selectedType && selectedType !== "post" ? (
          <div className="space-y-1.5">
            <label
              htmlFor="create-hub-title"
              className="text-xs font-semibold"
              style={{ color: "var(--surna-text-secondary)" }}
            >
              Working title (optional)
            </label>
            <input
              id="create-hub-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                selectedType === "event"
                  ? "Saturday 5-a-side…"
                  : selectedType === "team"
                    ? "Thunder Hawks…"
                    : "Name or headline…"
              }
              className="w-full h-11 px-3 rounded-xl text-sm font-medium"
              style={{
                background: "var(--surna-base)",
                border: "1px solid var(--surna-separator)",
                color: "var(--surna-text)",
              }}
            />
          </div>
        ) : null}

        <button
          type="button"
          disabled={!selectedType}
          onClick={handleContinue}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-40 active:scale-[0.98] transition-transform"
          style={{ background: "#000" }}
          data-testid="create-hub-continue"
        >
          {option ? `Continue — ${option.title}` : "Pick a type to continue"}
        </button>
      </div>
    </section>
  );
}
