import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Package, Plus, Search, Filter, Shirt, Dumbbell, Box, AlertTriangle,
  ArrowDownCircle, ArrowUpCircle, MoreHorizontal, Wrench,
} from "lucide-react";
import { PageShell, Card, Button, Tag, Tabs, StatCard, EmptyState, ContextBar } from "./components/primitives";
import { useProRole } from "./components/useProRole";
import { useProTeam } from "./components/ProTeamContext";

type ITab = "items" | "issued" | "movements";
type Condition = "new" | "good" | "fair" | "poor";

type Item = {
  id: string;
  name: string;
  category: "Kit" | "Training" | "Medical" | "Match" | "Other";
  quantity: number;
  threshold: number;
  condition: Condition;
  location: string;
};

type Issued = { id: string; item: string; player: string; issued: string; due: string; status: "active" | "overdue" | "returned" };
type Movement = { id: string; item: string; type: "in" | "out"; qty: number; by: string; date: string; note: string };

type ApiInventoryItem = {
  id: string;
  name: string;
  category?: string | null;
  quantity?: number | null;
  condition?: string | null;
};

function mapCategory(raw?: string | null): Item["category"] {
  const c = (raw || "").toLowerCase();
  if (c.includes("kit") || c.includes("shirt")) return "Kit";
  if (c.includes("train")) return "Training";
  if (c.includes("med") || c.includes("physio")) return "Medical";
  if (c.includes("match") || c.includes("ball")) return "Match";
  return "Other";
}

function mapCondition(raw?: string | null): Condition {
  const c = (raw || "good").toLowerCase();
  if (c === "new") return "new";
  if (c === "fair") return "fair";
  if (c === "poor") return "poor";
  return "good";
}

function mapApiItem(row: ApiInventoryItem): Item {
  const qty = row.quantity ?? 0;
  return {
    id: row.id,
    name: row.name,
    category: mapCategory(row.category),
    quantity: qty,
    threshold: Math.max(1, Math.ceil(qty * 0.6)),
    condition: mapCondition(row.condition),
    location: "Team storage",
  };
}

function CondTag({ c }: { c: Condition }) {
  if (c === "new")  return <Tag tone="success">New</Tag>;
  if (c === "good") return <Tag tone="muted">Good</Tag>;
  if (c === "fair") return <Tag tone="active">Fair</Tag>;
  return <Tag tone="danger">Poor</Tag>;
}
function CategoryIcon({ c }: { c: Item["category"] }) {
  if (c === "Kit")      return <Shirt size={14} />;
  if (c === "Training") return <Dumbbell size={14} />;
  if (c === "Medical")  return <Wrench size={14} />;
  if (c === "Match")    return <Package size={14} />;
  return <Box size={14} />;
}
function Stock({ qty, threshold }: { qty: number; threshold: number }) {
  const low = qty < threshold;
  return (
    <div className="pro-row" style={{ gap: 6 }}>
      <span style={{ fontWeight: 800, color: low ? "var(--pro-danger)" : "var(--pro-text)" }}>{qty}</span>
      {low && <Tag tone="danger"><AlertTriangle size={10} /> Low</Tag>}
    </div>
  );
}

