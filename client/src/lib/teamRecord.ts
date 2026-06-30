export type TeamRecord = { W?: number; L?: number; D?: number };

export function formatTeamRecord(record?: TeamRecord | null): string {
  const w = record?.W ?? 0;
  const l = record?.L ?? 0;
  const d = record?.D ?? 0;
  return `${w}-${l}-${d}`;
}

export function teamRecordTotals(record?: TeamRecord | null) {
  const w = record?.W ?? 0;
  const l = record?.L ?? 0;
  const d = record?.D ?? 0;
  const total = w + l + d;
  const winRate = total > 0 ? Math.round((w / total) * 100) : 0;
  return { w, l, d, total, winRate };
}
