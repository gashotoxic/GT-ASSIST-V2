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

  const clerkAppearance = {
    layout: {
      socialButtonsPlacement: 'top' as const,
      socialButtonsVariant: 'blockButton' as const,
    },
    variables: {
      colorPrimary: '#0ea5e9', // Sky 500
      colorText: 'white',
      colorBackground: 'transparent',
      colorInputBackground: 'rgba(255, 255, 255, 0.1)',
      colorInputText: 'white',
      borderRadius: '0.75rem',
    },
    elements: {
      rootBox: 'w-full flex justify-center',
      card: 'bg-transparent shadow-none border-none p-0 w-full max-w-full',
      cardBox: 'w-full',
      headerTitle: 'hidden',
      headerSubtitle: 'hidden',
      socialButtonsBlockButton:
        'bg-white/5 border border-white/10 hover:bg-white/10 text-white backdrop-blur-md transition-all duration-300 h-10',
      socialButtonsBlockButtonText: 'font-medium text-white/90',
      socialButtonsBlockButtonArrow: 'text-white/50',
      dividerLine: 'bg-white/10',
      dividerText: 'text-white/40 font-medium',
      formFieldLabel: 'text-white/70 font-medium ml-1 mb-1.5',
      formFieldInput:
        'bg-black/20 border border-white/10 text-white placeholder:text-white/20 rounded-xl focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300 h-11',
      formButtonPrimary:
        'bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary border-none text-white font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 h-11',
      footer: 'hidden', // Hide default footer to use our custom one
      formFieldInputShowPasswordButton: 'text-white/50 hover:text-white',
      identityPreviewEditButton: 'text-primary hover:text-primary-light',
      formFieldSuccessText: 'text-green-400',
      formFieldErrorText: 'text-red-400',
      alertText: 'text-red-400',
      alert: 'bg-red-500/10 border border-red-500/20 text-red-100',
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Darkened Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Main Container */}
      <div className="relative w-[min(420px,calc(100vw-1.5rem))] animate-in zoom-in-95 slide-in-from-bottom-5 duration-500 overflow-y-auto max-h-[95vh] my-auto">

        {/* Glass Card */}
        <div className="relative bg-slate-900/95 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl ring-1 ring-white/5">

          {/* Header Section */}
          <div className="relative px-4 sm:px-8 pt-6 sm:pt-8 pb-2 text-center">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 sm:right-6 sm:top-6 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 shadow-inner ring-1 ring-white/10 mb-5 group">
              <Sparkles className="w-7 h-7 text-primary group-hover:scale-110 transition-transform duration-500" />
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
              {mode === 'signin' ? 'Welcome Back' : 'Join GashoChat'}
            </h2>
            <p className="text-sm text-white/50">
              {mode === 'signin'
                ? 'Sign in to continue your session'
                : 'Create an account to start generating'}
            </p>
          </div>

          {/* Form Section */}
          <div className="px-3 sm:px-8 pb-6">
            {mode === 'signin' ? (
              <SignIn appearance={clerkAppearance} />
            ) : (
              <SignUp appearance={clerkAppearance} />
            )}
          </div>

          {/* Custom Footer */}
          <div className="px-8 pb-8 pt-2 text-center">
            <p className="text-sm text-white/40">
              {mode === 'signin' ? "New here? " : "Already a member? "}
              <button
                type="button"
                onClick={() => onModeChange?.(mode === 'signin' ? 'signup' : 'signin')}
                className="text-primary hover:text-white font-semibold transition-colors hover:underline decoration-primary/50 underline-offset-4"
              >
                {mode === 'signin' ? 'Create account' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Outer Glow */}
        <div className="absolute -inset-4 bg-primary/20 rounded-[3rem] blur-3xl -z-10 opacity-20 pointer-events-none" />
      </div>
    </div>
  );
}