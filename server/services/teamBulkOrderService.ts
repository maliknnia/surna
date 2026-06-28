import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { teamMembers, teams, users } from "@shared/schema";
import { parseUserProfile } from "@shared/userProfile";
import { gearProfileSummary } from "@shared/gearProfile";
import {
  buildTeamBulkLine,
  formatTeamBulkCartLabel,
  teamBulkVariantKey,
  type TeamBulkPreview,
} from "@shared/teamBulkOrder";
import {
  categoryUsesShoeSizes,
  productRequiresVariant,
  type ProductVariantType,
} from "@shared/marketplaceVariants";
import {
  ensureCart,
  getProduct,
  upsertCartItem,
} from "../features/marketplace/marketplace.repo";

function displayName(user: {
  displayName?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  if (user.displayName?.trim()) return user.displayName.trim();
  if (user.username?.trim()) return user.username.trim();
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return full || "Member";
}

async function assertCanManageTeam(teamId: string, userId: string): Promise<void> {
  const [team] = await db.select({ captainId: teams.captainId }).from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) throw new Error("TEAM_NOT_FOUND");

  if (team.captainId === userId) return;

  const [member] = await db
    .select({ role: teamMembers.role, status: teamMembers.status })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  const role = member?.role ?? "";
  if (
    member?.status !== "active" ||
    (role !== "captain" && role !== "co-captain" && role !== "admin")
  ) {
    throw new Error("FORBIDDEN");
  }
}

function resolveVariantType(category: string | null | undefined): ProductVariantType {
  return categoryUsesShoeSizes(category) ? "shoe" : "size";
}

export async function previewTeamBulkOrder(params: {
  productId: string;
  teamId: string;
  managerUserId: string;
  memberUserIds?: string[];
}): Promise<TeamBulkPreview> {
  await assertCanManageTeam(params.teamId, params.managerUserId);

  const product = await getProduct(params.productId);
  if (!product) throw new Error("PRODUCT_NOT_FOUND");
  if (!productRequiresVariant(product)) throw new Error("TEAM_BULK_REQUIRES_VARIANTS");

  const [team] = await db
    .select({ name: teams.name })
    .from(teams)
    .where(eq(teams.id, params.teamId))
    .limit(1);
  if (!team) throw new Error("TEAM_NOT_FOUND");

  const rows = await db
    .select({ member: teamMembers, user: users })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(and(eq(teamMembers.teamId, params.teamId), eq(teamMembers.status, "active")));

  const filterSet = params.memberUserIds?.length ? new Set(params.memberUserIds) : null;

  const variantType = resolveVariantType((product as { category?: string }).category);
  const variants = (product as { variants?: Parameters<typeof buildTeamBulkLine>[0]["variants"] }).variants ?? [];

  const lines = rows
    .filter(({ user }) => !filterSet || filterSet.has(user.id))
    .map(({ member, user }) => {
      const profile = parseUserProfile(user.profileJson, user);
      return buildTeamBulkLine({
        userId: user.id,
        memberId: member.id,
        name: displayName(user),
        gear: gearProfileSummary(profile.gearProfile),
        variants,
        variantType,
      });
    });

  const readyCount = lines.filter((l) => l.status === "ready").length;

  return {
    productId: params.productId,
    productTitle: String((product as { title?: string }).title ?? "Product"),
    teamId: params.teamId,
    teamName: team.name,
    variantType,
    lines,
    readyCount,
    totalCount: lines.length,
  };
}

export async function addTeamBulkOrderToCart(params: {
  productId: string;
  teamId: string;
  managerUserId: string;
  memberUserIds?: string[];
}): Promise<{ addedCount: number; skippedCount: number; preview: TeamBulkPreview }> {
  const preview = await previewTeamBulkOrder({
    productId: params.productId,
    teamId: params.teamId,
    managerUserId: params.managerUserId,
    memberUserIds: params.memberUserIds,
  });

  const cartId = await ensureCart(params.managerUserId);
  let addedCount = 0;
  let skippedCount = 0;

  for (const line of preview.lines) {
    if (line.status !== "ready" || !line.variantId) {
      skippedCount += 1;
      continue;
    }

    await upsertCartItem(cartId, params.productId, 1, line.variantId, {
      variantKey: teamBulkVariantKey(line.variantId, line.userId),
      variantLabel: formatTeamBulkCartLabel(line),
    });
    addedCount += 1;
  }

  if (addedCount === 0) {
    throw new Error("NO_LINES_ADDED");
  }

  return { addedCount, skippedCount, preview };
}
