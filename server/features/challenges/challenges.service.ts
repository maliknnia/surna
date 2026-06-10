// server/features/challenges/challenges.service.ts
import { challengesRepo } from "./challenges.repo";
import type { CompetitiveMatch, MatchResult } from "@shared/schema";
import { createChallengePost } from "../feed/feed.service";
import type { MessengerService } from "../messenger/messenger.service";

// ELO Rating calculation
const K_FACTOR = 32; // Sensitivity of rating changes

export class ChallengesService {
  constructor(private io: any, private messengerService?: MessengerService) {}

  // Calculate expected score for ELO
  private calculateExpected(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  // Calculate new ELO rating
  private calculateNewRating(
    currentRating: number,
    expectedScore: number,
    actualScore: number
  ): number {
    return Math.round(currentRating + K_FACTOR * (actualScore - expectedScore));
  }

  // Create a new competitive match
  async createMatch(userId: string, data: any): Promise<CompetitiveMatch> {
    const match = await challengesRepo.createMatch({
      ...data,
      creatorType: 'user',
      creatorId: userId,
      status: data.visibility === 'invite' && data.opponentId ? 'invited' : 'pending',
    });

    // Add creator as participant
    await challengesRepo.addParticipant({
      matchId: match.id,
      participantType: 'user',
      participantId: userId,
      role: 'host',
      status: 'accepted',
    });

    // Add opponent as participant if specified
    if (data.opponentId && data.opponentType) {
      await challengesRepo.addParticipant({
        matchId: match.id,
        participantType: data.opponentType,
        participantId: data.opponentId,
        role: 'guest',
        status: 'pending',
      });
    }

    // Emit socket event
    if (this.io) {
      this.io.emit('challenge:created', { match });
    }

    // Package #10: Auto-post to feed (best-effort, non-blocking)
    createChallengePost({
      authorId: userId,
      eventType: 'created',
      challengeId: match.id,
      title: match.title,
      sport: match.sport,
      visibility: match.visibility || 'public',
      scheduledAt: match.timeStart,
    }).catch(err => console.error('[Feed] Challenge post creation failed:', err));

    return match;
  }

  // Accept a challenge
  async acceptChallenge(matchId: string, userId: string): Promise<CompetitiveMatch> {
    const match = await challengesRepo.getMatchById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Update participant status
    await challengesRepo.updateParticipantStatus(matchId, userId, 'accepted');

    // Update match status
    const updatedMatch = await challengesRepo.updateMatch(matchId, {
      status: 'accepted',
    });

    // Package #10: Auto-create messenger thread for participants (best-effort)
    this.ensureChallengeThread(matchId).catch(err => 
      console.error('[Challenges] Failed to create messenger thread:', err)
    );

    // Emit socket event
    if (this.io) {
      this.io.to(`match:${matchId}`).emit('challenge:updated', { match: updatedMatch });
    }

    return updatedMatch;
  }

  // Package #10: Create messenger group for challenge participants (idempotent, adds missing members)
  private async ensureChallengeThread(matchId: string): Promise<string> {
    // Graceful degradation: skip if messenger service not available
    if (!this.messengerService) {
      console.warn('[Challenges] MessengerService not available, skipping thread creation');
      return '';
    }

    const match = await challengesRepo.getMatchById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Get all accepted participants (skip declined/pending)
    const allParticipants = await challengesRepo.getParticipants(matchId);
    const acceptedParticipants = allParticipants.filter(p => p.status === 'accepted');

    // Wait for multiple participants before creating group (tolerant of temporary <2 state)
    if (acceptedParticipants.length < 2) {
      // Return empty string to signal "not ready yet" without throwing
      // Subsequent acceptances will retry and succeed once >=2 participants exist
      return '';
    }

    let groupId = match.messengerGroupId;
    let isNewGroup = false;

    // Create group if it doesn't exist
    if (!groupId) {
      try {
        const group = await this.messengerService.createGroup(match.creatorId, {
          name: `Challenge: ${match.title}`,
          description: `Discussion thread for ${match.sport} challenge`,
        });
        groupId = group.id;
        isNewGroup = true;

        // Store group ID on match for future reference
        await challengesRepo.updateMatch(matchId, {
          messengerGroupId: groupId,
        });
      } catch (err) {
        console.error('[Challenges] Failed to create messenger group:', err);
        return ''; // Best-effort: return empty string on failure
      }
    }

    // Get current group members to avoid duplicate additions
    let existingMemberIds: Set<string>;
    try {
      const members = await this.messengerService.listGroupMembersRaw(groupId);
      existingMemberIds = new Set(members.map((m: any) => m.user_id));
    } catch (err) {
      console.warn('[Challenges] Failed to fetch group members, will attempt to add all:', err);
      existingMemberIds = new Set([match.creatorId]); // At minimum, creator is already in
    }

    // Add all user participants who aren't already in the group
    const userParticipants = acceptedParticipants.filter(
      p => p.participantType === 'user' && !existingMemberIds.has(p.participantId)
    );

    for (const participant of userParticipants) {
      try {
        await this.messengerService.addGroupMember(
          groupId,
          match.creatorId,
          participant.participantId,
          'member'
        );
      } catch (err) {
        console.error(`[Challenges] Failed to add participant ${participant.participantId} to group:`, err);
      }
    }

    // Send system message only for newly created groups
    if (isNewGroup) {
      try {
        await this.messengerService.sendGroupMessage(groupId, match.creatorId, {
          body: `🏆 Challenge thread created! Match: ${match.title} | Sport: ${match.sport}${
            match.timeStart ? ` | Scheduled: ${new Date(match.timeStart).toLocaleString()}` : ''
          }`,
        });
      } catch (err) {
        console.error('[Challenges] Failed to send initial group message:', err);
      }
    }

    return groupId;
  }

  // Join open challenge
  async joinOpenChallenge(matchId: string, userId: string): Promise<void> {
    const match = await challengesRepo.getMatchById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.type !== 'open') {
      throw new Error('Only open challenges can be joined');
    }

    // Add as participant
    await challengesRepo.addParticipant({
      matchId,
      participantType: 'user',
      participantId: userId,
      status: 'accepted',
    });

    // Package #10: Auto-create/update messenger thread (best-effort)
    this.ensureChallengeThread(matchId).catch(err => 
      console.error('[Challenges] Failed to add participant to messenger thread:', err)
    );

    if (this.io) {
      this.io.to(`match:${matchId}`).emit('challenge:participant_joined', { matchId, userId });
    }
  }

