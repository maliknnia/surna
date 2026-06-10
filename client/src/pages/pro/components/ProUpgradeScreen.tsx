import { Link } from "wouter";
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
            className="pro-upgrade-hero-icon"
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              margin: "0 auto 14px",
              background: "linear-gradient(145deg, rgba(128, 63, 225, 0.95) 0%, rgba(93, 46, 176, 0.98) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 12px 40px rgba(128, 63, 225, 0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <Sparkles size={28} />
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, fontFamily: "var(--pro-font-display)", letterSpacing: "-0.03em" }}>SURNA Pro</h1>
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
              <Icon size={18} style={{ color: "var(--surna-pro)", flexShrink: 0 }} />
              <span style={{ color: "var(--pro-text)" }}>{text}</span>
            </li>
          ))}
        </ul>
        {needsLogin ? (
          <>
            <Button
              variant="primary"
              fullWidth
              onClick={() => { window.location.href = loginUrl; }}
            >
              Log in
            </Button>
            <p className="pro-text-muted" style={{ textAlign: "center", marginTop: 10, fontSize: 12 }}>
              Use Google, email, or phone at <strong>/login</strong>, then return to Pro.
            </p>
          </>
        ) : (
          <>
            <Link href="/subscribe">
              <Button variant="primary" fullWidth leadingIcon={<Sparkles size={16} />}>
                Subscribe
              </Button>
            </Link>
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
          <Link href="/help" className="underline">
            Visit Help
          </Link>{" "}
          or contact support from Settings.
        </p>
      </Card>
      </div>
    </div>
  );
}
