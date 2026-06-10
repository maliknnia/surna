// Stage 4: Real-Time Features & WebSocket Stress Test
import autocannon from 'autocannon';
import { WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runRealtimeTests() {
  console.log('⚡ Starting Stage 4: Real-Time Features Performance Tests');
  console.log('=' .repeat(60));

  const baseUrl = 'http://localhost:5000';
  const wsUrl = 'ws://localhost:5000/ws';
  const testResults = [];

  // Test 1: WebSocket Connection Stress Test
  console.log('\n🔌 Test 1: WebSocket Connection Stress Test');
  const connectionResults = await stressTestWebSocketConnections(wsUrl);
  testResults.push({
    test: 'websocket_connections',
    ...connectionResults
  });

  // Test 2: Real-time Message Broadcasting
  console.log('\n📨 Test 2: Real-time Message Broadcasting Performance');
  const messageResults = await stressTestMessageBroadcasting(wsUrl);
  testResults.push({
    test: 'message_broadcasting',
    ...messageResults
  });

  // Test 3: Notification API Performance
  console.log('\n📬 Test 3: Notification API Performance');
  const notificationResults = await autocannon({
    url: `${baseUrl}/api/notifications`,
    connections: 10,
    pipelining: 1,
    duration: 10,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer demo-token',
      'User-Agent': 'Stage4-Test'
    }
  });

  console.log(`Notification API: ${notificationResults.requests.average} RPS`);
  console.log(`Notification Latency: ${notificationResults.latency.average}ms avg`);
  
  testResults.push({
    test: 'notification_api',
    rps: notificationResults.requests.average,
    latency: notificationResults.latency.average
  });

  // Test 4: Real-time Stats Endpoint
  console.log('\n📊 Test 4: Real-time Stats Performance');
  const statsResults = await autocannon({
    url: `${baseUrl}/api/realtime/stats`,
    connections: 10,
    pipelining: 1,
    duration: 10,
    headers: {
      'User-Agent': 'Stage4-Test'
    }
  });

  console.log(`Stats Endpoint: ${statsResults.requests.average} RPS`);
  console.log(`Stats Latency: ${statsResults.latency.average}ms avg`);
  
  testResults.push({
    test: 'realtime_stats',
    rps: statsResults.requests.average,
    latency: statsResults.latency.average
  });

  // Test 5: Concurrent Event Broadcasting
  console.log('\n🏆 Test 5: Concurrent Event Broadcasting');
  const eventResults = await stressTestEventBroadcasting(baseUrl);
  testResults.push({
    test: 'event_broadcasting',
    ...eventResults
  });

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = path.join(__dirname, `stage4_results_${timestamp}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Stage 4 Test Results Summary:');
  console.log('=' .repeat(60));
  
  testResults.forEach(result => {
    if (result.connections) {
      console.log(`📊 ${result.test}: ${result.connections} connections, ${result.messageLatency}ms avg message time`);
    } else if (result.rps) {
      console.log(`📊 ${result.test}: ${result.rps} RPS, ${result.latency}ms latency`);
    }
  });

  console.log(`\n💾 Results saved to: ${resultsFile}`);
  
  return testResults;
}

// WebSocket connection stress test
async function stressTestWebSocketConnections(wsUrl) {
  const maxConnections = 100;
  const connections = [];
  const connectionTimes = [];
  const messageTimes = [];

  console.log(`Attempting to establish ${maxConnections} WebSocket connections...`);

  return new Promise((resolve) => {
    let connectedCount = 0;
    let testMessages = 0;
    const startTime = Date.now();

    for (let i = 0; i < maxConnections; i++) {
      const ws = new WebSocket(wsUrl, {
        headers: {
          'authorization': 'Bearer demo-token',
          'user-id': `test-user-${i}`
        }
      });

      connections.push(ws);

      ws.on('open', () => {
        connectedCount++;
        connectionTimes.push(Date.now() - startTime);

        // Send a test message
        const messageStart = Date.now();
        ws.send(JSON.stringify({
          type: 'sendMessage',
          data: {
            type: 'event',
            eventId: 'test-event-1',
            content: `Test message from connection ${i}`,
            timestamp: new Date()
          }
        }));

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'messageAck' || message.type === 'newMessage') {
              messageTimes.push(Date.now() - messageStart);
              testMessages++;
            }
          } catch (e) {
            // Ignore parse errors
          }
        });

        // Close connection after test
        if (connectedCount === maxConnections) {
          setTimeout(() => {
            connections.forEach(conn => {
              if (conn.readyState === WebSocket.OPEN) {
                conn.close();
              }
            });

            const avgConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
            const avgMessageTime = messageTimes.length > 0 ? 
              messageTimes.reduce((a, b) => a + b, 0) / messageTimes.length : 0;

            resolve({
              connections: connectedCount,
              connectionLatency: avgConnectionTime,
              messageLatency: avgMessageTime,
              messagesProcessed: testMessages
            });
          }, 2000);
        }
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error on connection ${i}:`, error.message);
      });
    }

    // Timeout after 10 seconds
    setTimeout(() => {
      const avgConnectionTime = connectionTimes.length > 0 ? 
        connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length : 0;
      const avgMessageTime = messageTimes.length > 0 ? 
        messageTimes.reduce((a, b) => a + b, 0) / messageTimes.length : 0;

      resolve({
        connections: connectedCount,
        connectionLatency: avgConnectionTime,
        messageLatency: avgMessageTime,
        messagesProcessed: testMessages
      });
    }, 10000);
  });
}

