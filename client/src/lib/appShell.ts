/** Routes that use their own chrome (MobileHome panels, Pro, auth, map/events). */
export function shouldShowAppShell(location: string): boolean {
  if (location === "/" || location === "/mobile") return false;
  if (location.startsWith("/pro")) return false;
  if (location === "/events") return false;
  if (location.startsWith("/api/")) return false;
  if (location.startsWith("/marketplace/shop")) return false;
  if (
    location === "/landing" ||
    location === "/login" ||
    location === "/signin" ||
    location.startsWith("/auth/") ||
    location === "/join"
  ) {
    return false;
  }
  return true;
}

export function isTabActive(location: string, path: string): boolean {
  if (path === "/") return location === "/" || location === "/mobile";
  if (path === "/search") return location === "/search" || location.startsWith("/search?");
  if (path === "/teams") return location === "/teams" || location.startsWith("/teams/");
  if (path === "/profile") {
    return (
      location === "/profile" ||
      location.startsWith("/profile/") ||
      location.startsWith("/person/") ||
      location.startsWith("/user/")
    );
  }
  if (path === "/feed") return location === "/feed";
  return location === path;
}
