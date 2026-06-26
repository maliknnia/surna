import autocannon from "autocannon";

const BASE = process.env.LOADTEST_BASE_URL || "http://localhost:5000";
const CONNECTIONS = Number(process.env.LOADTEST_CONNECTIONS || 50);
const DURATION = Number(process.env.LOADTEST_DURATION || 20);

function summarize(label, result) {
  console.log(`📈 ${label}:`);
  console.log(`- Requests/sec: ${Math.round(result.requests.average)}`);
  console.log(`- Latency (avg): ${Math.round(result.latency.average)}ms`);
  console.log(`- Latency (p99): ${Math.round(result.latency.p99)}ms`);
  console.log(`- Errors: ${result.errors}`);
  return result.errors === 0;
}

console.log("🚀 SURNA Stage 1 Performance Load Test");
console.log("=====================================");
console.log(`Base: ${BASE} | connections: ${CONNECTIONS} | duration: ${DURATION}s`);

let allOk = true;

console.log("\n📊 Testing Feed Endpoint Performance...");
const feedResult = await autocannon({
  url: `${BASE}/api/posts?page=1&limit=20`,
  connections: CONNECTIONS,
  duration: DURATION,
  headers: { Cookie: "connect.sid=test-session" },
});
allOk = summarize("Feed Results", feedResult) && allOk;

console.log("\n👥 Testing Teams Endpoint Performance...");
const teamsResult = await autocannon({
  url: `${BASE}/api/teams?page=1&limit=20`,
  connections: CONNECTIONS,
  duration: DURATION,
});
allOk = summarize("Teams Results", teamsResult) && allOk;

console.log("\n🏆 Testing Events Endpoint Performance...");
const eventsResult = await autocannon({
  url: `${BASE}/api/events?page=1&limit=20`,
  connections: CONNECTIONS,
  duration: DURATION,
  headers: { Cookie: "connect.sid=test-session" },
});
allOk = summarize("Events Results", eventsResult) && allOk;

console.log("\n🔥 Testing Cached Hashtags Endpoint Performance...");
const hashtagsResult = await autocannon({
  url: `${BASE}/api/hashtags/trending`,
  connections: CONNECTIONS,
  duration: DURATION,
});
allOk = summarize("Hashtags Results (cached)", hashtagsResult) && allOk;

console.log("\n✅ Load Testing Complete!");
if (!allOk) {
  console.error("❌ One or more scenarios reported errors.");
  process.exit(1);
}