  // Decline a challenge
  async declineChallenge(matchId: string, userId: string): Promise<void> {
    await challengesRepo.updateParticipantStatus(matchId, userId, 'declined');
    
    const updatedMatch = await challengesRepo.updateMatch(matchId, {
      status: 'cancelled',
    });

    if (this.io) {
      this.io.to(`match:${matchId}`).emit('challenge:updated', { match: updatedMatch });
    }
  }

  // Start a match (set status to live)
  async startMatch(matchId: string, userId: string): Promise<CompetitiveMatch> {
    const match = await challengesRepo.getMatchById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Verify user is creator or admin
    if (match.creatorId !== userId) {
      throw new Error('Only the creator can start the match');
    }

    const updatedMatch = await challengesRepo.updateMatch(matchId, {
      status: 'live',
    });

    if (this.io) {
      this.io.to(`match:${matchId}`).emit('challenge:live', { match: updatedMatch });
    }

    return updatedMatch;
  }

  // Report match result
  async reportResult(matchId: string, userId: string, data: any): Promise<MatchResult> {
    const match = await challengesRepo.getMatchById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Create result
    const result = await challengesRepo.createResult({
      matchId,
      reportedById: userId,
      ...data,
      status: 'pending',
    });

    if (this.io) {
      this.io.to(`match:${matchId}`).emit('challenge:result_reported', { result });
    }

    return result;
  }

