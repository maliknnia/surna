import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Search, X, MessageCircle, UserPlus, ChevronRight, MapPin, Users, Trophy, Zap } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { mapPath } from "@/lib/mapNavigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type FollowState = "follow" | "following" | "requested";

interface Person {
  id: string;
  name: string;
  username: string;
  avatar: string;
  avatarColor: string;
  sport: string;
  sportEmoji: string;
  role: "player" | "coach" | "organizer" | "fan";
  location: string;
  distance?: string;
  mutuals: number;
  reason: string;
  tags: string[];
  isNearby?: boolean;
  followState: FollowState;
}

interface FollowRequest {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatar: string;
  avatarColor: string;
  context: string;
  dismissed: boolean;
  confirmed: boolean;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_REQUESTS: FollowRequest[] = [
  { id: "r1", userId: "n1", name: "Alex Jordan", username: "alex_hoops", avatar: "AJ", avatarColor: "#000000", context: "2 mutuals · Basketball · Your city", dismissed: false, confirmed: false },
  { id: "r2", userId: "n2", name: "Maria Silva", username: "m_silva_run", avatar: "MS", avatarColor: "#FF2D55", context: "Same team network · Running", dismissed: false, confirmed: false },
  { id: "r3", userId: "s6", name: "Jake Torres", username: "jake_mma", avatar: "JT", avatarColor: "#FF9F0A", context: "1 mutual · MMA · 2 km away", dismissed: false, confirmed: false },
  { id: "r4", userId: "n3", name: "Sofia Chen", username: "sofia_tennis", avatar: "SC", avatarColor: "#30D158", context: "Joined same event · Tennis", dismissed: false, confirmed: false },
];

const DEMO_NEARBY: Person[] = [
  { id: "n1", name: "Sam Hooper", username: "sam_hoops", avatar: "SH", avatarColor: "#000000", sport: "Basketball", sportEmoji: "🏀", role: "player", location: "Cork", distance: "0.4 km", mutuals: 3, reason: "Nearby player", tags: ["Team player", "3v3"], isNearby: true, followState: "follow" },
  { id: "n2", name: "Rosa Díaz", username: "rosa_run", avatar: "RD", avatarColor: "#FF2D55", sport: "Running", sportEmoji: "🏃", role: "player", location: "Cork", distance: "0.9 km", mutuals: 1, reason: "Active nearby", tags: ["Marathon", "Trail"], isNearby: true, followState: "follow" },
  { id: "n3", name: "Will Park", username: "will_tennis", avatar: "WP", avatarColor: "#34C759", sport: "Tennis", sportEmoji: "🎾", role: "player", location: "Cork", distance: "1.1 km", mutuals: 0, reason: "Plays near you", tags: ["Doubles"], isNearby: true, followState: "follow" },
  { id: "n4", name: "Leila Musa", username: "leila_yoga", avatar: "LM", avatarColor: "#FF9F0A", sport: "Yoga", sportEmoji: "🧘", role: "coach", location: "Cork", distance: "1.4 km", mutuals: 2, reason: "Coach nearby", tags: ["Coach", "Vinyasa"], isNearby: true, followState: "following" },
  { id: "n5", name: "Mike Daly", username: "m_daly_fc", avatar: "MD", avatarColor: "#0A84FF", sport: "Soccer", sportEmoji: "⚽", role: "organizer", location: "Cork", distance: "1.8 km", mutuals: 5, reason: "5 mutuals", tags: ["Event organizer", "5v5"], isNearby: true, followState: "follow" },
];

const DEMO_SUGGESTED: Person[] = [
  { id: "s1", name: "Coach Rivera", username: "coach_riv", avatar: "CR", avatarColor: "#FFD700", sport: "Basketball", sportEmoji: "🏀", role: "coach", location: "Dublin", distance: "8 km", mutuals: 4, reason: "4 mutuals · Coach", tags: ["Coach", "Youth dev", "Pro"], followState: "follow" },
  { id: "s2", name: "Jenny Lee", username: "jenny_crossfit", avatar: "JL", avatarColor: "#FF453A", sport: "CrossFit", sportEmoji: "🏋️", role: "player", location: "Cork", distance: "2 km", mutuals: 2, reason: "Joined same event", tags: ["CrossFit", "Comp"], followState: "follow" },
  { id: "s3", name: "Tom Walsh", username: "t_walsh_bb", avatar: "TW", avatarColor: "#000000", sport: "Basketball", sportEmoji: "🏀", role: "player", location: "Cork", distance: "3 km", mutuals: 6, reason: "6 mutuals · Same sport", tags: ["Point guard", "League"], followState: "follow" },
  { id: "s4", name: "Ana Ferreira", username: "ana_swim", avatar: "AF", avatarColor: "#0A84FF", sport: "Swimming", sportEmoji: "🏊", role: "player", location: "Limerick", distance: "12 km", mutuals: 1, reason: "Teammate of a teammate", tags: ["Freestyle", "Triathlon"], followState: "requested" },
  { id: "s5", name: "Kyle Byrne", username: "k_byrne_soccer", avatar: "KB", avatarColor: "#30D158", sport: "Soccer", sportEmoji: "⚽", role: "player", location: "Cork", distance: "1.5 km", mutuals: 3, reason: "In your area · Soccer", tags: ["Striker", "5-a-side"], followState: "follow" },
  { id: "s6", name: "Priya Nair", username: "priya_mma", avatar: "PN", avatarColor: "#FF9F0A", sport: "MMA", sportEmoji: "🥊", role: "player", location: "Cork", distance: "2.5 km", mutuals: 0, reason: "Plays your sport", tags: ["Muay Thai", "Grappling"], followState: "follow" },
  { id: "s7", name: "Dylan Healy", username: "dylan_trail", avatar: "DH", avatarColor: "#000000", sport: "Running", sportEmoji: "🏃", role: "player", location: "Cork", distance: "4 km", mutuals: 2, reason: "Same event participant", tags: ["Trail", "Ultra"], followState: "follow" },
  { id: "s8", name: "Chloe Martin", username: "chloe_vball", avatar: "CM", avatarColor: "#FF2D55", sport: "Volleyball", sportEmoji: "🏐", role: "organizer", location: "Cork", distance: "3 km", mutuals: 4, reason: "4 mutuals · Event organizer", tags: ["Event organizer", "Beach"], followState: "following" },
  { id: "s9", name: "Finn O'Brien", username: "finn_rugby", avatar: "FO", avatarColor: "#636366", sport: "Rugby", sportEmoji: "🏉", role: "player", location: "Dublin", distance: "10 km", mutuals: 1, reason: "From Cork", tags: ["Flanker", "Club"], followState: "follow" },
  { id: "s10", name: "Zara King", username: "zara_gym", avatar: "ZK", avatarColor: "#FF453A", sport: "CrossFit", sportEmoji: "🏋️", role: "player", location: "Cork", distance: "0.8 km", mutuals: 7, reason: "7 mutuals · Very close", tags: ["Gym rat", "Open"], followState: "follow" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ initials, color, size = 44, imageUrl }: { initials: string; color: string; size?: number; imageUrl?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `${color}20`, border: `2px solid ${color}35`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.28, fontWeight: 700, color, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function FollowBtn({ state, onFollow, isDark }: { state: FollowState; onFollow: () => void; isDark: boolean }) {
  const styles: Record<FollowState, React.CSSProperties> = {
    follow: { background: "linear-gradient(135deg,#000000,#000000)", color: "#fff", border: "none" },
    following: { background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)", color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)", border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}` },
    requested: { background: isDark ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.15)", color: "#8B8AFF", border: "1px solid rgba(0,0,0,0.3)" },
  };
  const labels: Record<FollowState, string> = { follow: "Follow", following: "Following", requested: "Requested" };
  return (
    <button
      onClick={onFollow}
      style={{
        ...styles[state],
        padding: "7px 16px", borderRadius: 99,
        fontSize: 13, fontWeight: 700, cursor: "pointer",
        transition: "all 0.18s ease", whiteSpace: "nowrap",
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.96)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {labels[state]}
    </button>
  );
}

function SportTag({ emoji, label, isDark }: { emoji: string; label: string; isDark: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
      color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
    }}>
      {emoji} {label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DiscoverPeople() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [, navigate] = useLocation();

  const [requests, setRequests] = useState<FollowRequest[]>(DEMO_REQUESTS);
  const [nearby, setNearby] = useState<Person[]>(DEMO_NEARBY);
  const [suggested, setSuggested] = useState<Person[]>(DEMO_SUGGESTED);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  // Colors
  const pageBg = isDark ? "#000000" : "#f5f5f7";
  const headerBg = isDark ? "rgba(11,11,18,0.94)" : "rgba(245,245,247,0.94)";
  const textPrimary = isDark ? "#ffffff" : "#111111";
  const textSecondary = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";
  const cardBg = isDark ? "#121212" : "rgba(0,0,0,0.02)";
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const sectionLabel = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";

  // Helpers
  const activeRequests = requests.filter(r => !r.dismissed && !r.confirmed);
  const visibleRequests = showAllRequests ? activeRequests : activeRequests.slice(0, 2);

  const confirmRequest = useCallback((id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, confirmed: true } : r));
  }, []);

  const dismissRequest = useCallback((id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, dismissed: true } : r));
  }, []);

  const toggleFollow = useCallback((id: string, list: "nearby" | "suggested") => {
    const setter = list === "nearby" ? setNearby : setSuggested;
    setter(prev => prev.map(p => p.id !== id ? p : {
      ...p,
      followState: p.followState === "follow" ? "following"
        : p.followState === "following" ? "follow"
        : p.followState === "requested" ? "follow"
        : "follow",
    }));
  }, []);

  const removePerson = useCallback((id: string, list: "nearby" | "suggested") => {
    setRemovingIds(prev => new Set([...Array.from(prev), id]));
    setTimeout(() => {
      const setter = list === "nearby" ? setNearby : setSuggested;
      setter(prev => prev.filter(p => p.id !== id));
      setRemovingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }, 320);
  }, []);

  const filteredSuggested = suggested.filter(p =>
    !searchQuery ? true :
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sport.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const SectionHeader = ({ label, count, onSeeAll }: { label: string; count?: number; onSeeAll?: () => void }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 16px 10px" }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: sectionLabel }}>
        {label}{count !== undefined && ` (${count})`}
      </span>
      {onSeeAll && (
        <button onClick={onSeeAll} style={{ fontSize: 12, fontWeight: 700, color: "#8B8AFF", background: "none", border: "none", cursor: "pointer" }}>
          See all <ChevronRight size={12} style={{ display: "inline", verticalAlign: "middle" }} />
        </button>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: pageBg }}>
      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: headerBg, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${cardBorder}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
          <button
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate("/");
              }
            }}
            style={{ width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            aria-label="Go back"
          >
            <ArrowLeft size={18} style={{ color: textPrimary }} />
          </button>

          {showSearch ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)", borderRadius: 12, padding: "8px 12px" }}>
              <Search size={15} style={{ color: textSecondary, flexShrink: 0 }} />
              <input
                autoFocus
                type="text"
                placeholder="Search people, sports..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: textPrimary }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                  <X size={14} style={{ color: textSecondary }} />
                </button>
              )}
            </div>
          ) : (
            <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: textPrimary }}>Discover People</span>
          )}

          <button
            onClick={() => { setShowSearch(s => !s); setSearchQuery(""); }}
            style={{ width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", background: showSearch ? "rgba(0,0,0,0.15)" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            {showSearch ? <X size={17} style={{ color: "#8B8AFF" }} /> : <Search size={17} style={{ color: textPrimary }} />}
          </button>
        </div>
      </div>

      {/* ── Follow Requests ── */}
      {activeRequests.length > 0 && !searchQuery && (
        <section>
          <SectionHeader
            label="Follow Requests"
            count={activeRequests.length}
            onSeeAll={activeRequests.length > 2 ? () => setShowAllRequests(s => !s) : undefined}
          />
          <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            {visibleRequests.map(req => (
              <div
                key={req.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px",
                  background: cardBg, borderRadius: 16,
                  border: `1px solid ${cardBorder}`,
                  transition: "opacity 0.3s, transform 0.3s",
                  opacity: req.confirmed ? 0.5 : 1,
                }}
              >
                <div style={{ position: "relative", cursor: "pointer" }} onClick={() => navigate(`/person/${req.userId}`)}>
                  <Avatar initials={req.avatar} color={req.avatarColor} size={44} />
                  {req.confirmed && (
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(48,209,88,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 16 }}>✓</span>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => navigate(`/person/${req.userId}`)} className="cursor-pointer">
                  <p style={{ fontSize: 14, fontWeight: 700, color: textPrimary, margin: 0 }}>{req.name}</p>
                  <p style={{ fontSize: 12, color: textSecondary, margin: "2px 0 0" }}>@{req.username}</p>
                  <p style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", marginTop: 3 }}>{req.context}</p>
                </div>
                {!req.confirmed ? (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => confirmRequest(req.id)}
                      style={{ padding: "7px 14px", borderRadius: 99, background: "linear-gradient(135deg,#000000,#000000)", color: "#fff", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => dismissRequest(req.id)}
                      style={{ width: 32, height: 32, borderRadius: "50%", background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <X size={14} style={{ color: textSecondary }} />
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#30D158" }}>Accepted ✓</span>
                )}
              </div>
            ))}

            {activeRequests.length > 2 && !showAllRequests && (
              <button
                onClick={() => setShowAllRequests(true)}
                style={{ width: "100%", padding: "10px", borderRadius: 14, background: isDark ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.06)", border: `1px solid ${isDark ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.15)"}`, color: "#8B8AFF", fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 2 }}
              >
                See {activeRequests.length - 2} more request{activeRequests.length - 2 > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Nearby Players horizontal scroll ── */}
      {!searchQuery && (
        <section>
          <SectionHeader label="Nearby Players" />
          <div style={{ overflowX: "auto", scrollbarWidth: "none", display: "flex", gap: 10, padding: "0 16px 4px" }}>
            {nearby.map(person => (
              <div
                key={person.id}
                style={{
                  flexShrink: 0, width: 110,
                  background: cardBg, borderRadius: 18,
                  border: `1px solid ${cardBorder}`,
                  padding: "14px 10px 12px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  transition: "opacity 0.3s, transform 0.3s",
                  opacity: removingIds.has(person.id) ? 0 : 1,
                  transform: removingIds.has(person.id) ? "translateX(-30px)" : "none",
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/person/${person.id}`)}
              >
                <div style={{ position: "relative" }}>
                  <Avatar initials={person.avatar} color={person.avatarColor} size={52} />
                  <span style={{ position: "absolute", bottom: -2, right: -2, fontSize: 16, background: isDark ? "#000000" : "#f5f5f7", borderRadius: "50%", padding: 1 }}>
                    {person.sportEmoji}
                  </span>
                </div>
                <div style={{ textAlign: "center", width: "100%" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: textPrimary, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.name.split(" ")[0]}</p>
                  {person.distance && (
                    <p style={{ fontSize: 10, color: textSecondary, margin: "2px 0 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                      <MapPin size={9} /> {person.distance}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFollow(person.id, "nearby"); }}
                  style={{
                    width: "100%", padding: "6px 0", borderRadius: 99, fontSize: 11, fontWeight: 700,
                    background: person.followState === "follow" ? "linear-gradient(135deg,#000000,#000000)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
                    color: person.followState === "follow" ? "#fff" : textSecondary,
                    border: "none", cursor: "pointer", transition: "all 0.18s ease",
                  }}
                >
                  {person.followState === "follow" ? "Follow" : "Following"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Suggested People ── */}
      <section>
        <SectionHeader label={searchQuery ? `Results for "${searchQuery}"` : "Suggested for You"} count={filteredSuggested.length} />
        <div style={{ padding: "0 12px 100px", display: "flex", flexDirection: "column", gap: 4 }}>
          {filteredSuggested.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <span style={{ fontSize: 40 }}>🔍</span>
              <p style={{ fontSize: 15, fontWeight: 600, color: textPrimary, marginTop: 12 }}>No results found</p>
              <p style={{ fontSize: 13, color: textSecondary }}>Try a different name or sport</p>
            </div>
          )}

          {filteredSuggested.map(person => (
            <div
              key={person.id}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px",
                borderRadius: 16,
                transition: "opacity 0.32s cubic-bezier(0.4,0,0.2,1), transform 0.32s cubic-bezier(0.4,0,0.2,1), max-height 0.32s",
                opacity: removingIds.has(person.id) ? 0 : 1,
                transform: removingIds.has(person.id) ? "translateX(-24px)" : "none",
              }}
            >
              {/* Avatar */}
              <div style={{ cursor: "pointer" }} onClick={() => navigate(`/person/${person.id}`)}>
                <Avatar initials={person.avatar} color={person.avatarColor} size={48} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => navigate(`/person/${person.id}`)}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{person.name}</span>
                  {person.role === "coach" && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(255,214,0,0.15)", color: "#FFD700", borderRadius: 6, padding: "1px 6px", border: "1px solid rgba(255,214,0,0.25)" }}>COACH</span>
                  )}
                  {person.role === "organizer" && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(0,0,0,0.15)", color: "#8B8AFF", borderRadius: 6, padding: "1px 6px", border: "1px solid rgba(0,0,0,0.15)" }}>ORG</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: textSecondary, margin: "1px 0 5px" }}>
                  {person.sportEmoji} {person.reason}
                  {person.mutuals > 0 && ` · ${person.mutuals} mutual${person.mutuals > 1 ? "s" : ""}`}
                  {person.distance && ` · ${person.distance}`}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {person.tags.slice(0, 2).map(tag => (
                    <SportTag key={tag} emoji="" label={tag} isDark={isDark} />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <FollowBtn state={person.followState} onFollow={() => toggleFollow(person.id, "suggested")} isDark={isDark} />
                <button
                  onClick={() => removePerson(person.id, "suggested")}
                  style={{ width: 30, height: 30, borderRadius: "50%", border: "none", cursor: "pointer", background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  aria-label="Remove suggestion"
                >
                  <X size={13} style={{ color: textSecondary }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Empty state if all dismissed ── */}
      {filteredSuggested.length === 0 && !searchQuery && nearby.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <span style={{ fontSize: 48 }}>🌐</span>
          <p style={{ fontSize: 17, fontWeight: 700, color: textPrimary, marginTop: 16 }}>You're all caught up</p>
          <p style={{ fontSize: 13, color: textSecondary, marginTop: 6 }}>We'll keep finding great people for you</p>
          <button
            onClick={() => navigate(mapPath())}
            style={{ marginTop: 20, padding: "10px 24px", borderRadius: 99, background: "linear-gradient(135deg,#000000,#000000)", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}
          >
            Explore on Map
          </button>
        </div>
      )}
    </div>
  );
}
