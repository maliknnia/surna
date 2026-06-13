import { Sparkles, Users, Calendar, MessageSquare, BarChart3, Swords, Dumbbell, Trophy } from "lucide-react";
import { Button, Card } from "./primitives";
import { useProTeam } from "./ProTeamContext";
import "../pro-theme.css";
import "../pro-components.css";

function buildBullets(sportLabel: string, hasTactical: boolean) {
  return [
    { icon: Users, text: "Multi-team rosters, staff, and join approvals" },
    { icon: Calendar, text: `${sportLabel} schedule, training blocks, and attendance` },
    hasTactical
      ? { icon: Swords, text: "Match day: tactical board, formations, and squad broadcast" }
      : { icon: Swords, text: "Match day: sport rules, lineup prep, kit checklist" },
    { icon: Dumbbell, text: "Sport-specific drill library and session templates" },
    { icon: Trophy, text: "Tournaments with format rules for your sport" },
    { icon: MessageSquare, text: "Club comms tied to your messenger" },
    { icon: BarChart3, text: "Performance metrics tailored to your sport" },
  ];
}

export default function ProUpgradeScreen({ needsLogin }: { needsLogin?: boolean }) {
  const { sportProfile } = useProTeam();
  const sportLabel = sportProfile.displaySport || "your sport";
  const bullets = buildBullets(sportLabel, sportProfile.supportsTacticalBoard);
  const loginUrl = "/login?next=/pro";
  const devLoginUrl = "/api/login?dev=1&next=/pro";

  return (
    <div className="pro-app" style={{ minHeight: "100vh" }}>
      <div className="pro-cinematic-ambient" aria-hidden />
      <div className="pro-upgrade-center">
        <Card style={{ maxWidth: 480, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                margin: "0 auto 14px",
                background: "var(--pro-text)",
                color: "var(--pro-text-inverse)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={28} />
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em" }}>SURNA Pro</h1>
            <p className="pro-text-muted" style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
              {needsLogin
                ? "Sign in first, then open Pro again. Local dev: use Log in below."
                : (
                  <>
                    Your account is on the <strong>free</strong> plan. Upgrade for a full {sportLabel} club OS — {sportProfile.governingBody} rules, drills, match prep, and more.
                  </>
                )}
            </p>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {bullets.map(({ icon: Icon, text }) => (
              <li key={text} className="pro-row" style={{ gap: 10, fontSize: 14 }}>
                <Icon size={18} style={{ color: "var(--pro-text-muted)", flexShrink: 0 }} />
                <span style={{ color: "var(--pro-text)" }}>{text}</span>
              </li>
            ))}
          </ul>
          {needsLogin ? (
            <>
              <Button variant="primary" fullWidth onClick={() => { window.location.href = loginUrl; }}>
                Log in
              </Button>
              <p className="pro-text-muted" style={{ textAlign: "center", marginTop: 10, fontSize: 12 }}>
                Use Google, email, or phone at <strong>/login</strong>, then return to Pro.
              </p>
            </>
          ) : (
            <>
              <Button variant="primary" fullWidth leadingIcon={<Sparkles size={16} />} href="/subscribe">
                Subscribe
              </Button>
              {import.meta.env.DEV && (
                <Button
                  variant="secondary"
                  fullWidth
                  style={{ marginTop: 10 }}
                  onClick={() => { window.location.href = devLoginUrl; }}
                >
                  Dev login (free Pro)
                </Button>
              )}
            </>
          )}
          <p className="pro-text-muted" style={{ textAlign: "center", marginTop: 14, fontSize: 12 }}>
            Questions?{" "}
            <a href="/help" className="underline" style={{ color: "var(--pro-text-secondary)" }}>
              Visit Help
            </a>{" "}
            or contact support from Settings.
          </p>
        </Card>
      </div>
    </div>
  );
}
