import { z } from "zod";

const venueAddressSchema = z.object({
  venueName: z.string().max(120).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  townCity: z.string().max(100).optional(),
  county: z.string().max(80).optional(),
  eircode: z.string().max(12).optional(),
  country: z.string().max(80).optional(),
});

export const CreateEvent = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(4000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  locationDetail: venueAddressSchema.optional(),
  visibility: z.enum(["public","private","unlisted"]).default("public"),
  capacity: z.number().int().min(1).optional(),
  coverMediaId: z.string().uuid().optional(),
});

export const UpdateEvent = CreateEvent.partial().extend({
  // Soft-cancel + draft lifecycle. Backed by `events.status` /
  // `events.cancelled_at` columns added by the My Hub migration. Reusing
  // the existing PATCH /api/events/:id flow keeps cancellation in the
  // canonical event endpoint instead of a parallel route.
  status: z.enum(["active", "draft", "cancelled"]).optional(),
});

export const ListQuery = z.object({
  from: z.string().datetime().optional(),           // default: now
  to: z.string().datetime().optional(),             // optional upper bound
  q: z.string().optional(),
  category: z.string().optional(),                  // filter by category
  lat: z.coerce.number().optional(),                // user latitude for distance sorting
  lng: z.coerce.number().optional(),                // user longitude for distance sorting
  cursorStartsAt: z.string().datetime().optional(),
  cursorId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const RSVPBody = z.object({
  status: z.enum(["going","interested","not_going"]).default("going"),
  issueTicket: z.boolean().default(true),
});
