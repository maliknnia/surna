import { useState } from "react";
import {
  User, Building2, Lock, Bell, CreditCard, Users, Plug, Shield,
  ChevronRight, Save, Upload, Globe, Eye, EyeOff, Smartphone, Mail,
} from "lucide-react";
import { PageShell, Card, Button, Tag, EmptyState, ContextBar } from "./components/primitives";
import { useProRole, ROLE_LABELS } from "./components/useProRole";

type Section = "profile" | "organization" | "branding" | "permissions" | "notifications" | "billing" | "integrations" | "security";

const sections: { key: Section; label: string; icon: typeof User; description: string }[] = [
  { key: "profile",       label: "Profile",        icon: User,        description: "Your personal account" },
  { key: "organization",  label: "Organization",   icon: Building2,   description: "Club, location, public page" },
  { key: "branding",      label: "Branding",       icon: Upload,      description: "Logo, colors, public link" },
  { key: "permissions",   label: "Roles & access", icon: Users,       description: "Admins, coaches, captains" },
  { key: "notifications", label: "Notifications",  icon: Bell,        description: "Email, push, digest" },
  { key: "billing",       label: "Billing",        icon: CreditCard,  description: "Plan, payments, invoices" },
  { key: "integrations",  label: "Integrations",   icon: Plug,        description: "Stripe, calendars, SSO" },
  { key: "security",      label: "Security",       icon: Lock,        description: "Password, 2FA, sessions" },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: "var(--pro-fs-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--pro-text-subtle)" }}>{label}</label>
      {children}
      {hint && <span className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)" }}>{hint}</span>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid var(--pro-border-strong)",
  background: "var(--pro-surface)",
  color: "var(--pro-text)",
  fontSize: "var(--pro-fs-sm)",
  fontWeight: 500,
  outline: 0,
  fontFamily: "inherit",
};

function Toggle({ on, onChange, label, description }: { on: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="pro-row" style={{ gap: 12, padding: "10px 0", borderBottom: "1px solid var(--pro-border-soft)" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "var(--pro-fs-sm)", fontWeight: 700 }}>{label}</div>
        {description && <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)", marginTop: 2 }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!on)}
        aria-pressed={on}
        data-testid={`toggle-${label.toLowerCase().replace(/\s+/g, "-")}`}
        style={{
          width: 40, height: 22, borderRadius: 99,
          background: on ? "var(--pro-active)" : "var(--pro-surface-3)",
          border: 0, position: "relative", cursor: "pointer",
          transition: "background 120ms ease",
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: on ? 20 : 2,
          width: 18, height: 18, borderRadius: 99,
          background: "var(--pro-surface)",
          boxShadow: "var(--pro-shadow-sm)",
          transition: "left 160ms ease",
        }} />
      </button>
    </div>
  );
}

