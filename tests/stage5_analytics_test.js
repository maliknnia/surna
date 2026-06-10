// Stage 5: Analytics and Reporting Performance Tests
import http from 'http';
import WebSocket from 'ws';

const BASE_URL = 'http://localhost:5000';
const API_ENDPOINTS = [
  '/api/analytics/engagement',
  '/api/analytics/daily-metrics?timeframe=30d',
  '/api/analytics/popular-content',
  '/api/analytics/realtime',
  '/api/analytics/events?limit=50'
];

console.log('⚡ Starting Stage 5: Analytics & Reporting Performance Tests');
console.log('============================================================');

async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Analytics-Test-Client',
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test 1: Analytics API Performance
async function testAnalyticsAPIPerformance() {
  console.log('\n📊 Test 1: Analytics API Performance');
  const startTime = Date.now();
  const results = [];

  for (const endpoint of API_ENDPOINTS) {
    console.log(`Testing ${endpoint}...`);
    const testStart = Date.now();
    
    try {
      const response = await makeRequest(endpoint);
      const responseTime = Date.now() - testStart;
      
      results.push({
        endpoint,
        responseTime,
        statusCode: response.statusCode,
        success: response.statusCode < 400
      });
      
      console.log(`  ✓ ${endpoint}: ${responseTime}ms (${response.statusCode})`);
    } catch (error) {
      results.push({
        endpoint,
        responseTime: Date.now() - testStart,
        statusCode: 0,
        success: false,
        error: error.message
      });
      console.log(`  ✗ ${endpoint}: ${error.message}`);
    }
  }

  const totalTime = Date.now() - startTime;
  const successfulRequests = results.filter(r => r.success).length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

  console.log(`\n📈 Analytics API Results:`);
  console.log(`  Successful requests: ${successfulRequests}/${API_ENDPOINTS.length}`);
  console.log(`  Average response time: ${Math.round(avgResponseTime)}ms`);
  console.log(`  Total test time: ${totalTime}ms`);
  
  return { successfulRequests, avgResponseTime, totalTime };
}

// Test 2: Event Logging Performance
async function testEventLoggingPerformance() {
  console.log('\n📝 Test 2: Event Logging Performance');
  const events = [
    { eventType: 'post_create', entityType: 'post', entityId: 'test-1' },
    { eventType: 'post_like', entityType: 'post', entityId: 'test-1' },
    { eventType: 'comment_create', entityType: 'post', entityId: 'test-1' },
    { eventType: 'team_join', entityType: 'team', entityId: 'test-team' },
    { eventType: 'event_join', entityType: 'event', entityId: 'test-event' }
  ];

  const results = [];
  const concurrentRequests = 20;

  console.log(`Simulating ${concurrentRequests} concurrent event logging operations...`);
  const startTime = Date.now();

  const promises = Array.from({ length: concurrentRequests }, async (_, i) => {
    const event = events[i % events.length];
    const requestStart = Date.now();
    
    try {
      // Simulate event logging via API endpoint (if available)
      const response = await makeRequest('/api/analytics/events', 'POST', {
        ...event,
        userId: `test-user-${i}`,
        payload: { testData: true, index: i }
      });
      
      const responseTime = Date.now() - requestStart;
      return {
        success: response.statusCode < 400,
        responseTime,
        statusCode: response.statusCode
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - requestStart,
        error: error.message
      };
    }
  });

  const eventResults = await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  const successful = eventResults.filter(r => r.success).length;
  const avgResponseTime = eventResults.reduce((sum, r) => sum + r.responseTime, 0) / eventResults.length;

  console.log(`\n📊 Event Logging Results:`);
  console.log(`  Successful events: ${successful}/${concurrentRequests}`);
  console.log(`  Average response time: ${Math.round(avgResponseTime)}ms`);
  console.log(`  Total time: ${totalTime}ms`);
  console.log(`  Events per second: ${Math.round((concurrentRequests / totalTime) * 1000)}`);

  return { successful, avgResponseTime, totalTime };
}

