/** Shared SURNA messenger tokens — matches Feed / MobileHome shell */
export type MessengerTheme = {
  pageBg: string;
  headerBg: string;
  msgAreaBg: string;
  inputBarBg: string;
  border: string;
  title: string;
  sub: string;
  icon: string;
  iconMuted: string;
  actionBg: string;
  searchBg: string;
  searchBorder: string;
  searchText: string;
  tabInactiveBg: string;
  tabActiveBg: string;
  tabActiveText: string;
  tabInactiveText: string;
  rowHover: string;
  avatarBg: string;
  avatarText: string;
  unreadBg: string;
  unreadText: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  composerBg: string;
  composerBorder: string;
  sendBg: string;
  sendIcon: string;
  sentBg: string;
  sentText: string;
  sentShadow: string;
  recvBg: string;
  recvBorder: string;
  recvText: string;
  recvShadow: string;
  replyAccent: string;
  replyBg: string;
  replyText: string;
  sheetBg: string;
  sheetHandle: string;
  sheetItemBg: string;
  primaryBtn: string;
  primaryBtnText: string;
  accentSoft: string;
};

export function getMessengerTheme(isDark: boolean): MessengerTheme {
  const border = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const tabActiveBg = isDark ? "#ffffff" : "#000000";
  const tabActiveText = isDark ? "#000000" : "#ffffff";

  return {
    pageBg: "var(--surna-base)",
    headerBg: "var(--surna-base)",
    msgAreaBg: "var(--surna-base)",
    inputBarBg: "var(--surna-base)",
    border,
    title: "var(--surna-text)",
    sub: "var(--surna-text-secondary)",
    icon: "var(--surna-text)",
    iconMuted: "var(--surna-text-muted)",
    actionBg: "var(--surna-elevated)",
    searchBg: "var(--surna-elevated)",
    searchBorder: border,
    searchText: "var(--surna-text)",
    tabInactiveBg: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    tabActiveBg,
    tabActiveText,
    tabInactiveText: "var(--surna-text-secondary)",
    rowHover: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
    avatarBg: "var(--surna-elevated)",
    avatarText: "var(--surna-text)",
    unreadBg: tabActiveBg,
    unreadText: tabActiveText,
    inputBg: "var(--surna-elevated)",
    inputBorder: border,
    inputText: "var(--surna-text)",
    composerBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    composerBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    sendBg: tabActiveBg,
    sendIcon: tabActiveText,
    sentBg: isDark ? "rgba(255,255,255,0.12)" : "#000000",
    sentText: isDark ? "var(--surna-text)" : "#ffffff",
    sentShadow: "none",
    recvBg: isDark ? "rgba(255,255,255,0.07)" : "var(--surna-elevated)",
    recvBorder: isDark ? "none" : `1px solid ${border}`,
    recvText: "var(--surna-text)",
    recvShadow: "none",
    replyAccent: "var(--surna-text-muted)",
    replyBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    replyText: "var(--surna-text-secondary)",
    sheetBg: isDark ? "var(--surna-elevated)" : "var(--surna-base)",
    sheetHandle: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
    sheetItemBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    primaryBtn: tabActiveBg,
    primaryBtnText: tabActiveText,
    accentSoft: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
  };
}
