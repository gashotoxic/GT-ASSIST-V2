import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { AuthProvider } from './context/AuthContext';
import { CreditProvider } from './context/CreditContext';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  root.render(
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <h1 className="text-xl font-semibold mb-2">Missing Clerk Configuration</h1>
        <p className="text-sm text-slate-600">
          Set VITE_CLERK_PUBLISHABLE_KEY in your deployment environment and redeploy.
        </p>
      </div>
    </div>
  );
} else {
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <AuthProvider>
          <CreditProvider>
            <App />
          </CreditProvider>
        </AuthProvider>
      </ClerkProvider>
    </React.StrictMode>
  );
}