export default function ProInventory() {
  const [tab, setTab] = useState<ITab>("items");
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<"all" | Item["category"]>("all");
  const { can } = useProRole();
  const { teamId, activeTeam, sportProfile } = useProTeam();
  const canManage = can("inventory.manage");

  const { data: apiItems = [], isLoading } = useQuery<ApiInventoryItem[]>({
    queryKey: ["/api/pro/team", teamId, "inventory"],
    enabled: !!teamId,
    queryFn: async () => {
      const r = await fetch(`/api/pro/team/${teamId}/inventory`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const items = useMemo(() => apiItems.map(mapApiItem), [apiItems]);
  const issued: Issued[] = [];
  const movements: Movement[] = [];

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (search.trim() && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, search, cat]);

  const lowStock = items.filter((i) => i.quantity < i.threshold);
  const totalValue = items.reduce((s, i) => s + i.quantity, 0);

  const RightPanel = (
    <>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Low stock alerts</h3>
        {lowStock.length === 0 ? (
          <p className="pro-text-muted" style={{ fontSize: "var(--pro-fs-sm)", margin: 0 }}>All stock levels healthy.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lowStock.map((i) => (
              <div key={i.id} className="pro-row" style={{ gap: 8, padding: 10, borderRadius: 10, border: "1px solid var(--pro-border)" }}>
                <AlertTriangle size={13} style={{ color: "var(--pro-danger)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "var(--pro-fs-sm)", fontWeight: 700 }}>{i.name}</div>
                  <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)" }}>{i.quantity} of {i.threshold} required</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Suggested for {sportProfile.displaySport}</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--pro-text-muted)" }}>
          {sportProfile.kitHints.map((hint: string) => (
            <li key={hint} style={{ marginBottom: 4 }}>{hint}</li>
          ))}
        </ul>
      </Card>
    </>
  );

  return (
    <PageShell
      title="Inventory"
      subtitle={`${activeTeam?.name ?? "Team"} · ${sportProfile.displaySport} kit & equipment`}
      actions={
        <>
          <Button variant="secondary" leadingIcon={<Filter size={14} />}>Filters</Button>
          {canManage && <Button variant="primary" leadingIcon={<Plus size={14} />}>New item</Button>}
        </>
      }
      rightPanel={RightPanel}
    >
      <ContextBar
        context={canManage
          ? <>Track every kit, ball and cone. Record stock movements, issue gear to players and act on low-stock alerts before match day.</>
          : <>Inventory overview. Managers and admins record movements and issue gear.</>}
        actions={[
          { key: "movements", label: "Movements log", icon: <Package size={12} />, onClick: () => setTab("movements") },
        ]}
      />
      {isLoading ? (
        <Card><div className="animate-pulse" style={{ height: 120, borderRadius: 8, background: "var(--pro-surface-2)" }} /></Card>
      ) : (
      <>
      <div className="pro-grid pro-grid-4" style={{ gap: 12 }}>
        <StatCard label="Items"        value={items.length} icon={<Package size={12} />} />
        <StatCard label="Total units"  value={totalValue}   icon={<Box size={12} />} />
        <StatCard label="Low stock"    value={lowStock.length} delta={lowStock.length > 0 ? { value: "Action needed", direction: "down" } : undefined} icon={<AlertTriangle size={12} />} />
        <StatCard label="Issued"       value={issued.filter(i => i.status === "active" || i.status === "overdue").length} icon={<Shirt size={12} />} />
      </div>

      <Tabs<ITab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "items",     label: "Items",     icon: <Package size={13} />, count: items.length },
          { key: "issued",    label: "Issued",    icon: <Shirt size={13} />,   count: issued.length },
          { key: "movements", label: "Movements", icon: <ArrowDownCircle size={13} />, count: movements.length },
        ]}
      />

      {tab === "items" && (
        <Card padded={false}>
          <div className="pro-row" style={{ padding: "12px 14px", borderBottom: "1px solid var(--pro-border)", gap: 8 }}>
            <div className="pro-topbar__search" style={{ height: 32, maxWidth: 280, flex: 1 }}>
              <Search size={13} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" />
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {(["all", "Kit", "Training", "Match", "Medical", "Other"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setCat(k)}
                  data-testid={`cat-${k}`}
                  style={{
                    padding: "5px 10px", borderRadius: 99,
                    fontSize: 11, fontWeight: 700,
                    background: cat === k ? "var(--pro-active)" : "transparent",
                    color: cat === k ? "var(--pro-active-text)" : "var(--pro-text-muted)",
                    border: cat === k ? "1px solid var(--pro-active)" : "1px solid var(--pro-border)",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >{k}</button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Package size={18} />}
              title={items.length === 0 ? "No inventory yet" : "No items match"}
              description={items.length === 0 ? `Add ${sportProfile.kitHints[0] ?? "kit"} and other gear for ${activeTeam?.name ?? "your team"}.` : "Try a different search or filter."}
            />
          ) : (
            <table className="pro-table">
              <thead><tr><th>Item</th><th>Category</th><th>Stock</th><th>Threshold</th><th>Condition</th><th>Location</th><th style={{ width: 120 }}>Actions</th></tr></thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} data-testid={`item-${i.id}`}>
                    <td>
                      <div className="pro-row" style={{ gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--pro-surface-3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <CategoryIcon c={i.category} />
                        </div>
                        <span style={{ fontWeight: 700 }}>{i.name}</span>
                      </div>
                    </td>
                    <td><Tag tone="muted">{i.category}</Tag></td>
                    <td><Stock qty={i.quantity} threshold={i.threshold} /></td>
                    <td className="pro-text-muted">{i.threshold}</td>
                    <td><CondTag c={i.condition} /></td>
                    <td className="pro-text-muted">{i.location}</td>
                    <td>
                      <div className="pro-row" style={{ gap: 4 }}>
                        <Button variant="ghost" size="sm">Issue</Button>
                        <button className="pro-icon-btn" aria-label="More" style={{ width: 28, height: 28 }}><MoreHorizontal size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === "issued" && (
        <Card padded={false}>
          {issued.length === 0 ? (
            <EmptyState icon={<Shirt size={18} />} title="Nothing issued yet" description="Issued gear tracking will appear here once items are assigned to players." />
          ) : (
          <table className="pro-table">
            <thead><tr><th>Item</th><th>Player</th><th>Issued</th><th>Due back</th><th>Status</th><th style={{ width: 120 }}>Actions</th></tr></thead>
            <tbody>
              {issued.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>{u.item}</td>
                  <td>{u.player}</td>
                  <td className="pro-text-muted">{u.issued}</td>
                  <td className="pro-text-muted">{u.due}</td>
                  <td>
                    <Tag tone={u.status === "overdue" ? "danger" : u.status === "returned" ? "muted" : "active"}>{u.status}</Tag>
                  </td>
                  <td>
                    <Button variant="ghost" size="sm">Mark returned</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </Card>
      )}

      {tab === "movements" && (
        <Card padded={false}>
          {movements.length === 0 ? (
            <EmptyState icon={<ArrowDownCircle size={18} />} title="No movements logged" description="Stock in/out history appears when inventory changes are recorded." />
          ) : (
          <table className="pro-table">
            <thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Qty</th><th>By</th><th>Note</th></tr></thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="pro-text-muted">{m.date}</td>
                  <td style={{ fontWeight: 700 }}>{m.item}</td>
                  <td>
                    <div className="pro-row" style={{ gap: 6 }}>
                      {m.type === "in" ? <ArrowDownCircle size={13} /> : <ArrowUpCircle size={13} />}
                      <Tag tone={m.type === "in" ? "success" : "muted"}>{m.type === "in" ? "Stock in" : "Stock out"}</Tag>
                    </div>
                  </td>
                  <td style={{ fontWeight: 800 }}>{m.qty}</td>
                  <td className="pro-text-muted">{m.by}</td>
                  <td className="pro-text-muted">{m.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </Card>
      )}
      </>
      )}
    </PageShell>
  );
}
