import { SPORT_TAGS } from "@/features/camera/constants";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_CHARS = 2000;

type Props = {
  content: string;
  sport: string;
  location: string;
  onContentChange: (value: string) => void;
  onSportChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  contentId?: string;
};

export function PostComposeFields({
  content,
  sport,
  location,
  onContentChange,
  onSportChange,
  onLocationChange,
  contentId = "post-compose-content",
}: Props) {
  const remaining = MAX_CHARS - content.length;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={contentId} style={{ color: "var(--surna-text)" }}>
          Caption
        </Label>
        <Textarea
          id={contentId}
          rows={5}
          value={content}
          onChange={(e) => onContentChange(e.target.value.slice(0, MAX_CHARS))}
          placeholder="What's happening in sport today?"
          className="resize-none rounded-2xl border-[var(--surna-border)] bg-[var(--surna-surface)]"
          style={{ color: "var(--surna-text)" }}
          data-testid="post-compose-content"
        />
        <p
          className="text-[11px] text-right"
          style={{ color: remaining < 80 ? "var(--surna-danger, #ef4444)" : "var(--surna-text-muted)" }}
        >
          {remaining} characters left
        </p>
      </div>

      <div className="space-y-2">
        <Label style={{ color: "var(--surna-text)" }}>Sport</Label>
        <div className="flex flex-wrap gap-2">
          {SPORT_TAGS.map((tag) => {
            const active = sport === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onSportChange(active ? "" : tag)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  background: active ? "var(--surna-accent)" : "var(--surna-surface)",
                  color: active ? "#fff" : "var(--surna-text-muted)",
                  border: `1px solid ${active ? "transparent" : "var(--surna-border)"}`,
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="post-compose-location" style={{ color: "var(--surna-text)" }}>
          Location <span className="font-normal text-[var(--surna-text-muted)]">(optional)</span>
        </Label>
        <Input
          id="post-compose-location"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder="Add a place or city"
          className="rounded-xl border-[var(--surna-border)] bg-[var(--surna-surface)]"
          style={{ color: "var(--surna-text)" }}
          data-testid="post-compose-location"
        />
      </div>
    </div>
  );
}
