import React from 'react';
import { Button } from './UI';
import { useCredits } from '../context/CreditContext';
import { useAuthContext } from '../context/AuthContext';

interface CreditAwareButtonProps {
  action: 'chat' | 'image' | 'video' | 'edit';
  model: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'icon';
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'glass';
}

export function CreditAwareButton({
  action,
  model,
  onClick,
  children,
  className,
  disabled = false,
  size = 'md',
  variant = 'primary'
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
        size={size === 'icon' ? 'md' : (size || 'md')}
        onClick={() => {
          // Trigger auth modal via custom event
          window.dispatchEvent(new CustomEvent('request-auth', { detail: { mode: 'signin' } }));
        }}
        className={`whitespace-nowrap min-w-max px-4 font-bold uppercase tracking-tight text-[10px] h-8 rounded-full shadow-md shadow-primary/20 ${className}`}
      >
        Sign In
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