function Sidebar({ active, onSelect, gated }: { active: Section; onSelect: (s: Section) => void; gated: Record<Section, boolean> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {sections.filter((s) => gated[s.key]).map((s) => {
        const Icon = s.icon;
        const isActive = active === s.key;
        return (
          <button
            key={s.key}
            onClick={() => onSelect(s.key)}
            data-testid={`settings-section-${s.key}`}
            className="pro-row"
            style={{
              gap: 10, padding: "10px 12px", borderRadius: 10,
              background: isActive ? "var(--pro-active)" : "transparent",
              color: isActive ? "var(--pro-active-text)" : "var(--pro-text)",
              border: 0, cursor: "pointer", fontFamily: "inherit",
              transition: "background 120ms ease",
              textAlign: "left", width: "100%",
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--pro-hover)"; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
          >
            <Icon size={15} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "var(--pro-fs-sm)", fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.65 }}>{s.description}</div>
            </div>
            <ChevronRight size={13} style={{ opacity: 0.5 }} />
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Section content ---------- */
function ProfileSection() {
  return (
    <Card>
      <h3 style={{ margin: 0, marginBottom: 16 }}>Personal profile</h3>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "start" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 96, height: 96, borderRadius: 99,
            background: "var(--pro-active)", color: "var(--pro-active-text)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 36, margin: "0 auto 10px",
          }}>L</div>
          <Button variant="secondary" size="sm" leadingIcon={<Upload size={12} />}>Change</Button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="First name"><input style={inputStyle} defaultValue="Lia" data-testid="input-firstname" /></Field>
          <Field label="Last name"><input style={inputStyle} defaultValue="Bennett" data-testid="input-lastname" /></Field>
          <Field label="Email"><input style={inputStyle} defaultValue="lia@northwood.club" data-testid="input-email" /></Field>
          <Field label="Phone"><input style={inputStyle} defaultValue="+44 7700 900123" data-testid="input-phone" /></Field>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Bio" hint="Shown on your public profile">
              <textarea rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} defaultValue="Head of football at Northwood Sports Club. UEFA B." data-testid="input-bio" />
            </Field>
          </div>
        </div>
      </div>
      <div className="pro-row" style={{ gap: 8, justifyContent: "flex-end", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--pro-border-soft)" }}>
        <Button variant="ghost">Cancel</Button>
        <Button variant="primary" leadingIcon={<Save size={13} />}>Save changes</Button>
      </div>
    </Card>
  );
}

function OrganizationSection() {
  return (
    <Card>
      <h3 style={{ margin: 0, marginBottom: 16 }}>Organization</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Club name"><input style={inputStyle} defaultValue="Northwood Sports Club" /></Field>
        <Field label="Public handle" hint="surna.app/c/northwood">
          <input style={inputStyle} defaultValue="northwood" />
        </Field>
        <Field label="Location"><input style={inputStyle} defaultValue="Manchester, UK" /></Field>
        <Field label="Founded"><input style={inputStyle} defaultValue="2014" /></Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Description">
            <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} defaultValue="Multi-team grassroots club with senior, women's and academy pathways." />
          </Field>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <Toggle on={true}  onChange={() => {}} label="Public organization page" description="Allow your club page to be discovered in SURNA search." />
        <Toggle on={true}  onChange={() => {}} label="Accept join requests" description="Members can request to join from the public page." />
        <Toggle on={false} onChange={() => {}} label="Require admin approval for posts" description="All member posts go through moderation first." />
      </div>
      <div className="pro-row" style={{ gap: 8, justifyContent: "flex-end", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--pro-border-soft)" }}>
        <Button variant="ghost">Cancel</Button>
        <Button variant="primary" leadingIcon={<Save size={13} />}>Save changes</Button>
      </div>
    </Card>
  );
}

function BrandingSection() {
  return (
    <>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 16 }}>Brand identity</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <Field label="Club logo" hint="PNG or SVG, 512×512 minimum">
            <div className="pro-row" style={{ gap: 12 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 14,
                background: "var(--pro-active)", color: "var(--pro-active-text)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 30,
              }}>N</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Button variant="secondary" size="sm" leadingIcon={<Upload size={12} />}>Upload logo</Button>
                <Button variant="ghost" size="sm">Remove</Button>
              </div>
            </div>
          </Field>
          <Field label="Cover image" hint="1600×400, JPG or PNG">
            <div style={{
              height: 72, borderRadius: 12,
              background: "linear-gradient(135deg, var(--pro-surface-3), var(--pro-surface-2))",
              border: "1px dashed var(--pro-border-strong)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--pro-text-subtle)", fontSize: 11, fontWeight: 700,
            }}>Drop image or click to upload</div>
          </Field>
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: 0, marginBottom: 12 }}>Public link</h3>
        <Field label="SURNA URL">
          <div className="pro-row" style={{ gap: 0, border: "1px solid var(--pro-border-strong)", borderRadius: 10, overflow: "hidden" }}>
            <span style={{ padding: "9px 12px", background: "var(--pro-surface-2)", color: "var(--pro-text-muted)", fontSize: "var(--pro-fs-sm)", fontWeight: 600, borderRight: "1px solid var(--pro-border-strong)" }}>surna.app/c/</span>
            <input style={{ ...inputStyle, border: 0, borderRadius: 0, flex: 1 }} defaultValue="northwood" />
            <Button variant="ghost" size="sm" trailingIcon={<Globe size={12} />}>Visit</Button>
          </div>
        </Field>
      </Card>
    </>
  );
}