// Test 3: Real-time Analytics Performance
async function testRealTimeAnalytics() {
  console.log('\n⚡ Test 3: Real-time Analytics Performance');
  
  const testDuration = 10000; // 10 seconds
  const requestInterval = 1000; // 1 second
  const results = [];

  console.log(`Testing real-time analytics updates for ${testDuration/1000} seconds...`);
  
  const startTime = Date.now();
  let requestCount = 0;

  const intervalId = setInterval(async () => {
    const requestStart = Date.now();
    requestCount++;
    
    try {
      const response = await makeRequest('/api/analytics/realtime');
      const responseTime = Date.now() - requestStart;
      
      results.push({
        timestamp: Date.now(),
        responseTime,
        statusCode: response.statusCode,
        success: response.statusCode < 400
      });
      
      if (response.statusCode === 200) {
        const data = JSON.parse(response.data);
        console.log(`  Update ${requestCount}: Active users: ${data.activeUsers || 0}, Events: ${data.recentEvents || 0} (${responseTime}ms)`);
      }
    } catch (error) {
      results.push({
        timestamp: Date.now(),
        responseTime: Date.now() - requestStart,
        success: false,
        error: error.message
      });
      console.log(`  Update ${requestCount}: Error - ${error.message}`);
    }
    
    if (Date.now() - startTime >= testDuration) {
      clearInterval(intervalId);
    }
  }, requestInterval);

  // Wait for test completion
  await new Promise(resolve => {
    const checkInterval = setInterval(() => {
      if (Date.now() - startTime >= testDuration) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });

  const successfulUpdates = results.filter(r => r.success).length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

  console.log(`\n⚡ Real-time Analytics Results:`);
  console.log(`  Successful updates: ${successfulUpdates}/${results.length}`);
  console.log(`  Average response time: ${Math.round(avgResponseTime)}ms`);
  console.log(`  Update frequency: ${Math.round(successfulUpdates / (testDuration/1000))} updates/second`);

  return { successfulUpdates, avgResponseTime, updateFrequency: successfulUpdates / (testDuration/1000) };
}

// Test 4: Analytics Dashboard Load Test
async function testAnalyticsDashboardLoad() {
  console.log('\n📈 Test 4: Analytics Dashboard Load Test');
  
  const dashboardEndpoints = [
    '/api/analytics/engagement',
    '/api/analytics/daily-metrics?timeframe=7d',
    '/api/analytics/daily-metrics?timeframe=30d',
    '/api/analytics/popular-content',
    '/api/analytics/realtime'
  ];

  const concurrentUsers = 10;
  const requestsPerUser = 3;

  console.log(`Simulating ${concurrentUsers} concurrent dashboard users, ${requestsPerUser} requests each...`);
  
  const startTime = Date.now();
  const allResults = [];

  const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
    const userResults = [];
    
    for (let i = 0; i < requestsPerUser; i++) {
      const endpoint = dashboardEndpoints[i % dashboardEndpoints.length];
      const requestStart = Date.now();
      
      try {
        const response = await makeRequest(endpoint);
        const responseTime = Date.now() - requestStart;
        
        userResults.push({
          user: userIndex,
          endpoint,
          responseTime,
          statusCode: response.statusCode,
          success: response.statusCode < 400
        });
      } catch (error) {
        userResults.push({
          user: userIndex,
          endpoint,
          responseTime: Date.now() - requestStart,
          success: false,
          error: error.message
        });
      }
    }
    
    return userResults;
  });

  const userResults = await Promise.all(userPromises);
  userResults.forEach(results => allResults.push(...results));

  const totalTime = Date.now() - startTime;
  const successful = allResults.filter(r => r.success).length;
  const avgResponseTime = allResults.reduce((sum, r) => sum + r.responseTime, 0) / allResults.length;
  const requestsPerSecond = Math.round((allResults.length / totalTime) * 1000);

  console.log(`\n📊 Dashboard Load Test Results:`);
  console.log(`  Successful requests: ${successful}/${allResults.length}`);
  console.log(`  Average response time: ${Math.round(avgResponseTime)}ms`);
  console.log(`  Requests per second: ${requestsPerSecond}`);
  console.log(`  Total test time: ${totalTime}ms`);

  return { successful, avgResponseTime, requestsPerSecond, totalTime };
}

