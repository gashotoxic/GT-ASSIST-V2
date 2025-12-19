import React, { useState, useRef, useEffect } from 'react';
import { Copy, Edit3, RefreshCw, GitBranch, MoreVertical, Check } from 'lucide-react';
import { Button, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './UI';
import { Message } from '../types';

interface MessageActionsProps {
  message: Message;
  onCopy?: () => void;
  onEdit?: () => void;
  onRetry?: () => void;
  onBranch?: () => void;
  disabled?: boolean;
  className?: string;
}

export function MessageActions({ 
  message, 
  onCopy, 
  onEdit, 
  onRetry, 
  onBranch,
  disabled = false,
  className = ''
}: MessageActionsProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');

  const handleCopy = async () => {
    if (copyState === 'copying') return;
    
    setCopyState('copying');
    
    try {
      let textToCopy = '';
      
      if (typeof message.content === 'string') {
        textToCopy = message.content;
      } else if (Array.isArray(message.content)) {
        // Handle structured content (e.g., with images)
        textToCopy = message.content
          .filter(part => part.type === 'text')
          .map(part => part.text)
          .join('\n');
      }
      
      await navigator.clipboard.writeText(textToCopy);
      setCopyState('copied');
      
      // Reset after 2 seconds
      setTimeout(() => setCopyState('idle'), 2000);
      
      onCopy?.();
    } catch (error) {
      console.error('Failed to copy message:', error);
      setCopyState('idle');
    }
  };

  const canEdit = message.role === 'user';
  const canRetry = message.role === 'user';

  return (
    <div className={`message-actions opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
            disabled={disabled}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Copy Message - Always available */}
          <DropdownMenuItem onClick={handleCopy}>
            {copyState === 'copied' ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                {copyState === 'copying' ? 'Copying...' : 'Copy Message'}
              </>
            )}
          </DropdownMenuItem>
          
          {/* Edit Message - Only for user messages */}
          {canEdit && onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit Message
            </DropdownMenuItem>
          )}
          
          {/* Retry Message - Only for user messages */}
          {canRetry && onRetry && (
            <DropdownMenuItem onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Message
            </DropdownMenuItem>
          )}

          {/* Create Branch - Always available */}
          {onBranch && (
            <DropdownMenuItem onClick={onBranch}>
              <GitBranch className="mr-2 h-4 w-4" />
              Create Branch
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Simple copy button for inline use
export function CopyButton({ 
  content, 
  className = '',
  size = 'sm' 
}: { 
  content: string | any[]; 
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'icon';
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');

  const handleCopy = async () => {
    if (copyState === 'copying') return;
    
    setCopyState('copying');
    
    try {
      let textToCopy = '';
      
      if (typeof content === 'string') {
        textToCopy = content;
      } else if (Array.isArray(content)) {
        textToCopy = content
          .filter(part => part.type === 'text')
          .map(part => part.text)
          .join('\n');
      }
      
      await navigator.clipboard.writeText(textToCopy);
      setCopyState('copied');
      
      // Reset after 2 seconds
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setCopyState('idle');
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleCopy}
      className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${className}`}
      disabled={copyState === 'copying'}
    >
      {copyState === 'copied' ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}

// Toast notification for copy feedback
export function CopyToast({ 
  show, 
  message = 'Copied to clipboard!' 
}: { 
  show: boolean; 
  message?: string;
}) {
  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <Check className="h-4 w-4" />
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}