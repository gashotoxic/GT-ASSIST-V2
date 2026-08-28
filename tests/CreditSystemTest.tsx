import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useCredits } from '../context/CreditContext';
import { SupabaseService } from '../services/supabase';
import { AppSettings } from '../types';

/**
 * Credit System Test Component
 * 
 * This component validates the complete credit system flow:
 * 1. User authentication → Supabase sync with 10 credits
 * 2. Credit deduction on API calls
 * 3. Real-time credit updates via subscription
 * 4. Data persistence in Supabase
 */
export const CreditSystemTest: React.FC = () => {
  const { userId, isSignedIn, user } = useAuthContext();
  const { credits, subscriptionTier, loading, canAfford, refetch } = useCredits();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const addTestResult = (test: string, passed: boolean, details?: string) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const result = `${status} ${test}${details ? ` - ${details}` : ''}`;
    setTestResults(prev => [...prev, result]);
    console.log(result);
  };

  const runCreditSystemTests = async () => {
    if (!isSignedIn || !userId) {
      addTestResult('User Authentication', false, 'User not signed in');
      return;
    }

    setIsRunningTests(true);
    setTestResults([]);

    // Initialize Supabase service for testing
    const settings: AppSettings = {
      useSupabase: true,
      supabaseUrl: (import.meta.env.VITE_APP_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL)!,
      supabaseKey: (import.meta.env.VITE_APP_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_KEY)!,
      apiKey: '',
      model: 'zai-org/GLM-5.2-TEE',
      systemPrompt: '',
      ttsVoice: 'af_heart',
      ttsSpeed: 1.0,
      searchProvider: 'tavily'
    };
    const supabaseService = new SupabaseService(settings, null);

    try {
      // Test 1: User Profile Creation/Sync
      addTestResult('Starting Credit System Tests', true, `User: ${user?.primaryEmailAddress?.emailAddress}`);
      
      try {
        const profile = await supabaseService.getUserProfile(userId);
        const hasCredits = profile.credits > 0;
        addTestResult('User Profile Sync', hasCredits, 
          `Credits: ${profile.credits}, Tier: ${profile.subscription_tier}`);
      } catch (error) {
        addTestResult('User Profile Sync', false, `Error: ${error}`);
      }

      // Test 2: Credit Availability Check
      try {
        const canAffordChat = await supabaseService.checkCreditAvailability(userId, 1);
        addTestResult('Credit Availability Check', canAffordChat, 
          `Can afford 1 credit: ${canAffordChat}`);
      } catch (error) {
        addTestResult('Credit Availability Check', false, `Error: ${error}`);
      }

      // Test 3: Credit Deduction
      try {
        const initialCredits = credits;
        const result = await supabaseService.useCredits(userId, 1, 'chat', 'zai-org/GLM-5.2-TEE');
        
        if (result.success) {
          addTestResult('Credit Deduction', true, 
            `Deducted 1 credit, New balance: ${result.new_balance}`);
          
          // Wait for real-time update
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const updatedCredits = await supabaseService.getUserProfile(userId);
          const creditsChanged = updatedCredits.credits < initialCredits;
          addTestResult('Credit Database Update', creditsChanged,
            `Before: ${initialCredits}, After: ${updatedCredits.credits}`);
        } else {
          addTestResult('Credit Deduction', false, result.message);
        }
      } catch (error) {
        addTestResult('Credit Deduction', false, `Error: ${error}`);
      }

      // Test 4: Real-time Subscription
      try {
        let subscriptionReceived = false;
        const channel = supabaseService.subscribeToCredits(userId, (newCredits) => {
          subscriptionReceived = true;
          addTestResult('Real-time Subscription', true, `Received update: ${newCredits}`);
        });

        // Trigger a credit change to test subscription
        await supabaseService.useCredits(userId, 1, 'chat', 'test-subscription');
        
        // Wait for subscription
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        if (!subscriptionReceived) {
          addTestResult('Real-time Subscription', false, 'No subscription update received');
        }
        
        await supabaseService.removeChannel(channel);
      } catch (error) {
        addTestResult('Real-time Subscription', false, `Error: ${error}`);
      }

      // Test 5: Chat Message Saving
      try {
        const testMessage = {
          id: Date.now().toString(),
          role: 'user' as const,
          content: 'Test message for credit system validation',
          timestamp: Date.now()
        };
        
        const sessionId = localStorage.getItem('chutes_current_session_id') || 'test-session';
        const messageId = await supabaseService.saveMessage(testMessage, sessionId, userId);
        
        if (messageId) {
          addTestResult('Chat Message Saving', true, `Message saved with ID: ${messageId}`);
        } else {
          addTestResult('Chat Message Saving', false, 'Failed to save message');
        }
      } catch (error) {
        addTestResult('Chat Message Saving', false, `Error: ${error}`);
      }

      // Test 6: Media History (if available)
      try {
        const sessionId = localStorage.getItem('chutes_current_session_id') || 'test-session';
        const mediaHistory = await supabaseService.getMediaHistory(sessionId);
        addTestResult('Media History Access', true, 
          `Found ${mediaHistory.length} media items`);
      } catch (error) {
        addTestResult('Media History Access', false, `Error: ${error}`);
      }

      addTestResult('Credit System Tests Complete', true);

    } catch (error) {
      addTestResult('Test Suite Error', false, `Unexpected error: ${error}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Credit System Test Suite</h2>
        
        {/* User Status */}
        <div className="mb-6 p-4 bg-gray-100 dark:bg-slate-700 rounded">
          <h3 className="font-semibold mb-2">User Status:</h3>
          <div className="space-y-1 text-sm">
            <div>Signed In: {isSignedIn ? '✅ Yes' : '❌ No'}</div>
            <div>User ID: {userId || 'Not available'}</div>
            <div>Email: {user?.primaryEmailAddress?.emailAddress || 'Not available'}</div>
            <div>Credits: {loading ? 'Loading...' : credits}</div>
            <div>Tier: {subscriptionTier}</div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="mb-6">
          <button
            onClick={runCreditSystemTests}
            disabled={isRunningTests || !isSignedIn}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
          >
            {isRunningTests ? 'Running Tests...' : 'Run Credit System Tests'}
          </button>
          <button
            onClick={() => setTestResults([])}
            className="ml-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Results
          </button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Test Results:</h3>
            <div className="bg-gray-50 dark:bg-slate-900 rounded p-4 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono py-1">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expected Flow Documentation */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
          <h3 className="font-semibold mb-2">Expected Flow:</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>User Signs In (Clerk)</li>
            <li>AuthContext auto-syncs to Supabase (10 free credits)</li>
            <li>App.tsx creates SupabaseService with app's DB (always on)</li>
            <li>ChatInterface/MediaStudio save to Supabase with user_id</li>
            <li>Credit deduction happens in database</li>
            <li>UserProfile shows real-time credit updates via subscription</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default CreditSystemTest;