  // Confirm match result (counterparty confirmation)
  async confirmResult(resultId: string, userId: string): Promise<MatchResult> {
    const result = await challengesRepo.getResultById(resultId);
    if (!result) {
      throw new Error('Result not found');
    }

    // Update result
    const confirmedResult = await challengesRepo.updateResult(resultId, {
      confirmedById: userId,
      confirmedAt: new Date(),
      status: 'confirmed',
    });

    // Get match details
    const match = await challengesRepo.getMatchById(confirmedResult.matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Update match status
    await challengesRepo.updateMatch(confirmedResult.matchId, {
      status: 'completed',
    });

    // Calculate and update ratings
    await this.updateRatings(match, confirmedResult);

    if (this.io) {
      this.io.to(`match:${confirmedResult.matchId}`).emit('challenge:result', { 
        result: confirmedResult,
        match 
      });
    }

    // Package #10: Auto-post result to feed (best-effort, non-blocking)
    const participants = await challengesRepo.getParticipants(confirmedResult.matchId);
    createChallengePost({
      authorId: match.creatorId,
      eventType: 'result',
      challengeId: match.id,
      title: match.title,
      sport: match.sport,
      visibility: match.visibility || 'public',
      outcome: {
        winner: confirmedResult.outcome,
        hostScore: confirmedResult.hostScore,
        guestScore: confirmedResult.guestScore,
      },
      participants: participants.map(p => ({ id: p.participantId, type: p.participantType })),
    }).catch(err => console.error('[Feed] Challenge result post creation failed:', err));

    await this.awardChallengeWinnerBadge(confirmedResult.matchId, confirmedResult.outcome)
      .catch(err => console.error('[Challenges] Winner badge award failed:', err));

    return confirmedResult;
  }

  private async resolveWinnerUserIds(matchId: string, outcome: string): Promise<string[]> {
    if (outcome === 'draw') return [];

    const participants = await challengesRepo.getParticipants(matchId);
    const host = participants.find(p => p.role === 'host');
    const guest = participants.find(p => p.role === 'guest');
    if (!host || !guest) return [];

    const winner =
      outcome === 'hostWin'
        ? host
        : outcome === 'guestWin' || outcome === 'forfeit'
          ? guest
          : null;
    if (!winner) return [];

    if (winner.participantType === 'user') {
      return [winner.participantId];
    }

    if (winner.participantType === 'team') {
      const { db } = await import("../../db");
      const { teams } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [team] = await db
        .select({ captainId: teams.captainId })
        .from(teams)
        .where(eq(teams.id, winner.participantId))
        .limit(1);
      return team?.captainId ? [team.captainId] : [];
    }

    return [];
  }

  private async ensureChallengeWinnerBadgeId(): Promise<string | null> {
    const { db } = await import("../../db");
    const { badgeDefinitions } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    const [existing] = await db
      .select({ id: badgeDefinitions.id })
      .from(badgeDefinitions)
      .where(eq(badgeDefinitions.name, "challenge-winner"))
      .limit(1);
    if (existing) return existing.id;

    try {
      const [row] = await db
        .insert(badgeDefinitions)
        .values({
          name: "challenge-winner",
          description: "Won a competitive challenge on SURNA",
          category: "performance",
          tier: "gold",
          requirements: { type: "challenge_win" },
          isActive: true,
        })
        .returning({ id: badgeDefinitions.id });
      if (row) return row.id;
    } catch {
      /* unique race */
    }

    const [again] = await db
      .select({ id: badgeDefinitions.id })
      .from(badgeDefinitions)
      .where(eq(badgeDefinitions.name, "challenge-winner"))
      .limit(1);
    return again?.id ?? null;
  }

  private async awardChallengeWinnerBadge(matchId: string, outcome: string): Promise<void> {
    const winnerUserIds = await this.resolveWinnerUserIds(matchId, outcome);
    if (winnerUserIds.length === 0) return;

    const badgeId = await this.ensureChallengeWinnerBadgeId();
    if (!badgeId) {
      console.warn("[Challenges] challenge-winner badge definition missing");
      return;
    }

    const { db } = await import("../../db");
    const { userBadges } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");
    const { gamificationService } = await import("../../services/gamificationService");
    const { insertNotification } = await import("../notifications/notifications.repo");
    const { getIO } = await import("../../realtime/io");

    for (const userId of winnerUserIds) {
      const [alreadyHas] = await db
        .select({ id: userBadges.id })
        .from(userBadges)
        .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
        .limit(1);
      if (alreadyHas) continue;

      try {
        await gamificationService.awardBadge(userId, badgeId);
      } catch (err) {
        console.warn("[Challenges] badge award failed for", userId, err);
        continue;
      }

      const rec = await insertNotification({
        userId,
        type: "badge-earned" as import("../notifications/notifications.types").NotifType,
        message: "You earned the Challenge Winner badge!",
        metadata: { badgeType: "challenge-winner", badgeId, matchId },
      });
      try {
        getIO().to(`user:${userId}`).emit("notification:new", rec);
      } catch {
        /* socket optional */
      }
    }
  }

  // Update ELO ratings based on match result
  private async updateRatings(match: CompetitiveMatch, result: MatchResult): Promise<void> {
    // Only update ratings for competitive 1v1 or team matches
    if (match.type === 'solo' || match.type === 'open') {
      return; // Solo/open challenges don't affect ratings
    }

    // Get participants
    const participants = await challengesRepo.getParticipants(match.id);
    const host = participants.find(p => p.role === 'host');
    const guest = participants.find(p => p.role === 'guest');

    if (!host || !guest) {
      return;
    }

    // Get current ratings
    const hostRating = await challengesRepo.getCurrentRating(
      host.participantType,
      host.participantId,
      match.sport
    );
    const guestRating = await challengesRepo.getCurrentRating(
      guest.participantType,
      guest.participantId,
      match.sport
    );

    // Calculate expected scores
    const hostExpected = this.calculateExpected(hostRating, guestRating);
    const guestExpected = 1 - hostExpected;

    // Determine actual scores based on outcome
    let hostActual: number, guestActual: number;
    if (result.outcome === 'hostWin') {
      hostActual = 1;
      guestActual = 0;
    } else if (result.outcome === 'guestWin') {
      hostActual = 0;
      guestActual = 1;
    } else if (result.outcome === 'draw') {
      hostActual = 0.5;
      guestActual = 0.5;
    } else {
      // Forfeit - treat as loss for forfeiter
      hostActual = 0;
      guestActual = 1;
    }

    // Calculate new ratings
    const hostNewRating = this.calculateNewRating(hostRating, hostExpected, hostActual);
    const guestNewRating = this.calculateNewRating(guestRating, guestExpected, guestActual);

    // Save rating changes
    await challengesRepo.addRatingChange({
      entityType: host.participantType,
      entityId: host.participantId,
      sport: match.sport,
      delta: hostNewRating - hostRating,
      newRating: hostNewRating,
      matchId: match.id,
    });

    await challengesRepo.addRatingChange({
      entityType: guest.participantType,
      entityId: guest.participantId,
      sport: match.sport,
      delta: guestNewRating - guestRating,
      newRating: guestNewRating,
      matchId: match.id,
    });
  }

  // Dispute a result
  async disputeResult(resultId: string, userId: string, reason: string): Promise<MatchResult> {
    const disputed = await challengesRepo.updateResult(resultId, {
      status: 'disputed',
      notes: reason,
    });

    const match = await challengesRepo.getMatchById(disputed.matchId);
    if (match) {
      await challengesRepo.updateMatch(match.id, {
        status: 'disputed',
      });
    }

    if (this.io) {
      this.io.to(`match:${disputed.matchId}`).emit('challenge:disputed', { result: disputed });
    }

    return disputed;
  }

  // Get leaderboard
  async getLeaderboard(
    scope: 'user' | 'team',
    sport?: string,
    range?: string,
    limit: number = 100
  ) {
    return challengesRepo.getLeaderboard(scope, sport, limit);
  }

  // Package #10: Get user/team ratings by sport
  async getRatings(entityType: 'user' | 'team', entityId: string): Promise<any[]> {
    return challengesRepo.getRatingsBySports(entityType, entityId);
  }
}
