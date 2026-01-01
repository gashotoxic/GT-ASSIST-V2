import React from 'react';
import { Button } from './UI';
import { useCredits } from '../context/CreditContext';
import { useAuthContext } from '../context/AuthContext';
import { LogIn } from 'lucide-react';

interface CreditAwareButtonProps {
  action: 'chat' | 'image' | 'video' | 'edit';
  model: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'icon';
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'glass';
  onRequestAuth?: () => void;
}

export function CreditAwareButton({
  action,
  model,
  onClick,
  children,
  className,
  disabled = false,
  size = 'md',
  variant = 'primary',
  onRequestAuth
}: CreditAwareButtonProps) {
  const { userId } = useAuthContext();
  const { credits, subscriptionTier, loading, canAfford } = useCredits();

  if (loading) {
    return <Button disabled className={className} size={size || 'md'} variant={variant || 'primary'}>Loading...</Button>;
  }

  if (!userId) {
    return (
      <Button
        variant="primary"
        size={size === 'icon' ? 'icon' : (size || 'md')}
        onClick={() => {
          if (onRequestAuth) {
            onRequestAuth();
          } else {
            // Trigger auth modal via custom event fallback
            window.dispatchEvent(new CustomEvent('request-auth', { detail: { mode: 'signin' } }));
          }
        }}
        className={size === 'icon'
          ? `rounded-full shadow-md shadow-primary/20 ${className}`
          : `whitespace-nowrap min-w-max px-4 font-bold uppercase tracking-tight text-[10px] h-8 rounded-full shadow-md shadow-primary/20 ${className}`
        }
        title="Sign In"
      >
        {size === 'icon' ? <LogIn className="w-4 h-4 ml-0.5" /> : "Sign In"}
      </Button>
    );
  }

  const canUse = canAfford(action, model);

  if (!canUse) {
    return (
      <Button
        variant="destructive"
        onClick={() => {
          // Navigate to pricing page or show upgrade modal
          window.location.href = '/#pricing';
        }}
        className={className}
        size={size || 'md'}
      >
        {children} (Need Credits)
      </Button>
    );
  }

  return (
    <Button
      onClick={onClick}
      className={className}
      disabled={disabled}
      size={size || 'md'}
      variant={variant || 'primary'}
    >
      {children}
    </Button>
  );
}
