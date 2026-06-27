// server/features/challenges/challenges.router.ts
import { Router } from "express";
import { ChallengesService } from "./challenges.service";
import { challengesRepo } from "./challenges.repo";
import {
  createMatchSchema,
  updateMatchSchema,
  reportResultSchema,
  matchQuerySchema,
  leaderboardQuerySchema,
} from "./challenges.validation";
import { authMiddleware } from "../../middleware/auth";
import { bridgeSessionUser } from "../../middleware/bridgeSessionUser";
import { MessengerService } from "../messenger/messenger.service";
import type { InsertCompetitiveMatch } from "@shared/schema";

export function createChallengesRouter(io: any): Router {
  const router = Router();
  const messengerService = new MessengerService(io);
  const challengesService = new ChallengesService(io, messengerService);

  // All routes require authentication (JWT bearer and/or cookie session)
  router.use(authMiddleware());
  router.use(bridgeSessionUser);

  // ========== MATCH CRUD ==========

  // POST /api/competitive-challenges - Create new match/challenge
  router.post("/", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const data = createMatchSchema.parse(req.body);
      const match = await challengesService.createMatch(req.jwtUser.id, data);
      const [enriched] = await challengesRepo.attachCoverUrls([match]);

      res.json(enriched);
    } catch (error: any) {
      next(error);
    }
  });

  // GET /api/competitive-challenges/leaderboards — before /:id (first registered wins)
  router.get("/leaderboards", async (req: any, res, next) => {
    try {
      const { scope, sport, range, limit } = leaderboardQuerySchema.parse(req.query);

      const leaderboard = await challengesService.getLeaderboard(
        scope,
        sport,
        range,
        limit ? parseInt(limit) : 100,
      );

      res.json({ leaderboard });
    } catch (error: any) {
      next(error);
    }
  });

  // GET /api/competitive-challenges/ratings/:userId
  router.get("/ratings/:userId", async (req: any, res, next) => {
    try {
      const ratings = await challengesService.getRatings("user", req.params.userId);
      res.json({ ratings });
    } catch (error: any) {
      next(error);
    }
  });

  // GET /api/competitive-challenges/ratings/team/:teamId
  router.get("/ratings/team/:teamId", async (req: any, res, next) => {
    try {
      const ratings = await challengesService.getRatings("team", req.params.teamId);
      res.json({ ratings });
    } catch (error: any) {
      next(error);
    }
  });

  // GET /api/competitive-challenges - List matches with filters
  router.get("/", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { type, sport, status, mine, userId, teamId, near, limit } = matchQuerySchema.parse(req.query);
      
      const filters: any = {
        type,
        sport,
        status,
        limit: limit ? parseInt(limit) : 50,
      };

      if (status?.includes(",")) {
        filters.status = status;
      }

      // Map summary uses visibility=public with multi-status
      const visibility = req.query.visibility as string | undefined;
      if (visibility) {
        filters.visibility = visibility;
      }

      if (mine === 'true') {
        filters.creatorId = req.jwtUser.id;
      }

      // Package #10: Support userId and teamId filtering
      if (userId) {
        filters.userId = userId;
      }
      if (teamId) {
        filters.teamId = teamId;
      }

      const matches = await challengesRepo.getMatches(filters);
      const enriched = await challengesRepo.attachCoverUrls(matches);

      res.json({ matches: enriched });
    } catch (error: any) {
      next(error);
    }
  });

  // GET /api/competitive-challenges/:id - Get match details
  router.get("/:id", async (req: any, res, next) => {
    try {
      const match = await challengesRepo.getMatchById(req.params.id);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Get participants
      const participants = await challengesRepo.enrichParticipants(
        await challengesRepo.getParticipants(req.params.id),
      );
      const results = await challengesRepo.getResultsByMatch(req.params.id);
      const result = results[0] ?? null;
      const [matchWithCover] = await challengesRepo.attachCoverUrls([match]);

      res.json({ match: matchWithCover, participants, result });
    } catch (error: any) {
      next(error);
    }
  });

  // PATCH /api/competitive-challenges/:id - Update match
  router.patch("/:id", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const match = await challengesRepo.getMatchById(req.params.id);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Only creator can update
      if (match.creatorId !== req.jwtUser.id) {
        return res.status(403).json({ message: "Only creator can update match" });
      }

      const parsed = updateMatchSchema.parse(req.body);
      const { timeStart: timeStartStr, timeEnd: timeEndStr, ...rest } = parsed;
      const data: Partial<InsertCompetitiveMatch> = { ...rest };
      if (timeStartStr !== undefined) data.timeStart = new Date(timeStartStr);
      if (timeEndStr !== undefined) data.timeEnd = new Date(timeEndStr);
      const updatedMatch = await challengesRepo.updateMatch(req.params.id, data);

      res.json(updatedMatch);
    } catch (error: any) {
      next(error);
    }
  });

  // DELETE /api/competitive-challenges/:id - Cancel/delete match
  router.delete("/:id", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const match = await challengesRepo.getMatchById(req.params.id);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Only creator can delete
      if (match.creatorId !== req.jwtUser.id) {
        return res.status(403).json({ message: "Only creator can cancel match" });
      }

      await challengesRepo.deleteMatch(req.params.id);

      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  // ========== MATCH ACTIONS ==========

  // POST /api/competitive-challenges/:id/accept - Accept challenge
  router.post("/:id/accept", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const match = await challengesService.acceptChallenge(req.params.id, req.jwtUser.id);
      
      res.json(match);
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/competitive-challenges/:id/decline - Decline challenge
  router.post("/:id/decline", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await challengesService.declineChallenge(req.params.id, req.jwtUser.id);
      
      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/competitive-challenges/:id/join - Join open challenge
  router.post("/:id/join", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await challengesService.joinOpenChallenge(req.params.id, req.jwtUser.id);

      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/competitive-challenges/:id/checkin - Check in at venue
  router.post("/:id/checkin", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await challengesRepo.updateParticipantStatus(
        req.params.id,
        req.jwtUser.id,
        'checkedIn'
      );

      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/competitive-challenges/:id/start - Start match (go live)
  router.post("/:id/start", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const match = await challengesService.startMatch(req.params.id, req.jwtUser.id);
      
      res.json(match);
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/competitive-challenges/:id/cancel - Cancel match
  router.post("/:id/cancel", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const match = await challengesRepo.updateMatch(req.params.id, {
        status: 'cancelled',
      });

      res.json(match);
    } catch (error: any) {
      next(error);
    }
  });

  // ========== RESULTS ==========

  // POST /api/competitive-challenges/:id/report - Report match result
  router.post("/:id/report", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const data = reportResultSchema.parse(req.body);
      const result = await challengesService.reportResult(req.params.id, req.jwtUser.id, data);
      
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/competitive-challenges/:id/confirm - Confirm result
  router.post("/:id/confirm", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { resultId } = req.body;
      const result = await challengesService.confirmResult(resultId, req.jwtUser.id);
      
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/competitive-challenges/:id/dispute - Dispute result
  router.post("/:id/dispute", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { resultId, reason } = req.body;
      const result = await challengesService.disputeResult(resultId, req.jwtUser.id, reason);
      
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  });

  // POST /api/competitive-challenges/:id/referee - Referee resolves dispute (admin only)
  router.post("/:id/referee", async (req: any, res, next) => {
    try {
      if (!req.jwtUser) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // TODO: Check if user is admin/moderator
      
      const { resultId, decision } = req.body;
      
      // Update result with referee decision
      await challengesRepo.updateResult(resultId, {
        refereeId: req.jwtUser.id,
        status: decision === 'confirm' ? 'confirmed' : 'rejected',
      });

      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  });

  return router;
}
