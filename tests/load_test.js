import autocannon from "autocannon";

console.log("🚀 SURNA Stage 1 Performance Load Test");
console.log("=====================================");

// Test 1: Feed endpoint with pagination
console.log("\n📊 Testing Feed Endpoint Performance...");
const feedResult = await autocannon({
  url: "http://localhost:5000/api/posts?page=1&limit=20",
  connections: 50,
  duration: 20,
  headers: {
    'Cookie': 'connect.sid=test-session' // Mock session for testing
  }
});

console.log("📈 Feed Results:");
console.log(`- Requests/sec: ${feedResult.requests.average}`);
console.log(`- Latency (avg): ${feedResult.latency.average}ms`);
console.log(`- Latency (p99): ${feedResult.latency.p99}ms`);

// Test 2: Teams endpoint
console.log("\n👥 Testing Teams Endpoint Performance...");
const teamsResult = await autocannon({
  url: "http://localhost:5000/api/teams?page=1&limit=20",
  connections: 50,
  duration: 20,
  headers: {
    'Cookie': 'connect.sid=test-session'
  }
});

console.log("📈 Teams Results:");
console.log(`- Requests/sec: ${teamsResult.requests.average}`);
console.log(`- Latency (avg): ${teamsResult.latency.average}ms`);
console.log(`- Latency (p99): ${teamsResult.latency.p99}ms`);

// Test 3: Events endpoint
console.log("\n🏆 Testing Events Endpoint Performance...");
const eventsResult = await autocannon({
  url: "http://localhost:5000/api/events?page=1&limit=20",
  connections: 50,
  duration: 20,
  headers: {
    'Cookie': 'connect.sid=test-session'
  }
});

console.log("📈 Events Results:");
console.log(`- Requests/sec: ${eventsResult.requests.average}`);
console.log(`- Latency (avg): ${eventsResult.latency.average}ms`);
console.log(`- Latency (p99): ${eventsResult.latency.p99}ms`);

// Test 4: Trending hashtags (cached endpoint)
console.log("\n🔥 Testing Cached Hashtags Endpoint Performance...");
const hashtagsResult = await autocannon({
  url: "http://localhost:5000/api/hashtags/trending",
  connections: 50,
  duration: 20
});

console.log("📈 Hashtags Results (should be fast due to caching):");
console.log(`- Requests/sec: ${hashtagsResult.requests.average}`);
console.log(`- Latency (avg): ${hashtagsResult.latency.average}ms`);
console.log(`- Latency (p99): ${hashtagsResult.latency.p99}ms`);

console.log("\n✅ Load Testing Complete!");
console.log("🎯 Expected improvements after Stage 1:");
console.log("- Lower latency (< 200ms average)");
console.log("- Higher requests/sec (> 100 req/s)"); 
console.log("- Cached endpoints should be very fast (< 50ms)");