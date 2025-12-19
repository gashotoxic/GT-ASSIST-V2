import { SignIn, SignUp } from '@clerk/clerk-react';
import { Modal } from './UI';

interface AuthModalProps {
  mode: 'signin' | 'signup';
  isOpen: boolean;
  onClose: () => void;
  onModeChange?: (mode: 'signin' | 'signup') => void;
}

export function AuthModal({ mode, isOpen, onClose, onModeChange }: AuthModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={true} onClose={onClose} title={mode === 'signin' ? 'Sign In' : 'Sign Up'}>
      {mode === 'signin' ? <SignIn /> : <SignUp />}
    </Modal>
  );
}