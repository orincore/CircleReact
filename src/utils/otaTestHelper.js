/**
 * OTA Update Test Helper
 * Utilities for testing the complete OTA update flow
 */

import { otaUpdateService } from '../services/otaUpdateService';

/**
 * Test the complete OTA update flow end-to-end
 */
export async function testCompleteUpdateFlow() {
  console.log('🧪 Starting complete OTA update flow test...');
  
  try {
    // 1. Get current status
    console.log('📊 Step 1: Getting current update status...');
    const initialStatus = await otaUpdateService.getUpdateStatus();
    console.log('Initial status:', {
      isInitialized: initialStatus.isInitialized,
      otaAvailable: initialStatus.otaAvailable,
      isUpdateAvailable: initialStatus.isUpdateAvailable,
      currentUpdateId: initialStatus.currentUpdateId?.substring(0, 8),
      platform: initialStatus.platform,
      runtimeVersion: initialStatus.runtimeVersion,
    });

    // 2. Test update check
    console.log('🔍 Step 2: Testing update check...');
    await otaUpdateService.forceCheckForUpdates();
    
    // 3. Get status after check
    console.log('📊 Step 3: Getting status after update check...');
    const postCheckStatus = await otaUpdateService.getUpdateStatus();
    console.log('Post-check status:', {
      isUpdateAvailable: postCheckStatus.isUpdateAvailable,
      lastCheckTime: new Date(postCheckStatus.lastCheckTime).toLocaleTimeString(),
      retryCount: postCheckStatus.retryCount,
    });

    // 4. Test diagnostic info
    console.log('🔧 Step 4: Testing diagnostic information...');
    const diagnosticInfo = await otaUpdateService.getDiagnosticInfo();
    console.log('Diagnostic summary:', {
      healthy: diagnosticInfo.summary?.healthy,
      issues: diagnosticInfo.summary?.issues?.length || 0,
      recommendations: diagnosticInfo.summary?.recommendations?.length || 0,
      recentActivity: diagnosticInfo.history?.logs?.[0]?.activity || 'None',
    });

    // 5. Test network connectivity
    console.log('🌐 Step 5: Testing network connectivity...');
    const networkInfo = await otaUpdateService.testNetworkConnectivity();
    console.log('Network test:', {
      connected: networkInfo.connected,
      responseTime: networkInfo.responseTime,
      status: networkInfo.status || networkInfo.error,
    });

    console.log('✅ Complete OTA update flow test completed successfully!');
    
    return {
      success: true,
      initialStatus,
      postCheckStatus,
      diagnosticInfo,
      networkInfo,
      summary: {
        otaAvailable: initialStatus.otaAvailable,
        updateAvailable: postCheckStatus.isUpdateAvailable,
        networkConnected: networkInfo.connected,
        systemHealthy: diagnosticInfo.summary?.healthy,
        issuesFound: diagnosticInfo.summary?.issues?.length || 0,
      }
    };
  } catch (error) {
    console.error('❌ OTA update flow test failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
    };
  }
}

/**
 * Test update notification system
 */
export async function testUpdateNotificationSystem() {
  console.log('🧪 Testing update notification system...');
  
  try {
    let notificationReceived = false;
    let receivedUpdateInfo = null;
    
    // Set up test notification handler
    const testHandler = (updateInfo) => {
      console.log('📱 Test notification handler called with:', updateInfo);
      notificationReceived = true;
      receivedUpdateInfo = updateInfo;
    };
    
    // Install test handler
    otaUpdateService.setUpdateNotificationHandler(testHandler);
    
    // Simulate update prompt (this would normally be called when an update is available)
    await otaUpdateService.promptUserForUpdate({
      id: 'test-update-id',
      runtimeVersion: '1.0.0',
      launchAsset: {
        size: 1024 * 1024 * 2, // 2MB
      }
    });
    
    console.log('✅ Update notification system test completed');
    
    return {
      success: true,
      notificationReceived,
      receivedUpdateInfo,
    };
  } catch (error) {
    console.error('❌ Update notification system test failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Comprehensive test suite
 */
export async function runComprehensiveOTATests() {
  console.log('🚀 Running comprehensive OTA update tests...');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
  };
  
  try {
    // Test 1: Complete update flow
    console.log('\n--- Test 1: Complete Update Flow ---');
    results.tests.completeFlow = await testCompleteUpdateFlow();
    
    // Test 2: Notification system
    console.log('\n--- Test 2: Notification System ---');
    results.tests.notificationSystem = await testUpdateNotificationSystem();
    
    // Summary
    const allTestsPassed = Object.values(results.tests).every(test => test.success);
    results.summary = {
      allTestsPassed,
      totalTests: Object.keys(results.tests).length,
      passedTests: Object.values(results.tests).filter(test => test.success).length,
      failedTests: Object.values(results.tests).filter(test => !test.success).length,
    };
    
    console.log('\n📊 Test Summary:', results.summary);
    
    if (allTestsPassed) {
      console.log('🎉 All OTA update tests passed!');
    } else {
      console.log('⚠️ Some OTA update tests failed. Check the results for details.');
    }
    
    return results;
  } catch (error) {
    console.error('❌ Comprehensive OTA test suite failed:', error);
    results.error = error.message;
    results.summary = { allTestsPassed: false };
    return results;
  }
}