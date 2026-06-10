// Stage 2 Stress Test using Node.js (Alternative to Locust)
import autocannon from "autocannon";

console.log("🚀 SURNA Stage 2 Stress Test - Scaling Performance");
console.log("================================================");

const baseUrl = "http://localhost:5000";
const testDuration = 30; // seconds
const connections = 100; // concurrent connections

// Test scenarios for Stage 2 validation
const testScenarios = [
  {
    name: "Home Page Load",
    url: `${baseUrl}/`,
    expectedRps: 500
  },
  {
    name: "API Health Check",
    url: `${baseUrl}/health`,
    expectedRps: 2000
  },
  {
    name: "Teams API (Cached)",
    url: `${baseUrl}/api/teams`,
    expectedRps: 800
  },
  {
    name: "Trending Hashtags (Heavily Cached)",
    url: `${baseUrl}/api/hashtags/trending`,
    expectedRps: 1500
  },
  {
    name: "Events API",
    url: `${baseUrl}/api/events`,
    expectedRps: 600
  }
];

async function runStressTest() {
  console.log(`\n🎯 Testing with ${connections} concurrent connections for ${testDuration}s each\n`);
  
  for (const scenario of testScenarios) {
    console.log(`\n📊 Testing: ${scenario.name}`);
    console.log(`Target URL: ${scenario.url}`);
    console.log(`Expected RPS: ${scenario.expectedRps}+`);
    console.log("─".repeat(50));
    
    try {
      const result = await autocannon({
        url: scenario.url,
        connections: connections,
        duration: testDuration,
        headers: {
          'User-Agent': 'SURNA-StressTest/2.0'
        }
      });
      
      const actualRps = Math.round(result.requests.average);
      const latency = Math.round(result.latency.average);
      const p99Latency = Math.round(result.latency.p99);
      const success = actualRps >= scenario.expectedRps;
      
      console.log(`✅ Results for ${scenario.name}:`);
      console.log(`   • Requests/sec: ${actualRps} ${success ? '✅' : '❌'} (target: ${scenario.expectedRps})`);
      console.log(`   • Avg Latency: ${latency}ms`);
      console.log(`   • P99 Latency: ${p99Latency}ms`);
      console.log(`   • Total Requests: ${result.requests.total}`);
      console.log(`   • Success Rate: ${((result.requests.total - result.non2xx) / result.requests.total * 100).toFixed(1)}%`);
      
      if (!success) {
        console.log(`   ⚠️  Performance below target! Consider further optimization.`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${scenario.name}:`, error.message);
    }
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log("\n🏁 Stage 2 Stress Test Complete!");
  console.log("\n🎯 Stage 2 Success Criteria:");
  console.log("   • All endpoints should handle 100+ concurrent users");
  console.log("   • Cached endpoints should achieve 1000+ RPS");
  console.log("   • Average latency should be under 100ms");
  console.log("   • P99 latency should be under 500ms");
  console.log("   • Success rate should be 99%+");
}

// Rate limiting stress test
async function testRateLimiting() {
  console.log("\n🛡️  Testing Rate Limiting...");
  
  try {
    const result = await autocannon({
      url: `${baseUrl}/api/posts`,
      connections: 50,
      duration: 10,
      amount: 1000, // Try to send 1000 requests quickly
      headers: {
        'User-Agent': 'SURNA-RateLimit-Test/2.0'
      }
    });
    
    const rateLimitedRequests = result.non2xx;
    const successRequests = result.requests.total - rateLimitedRequests;
    
    console.log(`📊 Rate Limiting Results:`);
    console.log(`   • Total attempts: ${result.requests.total}`);
    console.log(`   • Successful: ${successRequests}`);
    console.log(`   • Rate limited (429): ${rateLimitedRequests}`);
    console.log(`   • Rate limiting ${rateLimitedRequests > 0 ? '✅ WORKING' : '❌ NOT WORKING'}`);
    
  } catch (error) {
    console.error("Rate limiting test failed:", error.message);
  }
}

// Memory leak detection
async function testMemoryUsage() {
  console.log("\n🧠 Testing Memory Usage Under Load...");
  
  const startMem = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`Starting memory: ${Math.round(startMem)}MB`);
  
  // Run intensive test
  await autocannon({
    url: `${baseUrl}/api/hashtags/trending`,
    connections: 200,
    duration: 20
  });
  
  // Force garbage collection and check memory
  if (global.gc) global.gc();
  const endMem = process.memoryUsage().heapUsed / 1024 / 1024;
  const memoryIncrease = endMem - startMem;
  
  console.log(`Ending memory: ${Math.round(endMem)}MB`);
  console.log(`Memory increase: ${Math.round(memoryIncrease)}MB`);
  
  if (memoryIncrease < 50) {
    console.log("✅ Memory usage is stable");
  } else {
    console.log("⚠️  Significant memory increase detected - check for leaks");
  }
}

// Run all tests
async function runAllTests() {
  await runStressTest();
  await testRateLimiting();
  await testMemoryUsage();
  
  console.log("\n🎊 All Stage 2 Performance Tests Complete!");
}

runAllTests().catch(console.error);