function PermissionsSection() {
  const roles = [
    { key: "owner",    label: "Owner",    members: 1,  desc: "Full access including billing and ownership transfer" },
    { key: "admin",    label: "Admin",    members: 3,  desc: "Manage teams, settings and members" },
    { key: "manager",  label: "Manager",  members: 5,  desc: "Manage assigned teams and events" },
    { key: "coach",    label: "Coach",    members: 8,  desc: "Train, message and view roster" },
    { key: "captain",  label: "Captain",  members: 6,  desc: "Coordinate squad and approve members" },
    { key: "member",   label: "Member",   members: 225,desc: "Default member access" },
  ];
  return (
    <Card padded={false}>
      <div className="pro-row" style={{ padding: "14px 18px", justifyContent: "space-between", borderBottom: "1px solid var(--pro-border)" }}>
        <div>
          <h3 style={{ margin: 0 }}>Roles & access</h3>
          <p className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)", marginTop: 2 }}>Define what each role can do across the org</p>
        </div>
        <Button variant="primary" size="sm" leadingIcon={<Shield size={13} />}>New role</Button>
      </div>
      {roles.map((r, i) => (
        <div key={r.key} className="pro-row" style={{
          padding: "12px 18px", gap: 12,
          borderTop: i === 0 ? 0 : "1px solid var(--pro-border-soft)",
        }}>
          <div style={{ flex: 1 }}>
            <div className="pro-row" style={{ gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: "var(--pro-fs-sm)" }}>{r.label}</span>
              <Tag tone="muted">{r.members} {r.members === 1 ? "person" : "people"}</Tag>
            </div>
            <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)", marginTop: 2 }}>{r.desc}</div>
          </div>
          <Button variant="ghost" size="sm" trailingIcon={<ChevronRight size={12} />}>Edit</Button>
        </div>
      ))}
    </Card>
  );
}

function NotificationsSection() {
  const [email, setEmail] = useState({ digest: true, mentions: true, billing: true, marketing: false });
  const [push,  setPush]  = useState({ messages: true, events: true, mentions: true, marketing: false });
  return (
    <>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 8 }} className="pro-row" ><Mail size={15} /> &nbsp; Email</h3>
        <Toggle on={email.digest}    onChange={(v) => setEmail({ ...email, digest: v })}    label="Weekly digest"        description="Summary of activity every Monday" />
        <Toggle on={email.mentions}  onChange={(v) => setEmail({ ...email, mentions: v })}  label="Mentions and replies" description="When someone tags you or replies to your posts" />
        <Toggle on={email.billing}   onChange={(v) => setEmail({ ...email, billing: v })}   label="Billing & receipts"   description="Invoices, renewals and payment failures" />
        <Toggle on={email.marketing} onChange={(v) => setEmail({ ...email, marketing: v })} label="Product updates"      description="Occasional news about new features" />
      </Card>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 8 }} className="pro-row"><Smartphone size={15} /> &nbsp; Push</h3>
        <Toggle on={push.messages}  onChange={(v) => setPush({ ...push, messages: v })}  label="Messages" />
        <Toggle on={push.events}    onChange={(v) => setPush({ ...push, events: v })}    label="Event RSVPs and reminders" />
        <Toggle on={push.mentions}  onChange={(v) => setPush({ ...push, mentions: v })}  label="Mentions and replies" />
        <Toggle on={push.marketing} onChange={(v) => setPush({ ...push, marketing: v })} label="Promotions" />
      </Card>
    </>
  );
}

