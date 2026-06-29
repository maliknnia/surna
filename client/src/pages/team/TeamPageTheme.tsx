import { createContext, useContext } from "react";

const TeamPageThemeContext = createContext({ accentColor: "var(--surna-gold, #f5c518)" });

export function TeamPageThemeProvider({
  accentColor,
  children,
}: {
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <TeamPageThemeContext.Provider value={{ accentColor }}>
      {children}
    </TeamPageThemeContext.Provider>
  );
}

export function useTeamPageAccent(): string {
  return useContext(TeamPageThemeContext).accentColor;
}
