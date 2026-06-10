import { useState } from "react";
import { ChevronDown, Info, Check, X } from "lucide-react";
import {
  useChallengesTheme,
  CHALLENGE_ACCESS_RULES,
  VISIBILITY_RULES,
  type ChallengeTypeKey,
  type VisibilityKey,
} from "./challengesTheme";

export function HowChallengesWorkCard() {
  const t = useChallengesTheme();
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left rounded-2xl p-4 mb-4 transition-all active:scale-[0.99]"
      style={{
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: t.iconBtnBg }}
        >
          <Info size={16} style={{ color: t.iconAccent }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold" style={{ color: t.textPrimary }}>
            How challenges work
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: t.textMuted }}>
            Who can join, invite, or compete
          </p>
        </div>
        <ChevronDown
          size={18}
          style={{
            color: t.textMuted,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </div>
      {open && (
        <div className="mt-4 pt-4 space-y-3" style={{ borderTop: `1px solid ${t.divider}` }}>
          <p className="text-[12px] leading-relaxed" style={{ color: t.textSecondary }}>
            Create a challenge from a profile (1v1) or here for open play. Visibility controls who sees it in Nearby.
          </p>
          <ul className="space-y-2 text-[12px]" style={{ color: t.textSecondary }}>
            <li>
              <strong style={{ color: t.textPrimary }}>Solo</strong> — personal goal, only you.
            </li>
            <li>
              <strong style={{ color: t.textPrimary }}>1v1</strong> — one opponent; they must accept your invite.
            </li>
            <li>
              <strong style={{ color: t.textPrimary }}>Team vs team</strong> — both teams confirm.
            </li>
            <li>
              <strong style={{ color: t.textPrimary }}>Open</strong> — listed publicly; players request to join until full.
            </li>
          </ul>
        </div>
      )}
    </button>
  );
}

export function AccessRulesSummary({
  type,
  visibility,
}: {
  type: ChallengeTypeKey;
  visibility: VisibilityKey;
}) {
  const t = useChallengesTheme();
  const typeRules = CHALLENGE_ACCESS_RULES[type];
  const visRules = VISIBILITY_RULES[visibility];

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: t.elevated, border: `1px solid ${t.cardBorder}` }}
    >
      <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: t.label }}>
        Who can challenge / join
      </p>
      <div>
        <p className="text-[13px] font-semibold mb-2" style={{ color: t.textPrimary }}>
          {typeRules.title} · {visRules.label}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <RuleList title="Can" items={typeRules.can} positive />
          <RuleList title="Can't" items={typeRules.cannot} positive={false} />
        </div>
        <p className="text-[11px] mt-3" style={{ color: t.textMuted }}>
          {visRules.desc} — {visRules.can[0]}
        </p>
      </div>
    </div>
  );
}

function RuleList({
  title,
  items,
  positive,
}: {
  title: string;
  items: readonly string[];
  positive: boolean;
}) {
  const t = useChallengesTheme();
  const Icon = positive ? Check : X;
  const color = positive ? t.success : t.textMuted;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: t.label }}>
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-1.5 text-[11px]" style={{ color: t.textSecondary }}>
            <Icon size={12} className="mt-0.5 flex-shrink-0" style={{ color }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
