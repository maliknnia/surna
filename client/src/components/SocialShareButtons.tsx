import { Button } from "@/components/ui/button";

export interface SocialShareData {
  title: string;
  description: string;
  url: string;
  hashtags?: string[];
}

interface SocialShareButtonsProps {
  shareData: SocialShareData;
  utmParams?: { source: string; medium: string; campaign: string };
  onShare?: (platform: string) => void;
}

function withUtm(url: string, utm?: SocialShareButtonsProps["utmParams"]): string {
  if (!utm) return url;
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set("utm_source", utm.source);
    u.searchParams.set("utm_medium", utm.medium);
    u.searchParams.set("utm_campaign", utm.campaign);
    return u.toString();
  } catch {
    return url;
  }
}

export function SocialShareButtons({ shareData, utmParams, onShare }: SocialShareButtonsProps) {
  const link = withUtm(shareData.url || window.location.href, utmParams);
  const text = encodeURIComponent(`${shareData.title} — ${shareData.description}`);
  const tags = (shareData.hashtags || []).map((t) => t.replace(/^#/, "")).join(",");

  const open = (platform: string, href: string) => {
    window.open(href, "_blank", "noopener,noreferrer");
    onShare?.(platform);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          open(
            "Twitter",
            `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(link)}${
              tags ? `&hashtags=${encodeURIComponent(tags)}` : ""
            }`
          )
        }
      >
        X / Twitter
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          open("Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`)
        }
      >
        Facebook
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          void navigator.clipboard.writeText(link);
          onShare?.("clipboard");
        }}
      >
        Copy link
      </Button>
      {typeof navigator !== "undefined" && navigator.share && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await navigator.share({ title: shareData.title, text: shareData.description, url: link });
              onShare?.("native");
            } catch {
              /* user cancelled */
            }
          }}
        >
          Share…
        </Button>
      )}
    </div>
  );
}
