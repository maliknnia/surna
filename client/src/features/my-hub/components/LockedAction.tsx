import { useState } from "react";
import { Lock, Sparkles, ChevronRight, type LucideIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useProEntitlement, isProEntitlementActive } from "@/hooks/useProEntitlement";
import { proDeepLink, proEntryHref } from "@/lib/proFeatures";

interface Props {
  icon: LucideIcon;
  label: string;
  description?: string;
  featureKey?: string;
  fromSurface?: string;
  teamId?: string;
  placeId?: string;
  shopId?: string;
  testId?: string;
  onClick?: () => void;
}

export function LockedAction({
  icon: Icon,
  label,
  description,
  featureKey,
  fromSurface = "my-hub",
  teamId,
  placeId,
  shopId,
  testId,
  onClick,
}: Props) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { data: entitlement } = useProEntitlement();
  const isPro = isProEntitlementActive(entitlement);
  const ctx = { teamId, placeId, shopId };

  const proHref = isPro
    ? proDeepLink(featureKey, fromSurface, ctx)
    : proEntryHref(featureKey, fromSurface, ctx);

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (isPro) {
      setLocation(proHref);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all active:scale-[0.99]"
        style={{
          background: "var(--surna-bg-highlight)",
          border: isPro ? "1px solid var(--surna-border)" : "1px dashed var(--surna-border)",
          opacity: isPro ? 1 : 0.92,
        }}
        data-testid={testId}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--surna-elevated)" }}
        >
          <Icon className="w-4 h-4" style={{ color: "var(--surna-text-secondary)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[13px] font-semibold truncate"
              style={{ color: "var(--surna-text)" }}
            >
              {label}
            </span>
            {!isPro && (
              <Lock
                className="w-3 h-3 flex-shrink-0"
                style={{ color: "var(--surna-text-muted)" }}
              />
            )}
          </div>
          {description && (
            <p
              className="text-[11px] mt-0.5 line-clamp-1"
              style={{ color: "var(--surna-text-secondary)" }}
            >
              {description}
            </p>
          )}
        </div>
        {isPro ? (
          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--surna-text-muted)" }} />
        ) : (
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: "var(--surna-text)",
              color: "var(--surna-bg)",
            }}
          >
            Pro
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="rounded-2xl"
          style={{ background: "var(--surna-elevated)" }}
          data-testid={`${testId ?? "locked-action"}-dialog`}
        >
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "var(--surna-text)", color: "var(--surna-bg)" }}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <DialogTitle style={{ color: "var(--surna-text)" }}>
                {label}
              </DialogTitle>
            </div>
            <DialogDescription
              className="text-[13px]"
              style={{ color: "var(--surna-text-secondary)" }}
            >
              {description ??
                "This tool is part of SURNA Pro. Subscribe once to use it in My Hub and the Pro dashboard."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Not now
            </Button>
            <Link href="/subscribe" className="flex-1">
              <Button className="w-full" onClick={() => setOpen(false)}>
                View Pro plans
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