function BillingSection() {
  return (
    <>
      <Card>
        <div className="pro-row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0 }}>Current plan</h3>
            <p className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)", marginTop: 2 }}>Renews on 15 May 2026</p>
          </div>
          <Tag tone="active">Pro · Team</Tag>
        </div>
        <div className="pro-grid pro-grid-3" style={{ gap: 12 }}>
          <div style={{ padding: 14, borderRadius: 12, border: "1px solid var(--pro-border)" }}>
            <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)", fontWeight: 700 }}>MONTHLY COST</div>
            <div style={{ fontSize: "var(--pro-fs-h2)", fontWeight: 800, marginTop: 4 }}>£24</div>
          </div>
          <div style={{ padding: 14, borderRadius: 12, border: "1px solid var(--pro-border)" }}>
            <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)", fontWeight: 700 }}>SEATS USED</div>
            <div style={{ fontSize: "var(--pro-fs-h2)", fontWeight: 800, marginTop: 4 }}>8 / 10</div>
          </div>
          <div style={{ padding: 14, borderRadius: 12, border: "1px solid var(--pro-border)" }}>
            <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)", fontWeight: 700 }}>NEXT INVOICE</div>
            <div style={{ fontSize: "var(--pro-fs-h2)", fontWeight: 800, marginTop: 4 }}>£24</div>
          </div>
        </div>
        <div className="pro-row" style={{ gap: 8, justifyContent: "flex-end", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--pro-border-soft)" }}>
          <Button variant="ghost">Cancel plan</Button>
          <Button variant="secondary">Change plan</Button>
          <Button variant="primary" leadingIcon={<CreditCard size={13} />}>Update payment method</Button>
        </div>
      </Card>

      <Card padded={false}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--pro-border)" }}>
          <h3 style={{ margin: 0 }}>Recent invoices</h3>
        </div>
        <table className="pro-table">
          <thead><tr><th>Date</th><th>Amount</th><th>Status</th><th style={{ width: 100 }}>Receipt</th></tr></thead>
          <tbody>
            {[
              { d: "Apr 15, 2026", a: "£24.00", s: "Paid" },
              { d: "Mar 15, 2026", a: "£24.00", s: "Paid" },
              { d: "Feb 15, 2026", a: "£24.00", s: "Paid" },
            ].map((i) => (
              <tr key={i.d}>
                <td className="pro-text-muted">{i.d}</td>
                <td style={{ fontWeight: 700 }}>{i.a}</td>
                <td><Tag tone="success">{i.s}</Tag></td>
                <td><Button variant="ghost" size="sm">Download</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function IntegrationsSection() {
  const integrations = [
    { name: "Stripe",          desc: "Payments and subscriptions",   status: "connected" as const },
    { name: "Google Calendar", desc: "Sync events two-way",          status: "connected" as const },
    { name: "Mapbox",          desc: "Map and venue search",         status: "connected" as const },
    { name: "Apple Calendar",  desc: "Sync events two-way",          status: "available" as const },
    { name: "Slack",           desc: "Notifications to channels",    status: "available" as const },
    { name: "Mailchimp",       desc: "Send newsletters to members",  status: "available" as const },
  ];
  return (
    <Card padded={false}>
      {integrations.map((i, idx) => (
        <div key={i.name} className="pro-row" style={{
          padding: "14px 18px", gap: 12,
          borderTop: idx === 0 ? 0 : "1px solid var(--pro-border-soft)",
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--pro-surface-2)", border: "1px solid var(--pro-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plug size={15} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "var(--pro-fs-sm)" }}>{i.name}</div>
            <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)" }}>{i.desc}</div>
          </div>
          {i.status === "connected" ? (
            <>
              <Tag tone="success">Connected</Tag>
              <Button variant="ghost" size="sm">Disconnect</Button>
            </>
          ) : (
            <Button variant="secondary" size="sm">Connect</Button>
          )}
        </div>
      ))}
    </Card>
  );
}

function SecuritySection() {
  const [show, setShow] = useState(false);
  return (
    <>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 14 }}>Password</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Current password">
            <div className="pro-row" style={{ position: "relative" }}>
              <input type={show ? "text" : "password"} style={{ ...inputStyle, width: "100%" }} defaultValue="••••••••" />
              <button onClick={() => setShow((v) => !v)} aria-label="Toggle password" style={{ position: "absolute", right: 8, background: "transparent", border: 0, color: "var(--pro-text-subtle)", cursor: "pointer" }}>
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
          <Field label="New password"><input type="password" style={inputStyle} /></Field>
        </div>
        <div className="pro-row" style={{ gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <Button variant="primary">Update password</Button>
        </div>
      </Card>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 8 }}>Two-factor authentication</h3>
        <Toggle on={true}  onChange={() => {}} label="Authenticator app" description="Required for all admin and owner accounts" />
        <Toggle on={false} onChange={() => {}} label="SMS codes"       description="Backup factor for emergency access" />
      </Card>
      <Card padded={false}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--pro-border)" }}>
          <h3 style={{ margin: 0 }}>Active sessions</h3>
        </div>
        {[
          { device: "MacBook Pro · Safari", loc: "Manchester, UK", last: "Now" },
          { device: "iPhone 15 · iOS app",  loc: "Manchester, UK", last: "10m ago" },
          { device: "Chrome · Windows",     loc: "London, UK",     last: "2 days ago" },
        ].map((s, i) => (
          <div key={i} className="pro-row" style={{
            padding: "12px 18px", gap: 12,
            borderTop: i === 0 ? 0 : "1px solid var(--pro-border-soft)",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "var(--pro-fs-sm)" }}>{s.device}</div>
              <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)" }}>{s.loc} · {s.last}</div>
            </div>
            {i === 0 ? <Tag tone="success">This device</Tag> : <Button variant="ghost" size="sm">Sign out</Button>}
          </div>
        ))}
      </Card>
    </>
  );
}

