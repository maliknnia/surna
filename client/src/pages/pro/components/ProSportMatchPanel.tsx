import { useState } from "react";
import { ClipboardCheck, Shield, Users, Package, Send, BookOpen } from "lucide-react";
import { Card, Tag, Button } from "./primitives";
import ProSportHero from "./ProSportHero";
import type { SportProfile } from "../lib/proSport";

type SquadMember = {
  id: string;
  name: string;
  position: string;
  number?: number;
  status?: string;
};

type Props = {
  profile: SportProfile;
  squad: SquadMember[];
  canManage: boolean;
  onSendLineup?: () => void;
  sending?: boolean;
};

function isAvailable(status?: string) {
  const s = (status || "active").toLowerCase();
  return s === "active" || s === "available";
}

export default function ProSportMatchPanel({ profile, squad, canManage, onSendLineup, sending }: Props) {
  const available = squad.filter((p) => isAvailable(p.status));
  const positions = profile.positions;
  const slotCount = Math.max(profile.playersOnField, available.length, 1);
  const lineupSlots = positions.length > 0
    ? positions.slice(0, slotCount)
    : available.map((_, i) => `P${i + 1}`);

  const [checked, setChecked] = useState<Record<string, boolean>>(() => ({
    squad: available.length >= profile.squadMin,
    starters: available.length >= (profile.playersOnField || profile.squadMin),
    kit: false,
    rules: false,
  }));

  const checklist = [
    { key: "squad", label: `Squad ready (${profile.squadMin}–${profile.squadMax})`, ok: checked.squad },
    { key: "starters", label: `${profile.playersOnField || "Starting"} players selected`, ok: checked.starters },
    { key: "kit", label: "Kit & equipment packed", ok: checked.kit },
    { key: "rules", label: "Rules briefing complete", ok: checked.rules },
  ];

  const doneCount = checklist.filter((c) => c.ok).length;

  return (
    <div className="pro-col" style={{ gap: 16 }}>
      <ProSportHero
        profile={profile}
        links={[
          { label: "Training drills", href: "/pro/training" },
          { label: "Performance", href: "/pro/stats" },
        ]}
      />

      <div className="pro-grid" style={{ gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)", gap: 16 }}>
        <div className="pro-col" style={{ gap: 16 }}>
          <Card>
            <div className="pro-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <div className="pro-row" style={{ gap: 8 }}>
                <BookOpen size={16} />
                <h3 style={{ margin: 0 }}>Rules at a glance</h3>
              </div>
              <Tag tone="muted">{profile.periods}</Tag>
            </div>
            <ul className="pro-rules-list">
              {profile.rulesSummary.map((rule: string) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="pro-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Starting lineup</h3>
              <span className="pro-text-muted" style={{ fontSize: 12 }}>{profile.rosterHint}</span>
            </div>
            <div className="pro-lineup-grid">
              {lineupSlots.map((pos: string, i: number) => {
                const player = available[i];
                return (
                  <div
                    key={`${pos}-${i}`}
                    className={`pro-lineup-slot${player ? " pro-lineup-slot--filled" : ""}`}
                  >
                    <div className="pro-lineup-slot__pos">{pos}</div>
                    {player ? (
                      <div className="pro-lineup-slot__name">
                        {player.name}
                        {player.number != null ? ` #${player.number}` : ""}
                      </div>
                    ) : (
                      <div className="pro-lineup-slot__empty">Assign on roster</div>
                    )}
                  </div>
                );
              })}
            </div>
            {canManage && onSendLineup && (
              <Button
                variant="primary"
                size="sm"
                style={{ marginTop: 14 }}
                leadingIcon={<Send size={14} />}
                disabled={sending || available.length === 0}
                onClick={onSendLineup}
              >
                {sending ? "Sending…" : "Send lineup to team"}
              </Button>
            )}
          </Card>
        </div>

        <div className="pro-col" style={{ gap: 16 }}>
          <Card>
            <div className="pro-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <div className="pro-row" style={{ gap: 8 }}>
                <ClipboardCheck size={16} />
                <h3 style={{ margin: 0 }}>Match checklist</h3>
              </div>
              <Tag tone={doneCount === checklist.length ? "success" : "active"}>
                {doneCount}/{checklist.length}
              </Tag>
            </div>
            <div className="pro-checklist">
              {checklist.map((item) => (
                <label
                  key={item.key}
                  className={`pro-checklist__item${item.ok ? " pro-checklist__item--done" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={item.ok}
                    onChange={() => setChecked((prev) => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <div className="pro-row" style={{ gap: 8, marginBottom: 10 }}>
              <Package size={16} />
              <h3 style={{ margin: 0 }}>Kit & equipment</h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
              {profile.kitRequirements.map((k: string) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="pro-row" style={{ gap: 8, marginBottom: 10 }}>
              <Users size={16} />
              <h3 style={{ margin: 0 }}>Available squad</h3>
              <Tag tone="muted">{available.length}</Tag>
            </div>
            {available.length === 0 ? (
              <p className="pro-text-muted" style={{ fontSize: 13, margin: 0 }}>
                Mark players as available on the Roster page to build your lineup.
              </p>
            ) : (
              <div className="pro-col" style={{ gap: 6, maxHeight: 200, overflowY: "auto" }}>
                {available.map((p) => (
                  <div key={p.id} className="pro-row" style={{ justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--pro-border-soft)" }}>
                    <span style={{ fontWeight: 700 }}>{p.name}</span>
                    <span className="pro-text-muted">{p.position}{p.number != null ? ` · #${p.number}` : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="pro-row" style={{ gap: 8, marginBottom: 10 }}>
              <Shield size={16} />
              <h3 style={{ margin: 0 }}>Track on match day</h3>
            </div>
            <div className="pro-row" style={{ flexWrap: "wrap", gap: 6 }}>
              {profile.statLabels.map((label: string) => (
                <Tag key={label} tone="muted">{label}</Tag>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
