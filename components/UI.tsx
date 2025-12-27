import React from 'react';

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none active:scale-95";

  const variants = {
    primary: "bg-primary text-white hover:bg-[#16a085] shadow-lg shadow-primary/25 border border-transparent hover:-translate-y-0.5",
    secondary: "bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700",
    ghost: "hover:bg-primary/10 text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-primary bg-transparent",
    destructive: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-900/30",
    glass: "bg-white/20 dark:bg-slate-800/10 backdrop-blur-xl border border-white/50 dark:border-white/10 text-gray-800 dark:text-gray-200 hover:bg-white/40 dark:hover:bg-slate-700/30 shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 transition-all"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-6 text-base",
    icon: "h-10 w-10 p-2",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Input
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md';
}
export const Input: React.FC<InputProps> = ({ className = '', size = 'md', ...props }) => {
  const sizeClasses = size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm';
  return (
    <input
      className={`flex ${sizeClasses} w-full rounded-lg border border-gray-200/60 dark:border-white/10 bg-white/20 dark:bg-slate-900/20 backdrop-blur-md px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 shadow-inner dark:shadow-black/20 ${className}`}
      {...props}
    />
  )
};

// Textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }
export const Textarea: React.FC<TextareaProps> = ({ className = '', ...props }) => (
  <textarea
    className={`flex min-h-[80px] w-full rounded-lg border border-gray-200/60 dark:border-white/10 bg-white/20 dark:bg-slate-900/20 backdrop-blur-md px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 resize-none shadow-inner dark:shadow-black/20 ${className}`}
    {...props}
  />
);

// Label
export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className = '', ...props }) => (
  <label
    className={`text-sm font-semibold text-gray-700 dark:text-gray-300 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
    {...props}
  />
);

// Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { }
export const Select: React.FC<SelectProps> = ({ className = '', children, ...props }) => (
  <div className="relative">
    <select
      className={`flex h-10 w-full items-center justify-between rounded-lg border border-gray-200/60 dark:border-white/10 bg-white/20 dark:bg-slate-900/20 backdrop-blur-md px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 appearance-none shadow-sm dark:shadow-black/20 [&>option]:bg-white dark:[&>option]:bg-slate-950 dark:[&>option]:text-white ${className}`}
      {...props}
    >
      {children}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
      <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
      </svg>
    </div>
  </div>
);

// Modal/Dialog Overlay
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string }> = ({
  isOpen,
  onClose,
  children,
  title
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_40px_70px_-10px_rgba(0,0,0,0.6)] animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
        <div className="flex flex-col space-y-1.5 p-6 pb-4 border-b border-gray-200/50 dark:border-white/10">
          <h3 className="text-xl font-bold leading-none text-gray-900 dark:text-white tracking-tight">{title}</h3>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {children}
        </div>
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1 text-gray-400 hover:bg-gray-100/50 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
};

// Dropdown Menu Components
export const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative inline-block text-left">
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child, { ...child.props, isOpen, setIsOpen } as any)
          : child
      )}
    </div>
  );
};

export const DropdownMenuTrigger: React.FC<{
  children: React.ReactNode;
  asChild?: boolean;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}> = ({ children, asChild, isOpen, setIsOpen }) => {
  const handleClick = () => {
    setIsOpen?.(!isOpen);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      onClick: handleClick
    } as any);
  }

  return (
    <button onClick={handleClick}>
      {children}
    </button>
  );
};

export const DropdownMenuContent: React.FC<{
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}> = ({ children, align = 'center', className = '', isOpen, setIsOpen }) => {
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setIsOpen?.(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 transform -translate-x-1/2',
    end: 'right-0'
  };

  return (
    <div
      ref={contentRef}
      className={`absolute z-50 mt-2 w-56 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg dark:shadow-black/20 py-1 ${alignmentClasses[align]} ${className}`}
    >
      {children}
    </div>
  );
};

export const DropdownMenuItem: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({ children, onClick, className = '' }) => {
  const handleClick = () => {
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary dark:hover:bg-white/10 transition-colors ${className}`}
    >
      {children}
    </button>
  );
};