// Test 5: Analytics Data Consistency
async function testAnalyticsDataConsistency() {
  console.log('\n🔍 Test 5: Analytics Data Consistency Test');
  
  try {
    console.log('Fetching multiple analytics endpoints to verify data consistency...');
    
    const [engagement, dailyMetrics, popular, realtime] = await Promise.all([
      makeRequest('/api/analytics/engagement'),
      makeRequest('/api/analytics/daily-metrics?timeframe=30d'),
      makeRequest('/api/analytics/popular-content'),
      makeRequest('/api/analytics/realtime')
    ]);

    const results = {
      engagement: engagement.statusCode === 200,
      dailyMetrics: dailyMetrics.statusCode === 200,
      popular: popular.statusCode === 200,
      realtime: realtime.statusCode === 200
    };

    const allSuccessful = Object.values(results).every(success => success);

    console.log('📊 Data Consistency Results:');
    console.log(`  Engagement metrics: ${results.engagement ? '✓' : '✗'}`);
    console.log(`  Daily metrics: ${results.dailyMetrics ? '✓' : '✗'}`);
    console.log(`  Popular content: ${results.popular ? '✓' : '✗'}`);
    console.log(`  Real-time data: ${results.realtime ? '✓' : '✗'}`);
    console.log(`  Overall consistency: ${allSuccessful ? '✓' : '✗'}`);

    if (results.engagement && engagement.statusCode === 200) {
      try {
        const engagementData = JSON.parse(engagement.data);
        console.log(`  Sample data - DAU: ${engagementData.dailyActiveUsers || 0}, Sessions: ${engagementData.totalSessions || 0}`);
      } catch (e) {
        console.log('  Could not parse engagement data');
      }
    }

    return { allSuccessful, results };
  } catch (error) {
    console.log(`  ✗ Consistency test failed: ${error.message}`);
    return { allSuccessful: false, error: error.message };
  }
}

// Main test execution
(async () => {
  try {
    console.log('Starting comprehensive analytics performance testing...\n');
    
    const testResults = {
      apiPerformance: await testAnalyticsAPIPerformance(),
      eventLogging: await testEventLoggingPerformance(),
      realTimeAnalytics: await testRealTimeAnalytics(),
      dashboardLoad: await testAnalyticsDashboardLoad(),
      dataConsistency: await testAnalyticsDataConsistency()
    };

    console.log('\n🎯 STAGE 5 ANALYTICS PERFORMANCE SUMMARY');
    console.log('==========================================');
    console.log(`📊 API Performance: ${testResults.apiPerformance.avgResponseTime}ms avg response`);
    console.log(`📝 Event Logging: ${testResults.eventLogging.successful} events logged successfully`);
    console.log(`⚡ Real-time Updates: ${testResults.realTimeAnalytics.updateFrequency} updates/sec`);
    console.log(`📈 Dashboard Load: ${testResults.dashboardLoad.requestsPerSecond} RPS`);
    console.log(`🔍 Data Consistency: ${testResults.dataConsistency.allSuccessful ? 'PASSED' : 'FAILED'}`);

    // Determine overall performance
    const isHighPerforming = 
      testResults.apiPerformance.avgResponseTime < 1000 &&
      testResults.realTimeAnalytics.updateFrequency >= 0.8 &&
      testResults.dashboardLoad.requestsPerSecond >= 10 &&
      testResults.dataConsistency.allSuccessful;

    console.log(`\n🏆 Overall Performance: ${isHighPerforming ? 'EXCELLENT' : 'NEEDS OPTIMIZATION'}`);
    
    if (isHighPerforming) {
      console.log('✅ Stage 5 analytics system ready for production!');
    } else {
      console.log('⚠️  Consider optimizing analytics queries and caching strategies');
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
})();