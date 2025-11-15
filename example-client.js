/**
 * Example WebSocket client to send notifications to the Electron app
 * Run this with: node example-client.js
 */

const WebSocket = require('ws');

// Connect to the notification server
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', function open() {
  console.log('✅ Connected to Sanches Notification Server');
  
  // Send initial notification
  sendNotification('Connection Established', 'Successfully connected to the notification server!');
  
  // Send a notification every 10 seconds (demo)
  let counter = 1;
  const interval = setInterval(() => {
    sendNotification(
      `Notification #${counter}`,
      `This is automated notification number ${counter} sent at ${new Date().toLocaleTimeString()}`
    );
    counter++;
    
    // Stop after 5 notifications
    if (counter > 5) {
      clearInterval(interval);
      console.log('\n✅ Demo completed! Sent 5 notifications.');
      console.log('Press Ctrl+C to exit, or wait for more manual notifications...\n');
    }
  }, 10000);
});

ws.on('message', function message(data) {
  const response = JSON.parse(data.toString());
  console.log('📨 Received from server:', response);
});

ws.on('close', function close() {
  console.log('❌ Disconnected from server');
  process.exit(0);
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
  console.log('\n💡 Make sure the Electron app is running first!');
  console.log('   Run: npm run dev\n');
  process.exit(1);
});

// Helper function to send notifications
function sendNotification(title, body, options = {}) {
  const message = {
    type: 'notification',
    title,
    body,
    options
  };
  
  ws.send(JSON.stringify(message));
  console.log(`🔔 Sent notification: "${title}"`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Closing connection...');
  ws.close();
});

console.log('🚀 Starting WebSocket client...');
console.log('📡 Connecting to ws://localhost:8080...\n');