// Message broadcasting stress test
async function stressTestMessageBroadcasting(wsUrl) {
  const connections = [];
  const messageCount = 50;
  const connectionCount = 20;

  console.log(`Testing message broadcasting with ${connectionCount} connections...`);

  return new Promise((resolve) => {
    let connectedCount = 0;
    let messagesReceived = 0;
    const messageTimes = [];

    // Create connections
    for (let i = 0; i < connectionCount; i++) {
      const ws = new WebSocket(wsUrl, {
        headers: {
          'authorization': 'Bearer demo-token',
          'user-id': `broadcast-test-${i}`
        }
      });

      connections.push(ws);

      ws.on('open', () => {
        connectedCount++;

        // Join a test event room
        ws.send(JSON.stringify({
          type: 'joinEvent',
          eventId: 'broadcast-test-event'
        }));

        if (connectedCount === connectionCount) {
          // Start broadcasting messages
          setTimeout(() => {
            startBroadcastTest(connections, messageCount, messageTimes, () => {
              connections.forEach(conn => {
                if (conn.readyState === WebSocket.OPEN) {
                  conn.close();
                }
              });

              const avgLatency = messageTimes.length > 0 ? 
                messageTimes.reduce((a, b) => a + b, 0) / messageTimes.length : 0;

              resolve({
                connections: connectionCount,
                messagesBroadcast: messageCount,
                messagesReceived: messagesReceived,
                broadcastLatency: avgLatency
              });
            });
          }, 1000);
        }
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'newMessage') {
            messagesReceived++;
            messageTimes.push(Date.now() - message.timestamp);
          }
        } catch (e) {
          // Ignore parse errors
        }
      });

      ws.on('error', (error) => {
        console.error(`Broadcast WebSocket error:`, error.message);
      });
    }
  });
}

// Start broadcast test
function startBroadcastTest(connections, messageCount, messageTimes, callback) {
  let messagesSent = 0;

  const sendInterval = setInterval(() => {
    if (messagesSent >= messageCount) {
      clearInterval(sendInterval);
      setTimeout(callback, 1000); // Wait for messages to propagate
      return;
    }

    const sender = connections[0]; // Use first connection as sender
    if (sender.readyState === WebSocket.OPEN) {
      const messageStart = Date.now();
      sender.send(JSON.stringify({
        type: 'sendMessage',
        data: {
          type: 'event',
          eventId: 'broadcast-test-event',
          content: `Broadcast test message ${messagesSent}`,
          timestamp: messageStart
        }
      }));
      messagesSent++;
    }
  }, 100); // Send message every 100ms
}

// Event broadcasting stress test
async function stressTestEventBroadcasting(baseUrl) {
  console.log('Testing event broadcasting API...');

  const results = await autocannon({
    url: `${baseUrl}/api/realtime/broadcast`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer demo-token'
    },
    body: JSON.stringify({
      type: 'score',
      eventId: 'test-event-1',
      data: {
        homeScore: 2,
        awayScore: 1,
        quarter: 3
      }
    }),
    connections: 10,
    pipelining: 1,
    duration: 5
  });

  return {
    rps: results.requests.average,
    latency: results.latency.average,
    errors: results.errors
  };
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runRealtimeTests().catch(console.error);
}

export { runRealtimeTests };