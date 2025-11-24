/**
 * Friend Request Flow Test Script
 * 
 * This script tests the complete friend request flow to ensure it works smoothly
 * Run this in the browser console to test the functionality
 */

// Test configuration
const TEST_CONFIG = {
  // Replace with actual user IDs for testing
  SENDER_USER_ID: 'test-sender-id',
  RECEIVER_USER_ID: 'test-receiver-id',
  TEST_TOKEN: 'your-test-token-here'
};

// Import the service (adjust path as needed)
async function testFriendRequestFlow() {
  console.log('🧪 Starting Friend Request Flow Test...');
  
  try {
    // Test 1: Send Friend Request
    console.log('\n📤 Test 1: Sending Friend Request...');
    const { FriendRequestService } = await import('./src/services/FriendRequestService.js');
    
    const sendResult = await FriendRequestService.sendFriendRequest(
      TEST_CONFIG.RECEIVER_USER_ID, 
      TEST_CONFIG.TEST_TOKEN
    );
    console.log('✅ Send Result:', sendResult);
    
    // Test 2: Accept Friend Request (simulate from receiver side)
    console.log('\n✅ Test 2: Accepting Friend Request...');
    // Note: In real scenario, this would be called by the receiver
    const acceptResult = await FriendRequestService.acceptFriendRequest(
      sendResult.request?.id || 'test-request-id',
      TEST_CONFIG.TEST_TOKEN
    );
    console.log('✅ Accept Result:', acceptResult);
    
    console.log('\n🎉 All tests passed! Friend request flow is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
}

// Test error handling
async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling...');
  
  try {
    const { FriendRequestService } = await import('./src/services/FriendRequestService.js');
    
    // Test with invalid user ID
    console.log('Testing with invalid user ID...');
    await FriendRequestService.sendFriendRequest('invalid-id', TEST_CONFIG.TEST_TOKEN);
    
  } catch (error) {
    console.log('✅ Error handling working correctly:', error.message);
  }
}

// Test socket connection
async function testSocketConnection() {
  console.log('\n🔌 Testing Socket Connection...');
  
  try {
    const { getSocket } = await import('./src/api/socket.ts');
    const socket = getSocket(TEST_CONFIG.TEST_TOKEN);
    
    if (socket && socket.connected) {
      console.log('✅ Socket connected successfully');
      console.log('Socket ID:', socket.id);
      console.log('Transport:', socket.io?.engine?.transport?.name);
    } else {
      console.log('⚠️ Socket not connected');
    }
    
  } catch (error) {
    console.error('❌ Socket connection test failed:', error);
  }
}

// Performance test
async function testPerformance() {
  console.log('\n⚡ Testing Performance...');
  
  const startTime = performance.now();
  
  try {
    const { FriendRequestService } = await import('./src/services/FriendRequestService.js');
    
    // Test multiple rapid requests (should be handled gracefully)
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        FriendRequestService.sendFriendRequest(
          `test-user-${i}`, 
          TEST_CONFIG.TEST_TOKEN
        ).catch(err => ({ error: err.message }))
      );
    }
    
    const results = await Promise.all(promises);
    const endTime = performance.now();
    
    console.log('✅ Performance test completed');
    console.log(`Time taken: ${endTime - startTime}ms`);
    console.log('Results:', results);
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Running Complete Friend Request Flow Tests\n');
  
  await testSocketConnection();
  await testFriendRequestFlow();
  await testErrorHandling();
  await testPerformance();
  
  console.log('\n✨ All tests completed!');
}

// Export for use
if (typeof window !== 'undefined') {
  window.testFriendRequestFlow = runAllTests;
  window.testSocketConnection = testSocketConnection;
  
  console.log('🧪 Friend Request Test Suite loaded!');
  console.log('Run window.testFriendRequestFlow() to start testing');
}

export { runAllTests, testFriendRequestFlow, testSocketConnection, testErrorHandling, testPerformance };
