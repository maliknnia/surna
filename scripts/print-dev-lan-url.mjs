import os from "node:os";
import { readFileSync, existsSync } from "node:fs";

let port = process.env.PORT || "5000";
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*PORT\s*=\s*(\d+)\s*$/i);
    if (m) port = m[1];
  }
}

const urls = [];
for (const nets of Object.values(os.networkInterfaces())) {
  for (const n of nets || []) {
    if (String(n.family) === "IPv4" && !n.internal) {
      const ip = n.address;
      if (ip.startsWith("172.") && !ip.startsWith("172.16.")) continue;
      urls.push(`http://${ip}:${port}`);
    }
  }
}

if (urls.length === 0) {
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const n of nets || []) {
      if (String(n.family) === "IPv4" && !n.internal) {
        urls.push(`http://${n.address}:${port}`);
      }
    }
  }
}

const primary = urls.find((u) => u.includes("192.168.")) || urls[0];

console.log("\n=== Open SURNA on your phone ===");
if (primary) {
  console.log(`\n  ${primary}\n`);
  if (urls.length > 1) {
    console.log("Other addresses on this PC:");
    urls.filter((u) => u !== primary).forEach((u) => console.log(`  ${u}`));
  }
} else {
  console.log("\n  No LAN IP found. Connect this PC to Wi‑Fi first.\n");
}

console.log("Rules:");
console.log("  • Phone must be on the SAME Wi‑Fi (not mobile data)");
console.log("  • Do NOT use localhost on the phone");
console.log("  • Run `npm run dev` on the PC first");
console.log("\nIf the page never loads on your phone:");
console.log("  1. Windows may block LAN — run: npm run phone  (public HTTPS link, no firewall fix needed)");
console.log("  2. Or set Wi‑Fi to Private: Settings → Network → Wi‑Fi → your network → Private");
console.log("  3. Or PowerShell as Admin:");
console.log(`     netsh advfirewall firewall add rule name="SURNA Dev 5000" dir=in action=allow protocol=TCP localport=${port}`);
console.log("");
