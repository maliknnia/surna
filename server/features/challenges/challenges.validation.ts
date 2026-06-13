// server/features/challenges/challenges.validation.ts
import { z } from "zod";

export const createMatchSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['solo', 'player1v1', 'teamVsTeam', 'open']),
  sport: z.string().min(1),
  opponentType: z.enum(['user', 'team']).optional(),
  opponentId: z.string().optional(),
  hostTeamId: z.string().optional(),
  rules: z.string().optional(),
  visibility: z.enum(['public', 'private', 'invite']).default('public'),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
    private: z.boolean().optional(),
  }).optional(),
  timeStart: z.string().optional(),
  timeEnd: z.string().optional(),
  entryFee: z.object({
    amount: z.number(),
    currency: z.enum(['EUR', 'USD', 'GBP']),
  }).optional(),
  reward: z.enum(['xp', 'badge', 'cash', 'none']).default('xp'),
  capacity: z.number().optional(),
});

export const updateMatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  rules: z.string().optional(),
  timeStart: z.string().optional(),
  timeEnd: z.string().optional(),
  status: z.enum(['draft', 'pending', 'invited', 'accepted', 'live', 'completed', 'disputed', 'cancelled']).optional(),
});

export const reportResultSchema = z.object({
  hostScore: z.number().optional(),
  guestScore: z.number().optional(),
  outcome: z.enum(['hostWin', 'guestWin', 'draw', 'forfeit']),
  stats: z.record(z.number()).optional(),
  attachments: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const matchQuerySchema = z.object({
  type: z.enum(['solo', 'player1v1', 'teamVsTeam', 'open']).optional(),
  sport: z.string().optional(),
  status: z.string().optional(),
  mine: z.string().optional(),
  userId: z.string().optional(), // Package #10: filter by participant user
  teamId: z.string().optional(), // Package #10: filter by participant team
  near: z.string().optional(),
  limit: z.string().optional(),
});

export const leaderboardQuerySchema = z.object({
  scope: z.enum(['user', 'team']).default('user'),
  sport: z.string().optional(),
  range: z.enum(['week', 'month', 'all']).default('all'),
  limit: z.string().optional(),
});
