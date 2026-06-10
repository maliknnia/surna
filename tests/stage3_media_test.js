// Stage 3: Media Handling Performance Test
import autocannon from 'autocannon';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMediaTests() {
  console.log('🎬 Starting Stage 3: Media Handling Performance Tests');
  console.log('=' .repeat(60));
  
  const baseUrl = 'http://localhost:5000';
  
  // Test 1: Media upload endpoint performance
  console.log('\n📤 Test 1: Media Upload Endpoint Performance');
  const uploadResult = await autocannon({
    url: `${baseUrl}/api/media/upload`,
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    connections: 5, // Lower for upload tests
    duration: 10,
    title: 'Media Upload Performance'
  });
  
  console.log(`Upload Performance: ${uploadResult.requests.average} RPS`);
  console.log(`Upload Latency: ${uploadResult.latency.average}ms avg`);
  
  // Test 2: Media processing status checks
  console.log('\n🔍 Test 2: Processing Status Endpoint');
  const statusResult = await autocannon({
    url: `${baseUrl}/api/media/jobs`,
    connections: 20,
    duration: 15,
    title: 'Media Jobs Status'
  });
  
  console.log(`Status Check: ${statusResult.requests.average} RPS`);
  console.log(`Status Latency: ${statusResult.latency.average}ms avg`);
  
  // Test 3: Static media serving performance
  console.log('\n🖼️ Test 3: Media Serving Performance');
  const servingResult = await autocannon({
    url: `${baseUrl}/public-objects/test.jpg`,
    connections: 50,
    duration: 15,
    title: 'Media Serving Performance'
  });
  
  console.log(`Media Serving: ${servingResult.requests.average} RPS`);
  console.log(`Serving Latency: ${servingResult.latency.average}ms avg`);
  
  // Test 4: Media optimization endpoint
  console.log('\n⚡ Test 4: Media Optimization Performance');
  const optimizeResult = await autocannon({
    url: `${baseUrl}/api/media/optimize`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mediaUrl: '/test-image.jpg',
      width: 800,
      height: 600
    }),
    connections: 10,
    duration: 10,
    title: 'Media Optimization'
  });
  
  console.log(`Optimization: ${optimizeResult.requests.average} RPS`);
  console.log(`Optimization Latency: ${optimizeResult.latency.average}ms avg`);
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('🎬 STAGE 3 MEDIA HANDLING RESULTS');
  console.log('=' .repeat(60));
  
  const results = {
    upload: {
      rps: uploadResult.requests.average,
      latency: uploadResult.latency.average,
      target: '> 10 RPS',
      passed: uploadResult.requests.average > 10
    },
    status: {
      rps: statusResult.requests.average,
      latency: statusResult.latency.average,
      target: '> 500 RPS',
      passed: statusResult.requests.average > 500
    },
    serving: {
      rps: servingResult.requests.average,
      latency: servingResult.latency.average,
      target: '> 1000 RPS',
      passed: servingResult.requests.average > 1000
    },
    optimization: {
      rps: optimizeResult.requests.average,
      latency: optimizeResult.latency.average,
      target: '> 50 RPS',
      passed: optimizeResult.requests.average > 50
    }
  };
  
  console.log(`📤 Upload Performance: ${results.upload.rps.toFixed(0)} RPS (${results.upload.latency.toFixed(0)}ms) - ${results.upload.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🔍 Status Checks: ${results.status.rps.toFixed(0)} RPS (${results.status.latency.toFixed(0)}ms) - ${results.status.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🖼️ Media Serving: ${results.serving.rps.toFixed(0)} RPS (${results.serving.latency.toFixed(0)}ms) - ${results.serving.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`⚡ Optimization: ${results.optimization.rps.toFixed(0)} RPS (${results.optimization.latency.toFixed(0)}ms) - ${results.optimization.passed ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r.passed);
  console.log(`\n🎯 Overall Stage 3 Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  // Save results
  const timestamp = new Date().toISOString();
  const testResults = {
    stage: 'Stage 3: Media Handling',
    timestamp,
    results,
    summary: {
      allPassed,
      totalTests: Object.keys(results).length,
      passedTests: Object.values(results).filter(r => r.passed).length
    }
  };
  
  fs.writeFileSync(
    path.join(__dirname, `stage3_results_${Date.now()}.json`),
    JSON.stringify(testResults, null, 2)
  );
  
  console.log('\n📊 Results saved to stage3_results_*.json');
  
  return testResults;
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runMediaTests().catch(console.error);
}

export { runMediaTests };