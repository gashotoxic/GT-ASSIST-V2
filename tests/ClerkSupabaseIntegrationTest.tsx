import React, { useState, useEffect } from 'react';
import { useUserSync } from '../services/userSync';
import { UserButton } from '@clerk/clerk-react';

interface TestResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  timestamp: Date;
}

export default function ClerkSupabaseIntegrationTest() {
  const { syncUser } = useUserSync();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (step: string, status: TestResult['status'], message: string) => {
    setTestResults(prev => [...prev, { step, status, message, timestamp: new Date() }]);
  };

  const runIntegrationTest = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: Mock Clerk user data
      addTestResult('Setup', 'pending', 'Preparing test data...');
      
      const mockClerkUser = {
        id: 'user_36w3Fapt8nVkGFm2Uo4mNIOTRsM', // This is the problematic ID from the error logs
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User'
      };

      addTestResult('Setup', 'success', 'Test user data prepared');

      // Test 2: Try to sync the user (this should fail gracefully now)
      addTestResult('User Sync', 'pending', 'Attempting to sync Clerk user to Supabase...');

      try {
        const result = await syncUser(mockClerkUser);
        
        if (result.success) {
          addTestResult('User Sync', 'success', `User ${mockClerkUser.id} synced successfully`);
        } else {
          // Check if it's the expected UUID error
          if (result.error?.includes('invalid input syntax for type uuid')) {
            addTestResult('User Sync', 'error', `Expected UUID error detected: ${result.error}. This indicates the database functions need to be updated.`);
          } else {
            addTestResult('User Sync', 'error', `Unexpected error: ${result.error}`);
          }
        }
      } catch (error) {
        addTestResult('User Sync', 'error', `Exception during sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      addTestResult('Test Complete', 'success', 'Integration test finished. Check results above.');

    } catch (error) {
      addTestResult('Test Error', 'error', `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Clerk-Supabase Integration Test</h1>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          This test verifies that the Clerk-Supabase integration handles UUID type mismatch errors gracefully.
          The test uses the problematic user ID from the error logs: <code>user_36w3Fapt8nVkGFm2Uo4mNIOTRsM</code>
        </p>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={runIntegrationTest}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? 'Running Test...' : 'Run Integration Test'}
          </button>
          
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Clear Results
          </button>
        </div>
      </div>

      {/* Test Results */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Test Results</h2>
        
        {testResults.length === 0 ? (
          <p className="text-gray-500 italic">No test results yet. Click "Run Integration Test" to start.</p>
        ) : (
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded border-l-4 ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-400'
                    : result.status === 'error'
                    ? 'bg-red-50 border-red-400'
                    : 'bg-yellow-50 border-yellow-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <strong className="block">{result.step}</strong>
                    <p className="text-sm text-gray-700">{result.message}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-800 mb-2">Expected Results</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• If database functions are NOT updated: Should show "Expected UUID error detected"</li>
          <li>• If database functions ARE updated: Should show "User synced successfully"</li>
          <li>• No infinite loops should occur</li>
          <li>• Error handling should be graceful</li>
        </ul>
      </div>

      {/* Authentication Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
        <div className="p-4 border rounded">
          <UserButton />
        </div>
      </div>
    </div>
  );
}