import { SignIn, SignUp } from '@clerk/clerk-react';
import { X, Sparkles } from 'lucide-react';

interface AuthModalProps {
  mode: 'signin' | 'signup';
  isOpen: boolean;
  onClose: () => void;
  onModeChange?: (mode: 'signin' | 'signup') => void;
}

export function AuthModal({ mode, isOpen, onClose, onModeChange }: AuthModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full filter blur-[80px] opacity-60 animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full filter blur-[80px] opacity-60 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full filter blur-[100px] opacity-40 animate-pulse" />
      </div>

      {/* Modal Content - Glassmorphism Card */}
      <div className="relative w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        {/* Glass card */}
        <div className="relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-3xl border border-white/50 dark:border-white/10 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_40px_100px_-10px_rgba(0,0,0,0.7)] overflow-hidden">

          {/* Header with gradient accent */}
          <div className="relative px-8 pt-8 pb-4">
            {/* Decorative gradient line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Logo/Icon */}
            <div className="flex justify-center mb-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:-translate-y-1 transition-transform duration-300">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white tracking-tight">
              {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2">
              {mode === 'signin'
                ? 'Sign in to access your AI assistant'
                : 'Join GT Assistant and start creating'}
            </p>
          </div>

          {/* Clerk Forms Container */}
          <div className="px-6 pb-6">
            <div className="bg-white/50 dark:bg-slate-800/30 rounded-2xl p-4 border border-white/40 dark:border-white/5 shadow-inner">
              {mode === 'signin' ? (
                <SignIn
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      card: 'bg-transparent shadow-none border-none p-0',
                      headerTitle: 'hidden',
                      headerSubtitle: 'hidden',
                      socialButtonsBlockButton: 'bg-white/80 dark:bg-slate-800/80 border border-gray-200/50 dark:border-white/10 hover:bg-white dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 backdrop-blur-sm rounded-xl transition-all duration-200 hover:shadow-md',
                      socialButtonsBlockButtonText: 'font-medium',
                      dividerLine: 'bg-gray-200 dark:bg-white/10',
                      dividerText: 'text-gray-400 dark:text-gray-500 text-xs',
                      formFieldLabel: 'text-gray-700 dark:text-gray-300 font-medium text-sm',
                      formFieldInput: 'bg-white/60 dark:bg-slate-900/40 border-gray-200/60 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary backdrop-blur-sm transition-all duration-200',
                      formButtonPrimary: 'bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-0.5',
                      footerActionLink: 'text-primary hover:text-primary-dark font-medium transition-colors',
                      identityPreviewEditButton: 'text-primary hover:text-primary-dark',
                      formFieldInputShowPasswordButton: 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200',
                    }
                  }}
                />
              ) : (
                <SignUp
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      card: 'bg-transparent shadow-none border-none p-0',
                      headerTitle: 'hidden',
                      headerSubtitle: 'hidden',
                      socialButtonsBlockButton: 'bg-white/80 dark:bg-slate-800/80 border border-gray-200/50 dark:border-white/10 hover:bg-white dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 backdrop-blur-sm rounded-xl transition-all duration-200 hover:shadow-md',
                      socialButtonsBlockButtonText: 'font-medium',
                      dividerLine: 'bg-gray-200 dark:bg-white/10',
                      dividerText: 'text-gray-400 dark:text-gray-500 text-xs',
                      formFieldLabel: 'text-gray-700 dark:text-gray-300 font-medium text-sm',
                      formFieldInput: 'bg-white/60 dark:bg-slate-900/40 border-gray-200/60 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary backdrop-blur-sm transition-all duration-200',
                      formButtonPrimary: 'bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-0.5',
                      footerActionLink: 'text-primary hover:text-primary-dark font-medium transition-colors',
                      formFieldInputShowPasswordButton: 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200',
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Footer with mode toggle */}
          <div className="px-8 pb-6 pt-2 text-center border-t border-gray-200/30 dark:border-white/5">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => onModeChange?.(mode === 'signin' ? 'signup' : 'signin')}
                className="text-primary hover:text-primary-dark font-semibold transition-colors hover:underline"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Decorative ring effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/10 to-blue-500/20 rounded-3xl blur-lg opacity-50 -z-10" />
      </div>
    </div>
  );
}