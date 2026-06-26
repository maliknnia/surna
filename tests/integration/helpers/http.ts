import type { Express } from "express";
import request, { type SuperAgentTest } from "supertest";

export type TestUser = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  agent: SuperAgentTest;
  userId?: string;
  devCode?: string;
};

export async function signUpUser(
  app: Express,
  label: string,
): Promise<TestUser> {
  const email = `${label}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@surna-test.local`;
  const password = "TestPass123!";
  const agent = request.agent(app);
  agent.set("User-Agent", "SurnaIntegrationTest/1.0");

  const res = await agent
    .post("/api/auth/sign-up/email")
    .send({
      email,
      password,
      firstName: label,
      lastName: "Tester",
    })
    .expect(201);

  const devCode = res.body?.devCode as string | undefined;

  const me = await agent.get("/api/auth/user").expect(200);
  const userId = me.body?.id as string | undefined;

  return {
    email,
    password,
    firstName: label,
    lastName: "Tester",
    agent,
    userId,
    devCode,
  };
}

/** Sign up, verify email, and skip onboarding — ready for post/join routes. */
export async function readyTestUser(app: Express, label: string): Promise<TestUser> {
  const user = await signUpUser(app, label);
  if (user.devCode) {
    await apiPost(user.agent, "/api/auth/email/verify", { code: user.devCode });
  }
  await apiPost(user.agent, "/api/profile/path", {
    profileType: "normal",
    skipSetup: true,
  });
  return user;
}

export async function getCsrfToken(agent: SuperAgentTest): Promise<string> {
  const res = await agent.get("/api/csrf-token").expect(200);
  return res.body.csrfToken as string;
}

export async function apiPost(
  agent: SuperAgentTest,
  path: string,
  body: Record<string, unknown>,
) {
  const token = await getCsrfToken(agent);
  return agent.post(path).set("x-csrf-token", token).send(body);
}

export async function apiPut(
  agent: SuperAgentTest,
  path: string,
  body: Record<string, unknown>,
) {
  const token = await getCsrfToken(agent);
  return agent.put(path).set("x-csrf-token", token).send(body);
}

export async function apiPatch(
  agent: SuperAgentTest,
  path: string,
  body: Record<string, unknown>,
) {
  const token = await getCsrfToken(agent);
  return agent.patch(path).set("x-csrf-token", token).send(body);
}

export async function apiDelete(agent: SuperAgentTest, path: string) {
  const token = await getCsrfToken(agent);
  return agent.delete(path).set("x-csrf-token", token);
}

export function uniqueTeamName(prefix: string) {
  return `${prefix} ${Date.now().toString(36)}`;
}

/** Grant admin role for Wave 4 admin integration tests. */
export async function grantAdminRole(userId: string, role = "super_admin") {
  const { db } = await import("../../../server/db");
  const { users } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");
  await db
    .update(users)
    .set({ adminRole: role, require2FA: false })
    .where(eq(users.id, userId));
}
