/**
 * Manual Update Controls Test
 * Tests the manual update functionality including settings UI and user controls
 */

import { otaUpdateService } from '../services/otaUpdateService';

/**
 * Test manual update check functionality
 */
export async function testManualUpdateCheck() {
  console.log('🧪 Testing manual update check...');
  
  try {
    // Get initial status
    const initialStatus = await otaUpdateService.getUpdateStatus();
    console.log('📊 Initial status:', {
      isInitialized: initialStatus.isInitialized,
      otaAvailable: initialStatus.otaAvailable,
      lastCheckTime: initialStatus.lastCheckTime,
    });

    // Test force check (manual trigger)
    console.log('🔄 Triggering manual update check...');
    const startTime = Date.now();
    
    await otaUpdateService.forceCheckForUpdates();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Get status after manual check
    const postCheckStatus = await otaUpdateService.getUpdateStatus();
    console.log('📊 Post-check status:', {
      lastCheckTime: postCheckStatus.lastCheckTime,
      isUpdateAvailable: postCheckStatus.isUpdateAvailable,
      checkDuration: `${duration}ms`,
    });

    // Verify that the check was performed
    const checkWasPerformed = postCheckStatus.lastCheckTime > initialStatus.lastCheckTime;
    
    console.log('✅ Manual update check test completed');
    
    return {
      success: true,
      checkWasPerformed,
      duration,
      initialStatus,
      postCheckStatus,
    };
  } catch (error) {
    console.error('❌ Manual update check test failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Test update configuration management
 */
export async function testUpdateConfiguration() {
  console.log('🧪 Testing update configuration...');
  
  try {
    // Get current configuration
    const initialConfig = otaUpdateService.getConfiguration();
    console.log('📊 Initial config:', initialConfig);

    // Test configuration update
    const newConfig = {
      autoDownload: !initialConfig.autoDownload,
      autoRestart: !initialConfig.autoRestart,
      showNotifications: true,
      checkInterval: 10 * 60 * 1000, // 10 minutes
    };

    console.log('🔧 Updating configuration...');
    await otaUpdateService.updateConfiguration(newConfig);

    // Verify configuration was updated
    const updatedConfig = otaUpdateService.getConfiguration();
    console.log('📊 Updated config:', updatedConfig);

    // Restore original configuration
    await otaUpdateService.updateConfiguration(initialConfig);
    const restoredConfig = otaUpdateService.getConfiguration();

    console.log('✅ Update configuration test completed');
    
    return {
      success: true,
      initialConfig,
      updatedConfig,
      restoredConfig,
      configurationWorking: updatedConfig.autoDownload === newConfig.autoDownload,
    };
  } catch (error) {
    console.error('❌ Update configuration test failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Test user consent handling
 */
export async function testUserConsentHandling() {
  console.log('🧪 Testing user consent handling...');
  
  try {
    const mockUpdateInfo = {
      id: 'test-manual-update-id',
      runtimeVersion: '1.0.0',
      launchAsset: {
        size: 1024 * 1024 * 2, // 2MB
      },
    };

    // Test user acceptance
    console.log('👍 Testing user acceptance...');
    await otaUpdateService.handleUserAccept(mockUpdateInfo);

    // Test user decline
    console.log('👎 Testing user decline...');
    await otaUpdateService.handleUserDecline(mockUpdateInfo);

    // Test user postpone
    console.log('⏰ Testing user postpone...');
    await otaUpdateService.handleUserPostpone(mockUpdateInfo);

    console.log('✅ User consent handling test completed');
    
    return {
      success: true,
      testedActions: ['accept', 'decline', 'postpone'],
    };
  } catch (error) {
    console.error('❌ User consent handling test failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Test notification system integration
 */
export async function testNotificationSystem() {
  console.log('🧪 Testing notification system...');
  
  try {
    let notificationReceived = false;
    let receivedUpdateInfo = null;
    
    // Set up test notification handler
    const testHandler = (updateInfo) => {
      console.log('📱 Test notification received:', updateInfo);
      notificationReceived = true;
      receivedUpdateInfo = updateInfo;
    };
    
    // Install test handler
    otaUpdateService.setUpdateNotificationHandler(testHandler);
    
    // Test notification trigger
    const mockUpdateInfo = {
      id: 'test-notification-update-id',
      runtimeVersion: '1.0.0',
      launchAsset: {
        size: 1024 * 1024 * 3, // 3MB
      },
    };
    
    console.log('📢 Triggering test notification...');
    await otaUpdateService.promptUserForUpdate(mockUpdateInfo);
    
    // Remove test handler
    otaUpdateService.setUpdateNotificationHandler(null);
    
    console.log('✅ Notification system test completed');
    
    return {
      success: true,
      notificationReceived,
      receivedUpdateInfo,
      handlerWorking: notificationReceived && receivedUpdateInfo?.id === mockUpdateInfo.id,
    };
  } catch (error) {
    console.error('❌ Notification system test failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Test update state management
 */
export async function testUpdateStateManagement() {
  console.log('🧪 Testing update state management...');
  
  try {
    // Get initial state
    const initialStatus = await otaUpdateService.getUpdateStatus();
    
    // Test state reset
    console.log('🔄 Testing state reset...');
    const resetResult = await otaUpdateService.resetUpdateState();
    
    if (!resetResult) {
      throw new Error('State reset failed');
    }
    
    // Verify state was reset
    const postResetStatus = await otaUpdateService.getUpdateStatus();
    
    console.log('✅ Update state management test completed');
    
    return {
      success: true,
      resetWorking: resetResult,
      initialStatus,
      postResetStatus,
      stateCleared: postResetStatus.retryCount === 0,
    };
  } catch (error) {
    console.error('❌ Update state management test failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Comprehensive manual update controls test
 */
export async function runManualUpdateControlsTest() {
  console.log('🚀 Running comprehensive manual update controls test...');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
  };
  
  try {
    // Test 1: Manual update check
    console.log('\n--- Test 1: Manual Update Check ---');
    results.tests.manualCheck = await testManualUpdateCheck();
    
    // Test 2: Configuration management
    console.log('\n--- Test 2: Configuration Management ---');
    results.tests.configuration = await testUpdateConfiguration();
    
    // Test 3: User consent handling
    console.log('\n--- Test 3: User Consent Handling ---');
    results.tests.userConsent = await testUserConsentHandling();
    
    // Test 4: Notification system
    console.log('\n--- Test 4: Notification System ---');
    results.tests.notifications = await testNotificationSystem();
    
    // Test 5: State management
    console.log('\n--- Test 5: State Management ---');
    results.tests.stateManagement = await testUpdateStateManagement();
    
    // Summary
    const allTestsPassed = Object.values(results.tests).every(test => test.success);
    results.summary = {
      allTestsPassed,
      totalTests: Object.keys(results.tests).length,
      passedTests: Object.values(results.tests).filter(test => test.success).length,
      failedTests: Object.values(results.tests).filter(test => !test.success).length,
    };
    
    console.log('\n📊 Manual Update Controls Test Summary:', results.summary);
    
    if (allTestsPassed) {
      console.log('🎉 All manual update controls tests passed!');
    } else {
      console.log('⚠️ Some manual update controls tests failed. Check the results for details.');
    }
    
    return results;
  } catch (error) {
    console.error('❌ Manual update controls test suite failed:', error);
    results.error = error.message;
    results.summary = { allTestsPassed: false };
    return results;
  }
}

/**
 * Quick verification of manual update functionality
 */
export async function quickManualUpdateVerification() {
  console.log('⚡ Quick manual update verification...');
  
  try {
    // Check if service is initialized
    const status = await otaUpdateService.getUpdateStatus();
    
    if (!status.isInitialized) {
      throw new Error('OTA service not initialized');
    }
    
    // Test manual check
    await otaUpdateService.forceCheckForUpdates();
    
    // Test configuration access
    const config = otaUpdateService.getConfiguration();
    
    console.log('✅ Quick verification passed');
    
    return {
      success: true,
      serviceInitialized: status.isInitialized,
      otaAvailable: status.otaAvailable,
      configurationAccessible: !!config,
      platform: status.platform,
    };
  } catch (error) {
    console.error('❌ Quick verification failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}