export default function ProSettings() {
  const [section, setSection] = useState<Section>("profile");
  const current = sections.find((s) => s.key === section)!;
  const { role, can } = useProRole();
  const canBilling = can("club.billing");
  const canEdit = can("club.edit");
  const canSettings = can("club.settings");
  const canAssignRole = can("members.assignRole");

  // Sections gated by role
  const gated: Record<Section, boolean> = {
    profile:       true,
    organization:  canEdit,
    branding:      canEdit,
    permissions:   canAssignRole,
    notifications: true,
    billing:       canBilling,
    integrations:  canSettings,
    security:      true,
  };

  // If user lands on a section they no longer have access to, fall back to profile
  const effectiveSection: Section = gated[section] ? section : "profile";

  return (
    <PageShell
      title="Settings"
      subtitle="Manage your account, organization, billing, integrations and security."
    >
      <ContextBar
        context={<>You're acting as <strong>{ROLE_LABELS[role]}</strong>. Sections you can't change are hidden from the sidebar.</>}
        actions={[
          { key: "profile",        label: "My profile",     onClick: () => setSection("profile") },
          { key: "billing",        label: "Billing",        onClick: () => setSection("billing"),       disabled: !canBilling, hidden: !canBilling },
          { key: "permissions",    label: "Roles & access", onClick: () => setSection("permissions"),   disabled: !canAssignRole, hidden: !canAssignRole },
          { key: "security",       label: "Security",       onClick: () => setSection("security") },
        ]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }} className="pro-settings-grid">
        <Card padded={false} style={{ position: "sticky", top: 16, padding: 8 }}>
          <Sidebar active={effectiveSection} onSelect={setSection} gated={gated} />
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div>
            <h2 style={{ margin: 0 }}>{current.label}</h2>
            <p className="pro-text-muted" style={{ fontSize: "var(--pro-fs-sm)", marginTop: 2 }}>{current.description}</p>
          </div>

          {section === "profile"       && <ProfileSection />}
          {section === "organization"  && <OrganizationSection />}
          {section === "branding"      && <BrandingSection />}
          {section === "permissions"   && <PermissionsSection />}
          {section === "notifications" && <NotificationsSection />}
          {section === "billing"       && <BillingSection />}
          {section === "integrations"  && <IntegrationsSection />}
          {section === "security"      && <SecuritySection />}
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .pro-settings-grid { grid-template-columns: 1fr !important; }
          .pro-settings-grid > :first-child { position: static !important; }
        }
      `}</style>
    </PageShell>
  );
}
