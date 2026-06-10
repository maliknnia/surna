import os from "node:os";

/** IPv4 LAN addresses for phone/tablet testing (same Wi‑Fi as this PC). */
export function getDevLanUrls(port: number | string): string[] {
  const urls: string[] = [];
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const n of nets || []) {
      if (String(n.family) !== "IPv4" || n.internal) continue;
      const ip = n.address;
      // Prefer typical home Wi‑Fi (192.168.x / 10.x); skip WSL/Hyper-V virtual NICs when possible
      if (ip.startsWith("172.") && !ip.startsWith("172.16.")) continue;
      urls.push(`http://${ip}:${port}`);
    }
  }
  // Fallback: include any IPv4 if filtering removed everything
  if (urls.length === 0) {
    for (const nets of Object.values(os.networkInterfaces())) {
      for (const n of nets || []) {
        if (String(n.family) === "IPv4" && !n.internal) {
          urls.push(`http://${n.address}:${port}`);
        }
      }
    }
  }
  return [...new Set(urls)];
}
