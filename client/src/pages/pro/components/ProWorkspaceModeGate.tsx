import { Link } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";
import type { ProWorkspaceMode } from "../lib/proWorkspaceMode";
import {
  proPlaceWorkspaceEntry,
  proShopWorkspaceEntry,
  proTeamWorkspaceEntry,
} from "../lib/proWorkspaceNav";
import { useProTeam } from "./ProTeamContext";
import { useProPlace } from "./ProPlaceContext";
import { useProShop } from "./ProShopContext";

const MODE_LABEL: Record<ProWorkspaceMode, string> = {
  team: "Team Pro",
  place: "Place Pro",
  shop: "Shop Pro",
};

type Props = {
  required: ProWorkspaceMode[];
  title?: string;
  description?: string;
};

export function ProWorkspaceModeGate({
  required,
  title = "Wrong workspace",
  description,
}: Props) {
  const { activeTeam } = useProTeam();
  const { activePlace } = useProPlace();
  const { activeShop } = useProShop();

  const target = required[0];
  const label = MODE_LABEL[target];
  const desc =
    description ??
    `This tool is part of ${label}. Switch workspace to continue, or open it from My Hub.`;

  const href =
    target === "team" && activeTeam
      ? proTeamWorkspaceEntry(activeTeam.id)
      : target === "place" && activePlace
        ? proPlaceWorkspaceEntry(activePlace.id)
        : target === "shop" && activeShop
          ? proShopWorkspaceEntry(activeShop.id)
          : target === "team"
            ? "/my-hub/teams"
            : target === "place"
              ? "/my-hub/places"
              : "/my-hub/shops";

  return (
    <div data-testid="pro-workspace-mode-gate" style={{ padding: "8px 0 24px" }}>
      <div
        style={{
          padding: "24px 20px",
          borderRadius: 16,
          background: "var(--pro-bg-elevated)",
          border: "0.5px solid var(--pro-border)",
          textAlign: "center",
        }}
      >
        <Sparkles size={22} style={{ color: "var(--pro-gold)", marginBottom: 12 }} />
        <h2 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "var(--pro-text)" }}>{title}</h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--pro-text-muted)", lineHeight: 1.5, maxWidth: 320, marginInline: "auto" }}>
          {desc}
        </p>
        <Link href={href}>
          <span
            className="pro-btn pro-btn--primary pro-btn--sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            data-testid="pro-mode-gate-cta"
          >
            Open {label}
            <ArrowRight size={14} />
          </span>
        </Link>
      </div>
    </div>
  );
}
