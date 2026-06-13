import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Search, MessageSquare, Inbox, Megaphone, Users,
} from "lucide-react";
import { PageShell, Card, Button, EmptyState, ContextBar } from "./components/primitives";
import { useProRole } from "./components/useProRole";
import { useProTeam } from "./components/ProTeamContext";
import { apiRequest } from "@/lib/queryClient";

type DMRow = {
  id: string;
  last_message_at?: string;
  peer_display_name?: string;
  other_user_name?: string;
};
type GroupRow = { id: string; name?: string; description?: string };

function isTeamRelated(title: string, teamName: string) {
  const t = title.toLowerCase();
  const team = teamName.toLowerCase();
  if (team && t.includes(team)) return true;
  return (
    t.includes("team") ||
    t.includes("squad") ||
    t.includes("club") ||
    t.includes("match") ||
    t.includes("fixture") ||
    t.includes("gaa") ||
    t.includes("football") ||
    t.includes("soccer")
  );
}

export default function ProComms() {
  const { can } = useProRole();
  const { teamId, activeTeam, sportProfile } = useProTeam();
  const teamName = activeTeam?.name ?? "";
  const [q, setQ] = useState("");
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastBody, setBroadcastBody] = useState("");

  const { data: dmData } = useQuery({
    queryKey: ["/api/messenger/dm/conversations"],
    queryFn: async () => {
      const r = await fetch("/api/messenger/dm/conversations", { credentials: "include" });
      if (r.status === 401) return { conversations: [] as DMRow[] };
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const { data: groupsData } = useQuery({
    queryKey: ["/api/messenger/groups"],
    queryFn: async () => {
      const r = await fetch("/api/messenger/groups", { credentials: "include" });
      if (r.status === 401) return { groups: [] as GroupRow[] };
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const teamGroupId = useMemo(() => {
    const groups: GroupRow[] = groupsData?.groups ?? [];
    const lower = teamName.toLowerCase();
    const match =
      groups.find((g) => (g.name || "").toLowerCase().includes(lower)) ||
      groups.find((g) => (g.name || "").toLowerCase().includes("team"));
    return match?.id ?? null;
  }, [groupsData, teamName]);

  const threads = useMemo(() => {
    const dms: DMRow[] = dmData?.conversations ?? [];
    const groups: GroupRow[] = groupsData?.groups ?? [];
    const list: { id: string; title: string; kind: "dm" | "group"; href: string }[] = [];

    for (const g of groups) {
      const title = g.name || "Group";
      if (!isTeamRelated(title, teamName)) continue;
      list.push({ id: g.id, title, kind: "group", href: `/messages?groupId=${g.id}` });
    }
    for (const c of dms) {
      const title = c.peer_display_name || c.other_user_name || `DM ${c.id.slice(0, 8)}`;
      if (!isTeamRelated(title, teamName) && !c.peer_display_name && !c.other_user_name) continue;
      const peerId = (c as { other_user_id?: string }).other_user_id;
      list.push({
        id: c.id,
        title,
        kind: "dm",
        href: peerId ? `/messages?userId=${peerId}` : `/messages`,
      });
    }

    if (q.trim()) {
      const qq = q.toLowerCase();
      return list.filter((x) => x.title.toLowerCase().includes(qq));
    }
    return list;
  }, [dmData, groupsData, q, teamName]);

  const broadcast = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("No team");
      await apiRequest("POST", `/api/pro/team/${teamId}/squad-broadcast`, { message: broadcastBody });
    },
    onSuccess: () => {
      setBroadcastBody("");
      setBroadcastOpen(false);
    },
  });

  return (
    <PageShell
      title="Messages"
      subtitle={`${activeTeam?.name ?? "Team"} · ${sportProfile.displaySport} comms via SURNA messenger`}
      actions={
        <>
          {can("messages.announce") && teamId && (
            <Button variant="primary" leadingIcon={<Megaphone size={14} />} onClick={() => setBroadcastOpen(true)}>
              Team broadcast
            </Button>
          )}
          {teamGroupId && (
            <Button href={`/messages?groupId=${teamGroupId}`} variant="secondary">Open team group</Button>
          )}
          <Button href="/messages" variant="secondary">Open full messenger</Button>
        </>
      }
    >
      <ContextBar
        context={<><MessageSquare size={13} /><span>Team chats, formation cards, and squad broadcasts for {teamName || "your team"}.</span></>}
        actions={[
          { key: "broadcast", label: "Squad broadcast", icon: <Megaphone size={13} />, hidden: !can("messages.announce"), onClick: () => setBroadcastOpen(true) },
          { key: "matchday", label: "Match Day", icon: <Users size={13} />, href: "/pro/match-day", hidden: !sportProfile.supportsMatchDay },
        ]}
      />

      {broadcastOpen && (
        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Broadcast to squad</h3>
          <p className="pro-text-muted" style={{ fontSize: 13 }}>Sends a DM copy to each roster player on this team.</p>
          <textarea
            value={broadcastBody}
            onChange={(e) => setBroadcastBody(e.target.value)}
            rows={4}
            style={{ width: "100%", borderRadius: 8, padding: 10, marginTop: 8, fontFamily: "inherit" }}
            placeholder="Training moved to 18:00 — please confirm."
          />
          <div className="pro-row" style={{ gap: 8, marginTop: 10 }}>
            <Button variant="primary" disabled={!broadcastBody.trim() || broadcast.isPending} onClick={() => broadcast.mutate()}>
              Send
            </Button>
            <Button variant="ghost" onClick={() => setBroadcastOpen(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card padded={false}>
        <div style={{ padding: 12, borderBottom: "1px solid var(--pro-border)" }}>
          <div className="pro-topbar__search" style={{ height: 32 }}>
            <Search size={13} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter team chats…" />
          </div>
        </div>
        <div style={{ padding: 12 }}>
          {threads.length === 0 ? (
            <EmptyState
              icon={<Inbox size={20} />}
              title="No team threads matched"
              description={teamName
                ? `Create a messenger group with “${teamName}” in the name, or broadcast to the squad.`
                : "Start a group in messenger with “team” or “squad” in the name, or open full messenger."}
              action={<Button href="/messages" variant="primary">Open messenger</Button>}
            />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {threads.map((t) => (
                <li key={`${t.kind}-${t.id}`} style={{ borderBottom: "1px solid var(--pro-border-soft)" }}>
                  <Link href={t.href}>
                    <div className="pro-row" style={{ padding: "12px 4px", gap: 10, cursor: "pointer" }}>
                      <Users size={16} style={{ color: "var(--pro-text-muted)" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{t.title}</div>
                        <div className="pro-text-muted" style={{ fontSize: 12 }}>{t.kind === "group" ? "Group chat" : "Direct message"}</div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </PageShell>
  );
}
