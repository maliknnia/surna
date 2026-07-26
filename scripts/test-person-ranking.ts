/**
 * Unit checks for person-ranking core (run via: npx tsx scripts/test-person-ranking.ts)
 */
import {
  scoreForPerson,
  freshnessScore,
  engagementScore,
  sportMatches,
} from "../shared/personRanking";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const person = {
  preferredSports: ["Running", "Soccer"],
  locationCity: "Cork",
  followingIds: ["friend-1"],
};

const followedSportNear = scoreForPerson(
  {
    createdAt: new Date(),
    sport: "Running",
    location: "Cork, IE",
    authorId: "friend-1",
    likesCount: 10,
    commentsCount: 2,
    imageUrl: "https://example.com/a.jpg",
  },
  person,
);

const randomOld = scoreForPerson(
  {
    createdAt: new Date(Date.now() - 7 * 24 * 3600_000),
    sport: "Chess",
    location: "Tokyo",
    authorId: "stranger",
    likesCount: 0,
  },
  person,
);

assert(followedSportNear.score > randomOld.score, "affinity+fresh should beat cold old post");
assert(followedSportNear.reasons.includes("following"), "should flag following");
assert(followedSportNear.reasons.includes("your_sport"), "should flag sport");
assert(followedSportNear.reasons.includes("near_you"), "should flag location");
assert(sportMatches("running", ["Running"]), "sport normalize match");
assert(freshnessScore(new Date()) > freshnessScore(new Date(Date.now() - 48 * 3600_000)), "newer fresher");
assert(engagementScore({ likesCount: 100 }) > engagementScore({ likesCount: 1 }), "more likes higher");

console.log("person-ranking ok", {
  top: followedSportNear.score,
  cold: randomOld.score,
  reasons: followedSportNear.reasons,
});
