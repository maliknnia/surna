import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];

page.on("pageerror", (e) => logs.push(`PAGE:${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") logs.push(`CON:${msg.text()}`);
});
page.on("response", async (r) => {
  const url = r.url();
  if (!url.includes("/api/auth") && !url.includes("/api/profile") && !url.includes("/api/csrf")) return;
  let body = "";
  try {
    body = (await r.text()).slice(0, 250);
  } catch {
    /* ignore */
  }
  logs.push(`HTTP ${r.status()} ${url.replace(/^https:\/\/[^/]+/, "")} ${body}`);
});

await page.goto("https://surna-production.up.railway.app/login", {
  waitUntil: "domcontentloaded",
  timeout: 45000,
});
await page.waitForTimeout(2000);

// Theme modal blocks login until Dark/Light is picked (fix pending deploy).
if ((await page.getByTestId("card-dark-theme").count()) > 0) {
  await page.getByTestId("card-dark-theme").click();
  await page.waitForTimeout(500);
}

const initial = await page.locator("#root").innerText().catch(() => "");
console.log("INITIAL:", initial.slice(0, 300).replace(/\n/g, " | "));

await page.getByText("New here? Create an account").click({ timeout: 8000 }).catch(() => {});
await page.waitForTimeout(500);

const email = `live${Date.now()}@surna.test`;
await page.locator('[data-testid="input-login-email"]').fill(email);
await page.locator('[data-testid="input-login-password"]').fill("TestPass123!");
await page.getByPlaceholder("First name").fill("Test").catch(() => {});
await page.getByPlaceholder("Last name").fill("User").catch(() => {});
await page.locator('[data-testid="button-login-email"]').click();
await page.waitForTimeout(6000);

const afterSignup = await page.locator("#root").innerText().catch(() => "");
console.log("AFTER SIGNUP:", afterSignup.slice(0, 500).replace(/\n/g, " | "));

if ((await page.getByRole("button", { name: /Quick Start/i }).count()) > 0) {
  await page.getByRole("button", { name: /Quick Start/i }).click();
  await page.waitForTimeout(5000);
}

const afterPath = await page.locator("#root").innerText().catch(() => "");
const user = await page.evaluate(async () => {
  const r = await fetch("/api/auth/user", { credentials: "include" });
  return { status: r.status, body: (await r.text()).slice(0, 300) };
});

console.log("AFTER PATH:", afterPath.slice(0, 400).replace(/\n/g, " | "));
console.log("USER:", JSON.stringify(user));
console.log("LOGS:\n" + logs.join("\n"));

await browser.close();
