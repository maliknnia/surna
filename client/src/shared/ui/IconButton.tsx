import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'filled' | 'outline';
  iconSize?: number;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
};

const variantClasses = {
  ghost: 'hover:bg-white/5 light-theme:hover:bg-black/5',
  filled: 'bg-white/10 hover:bg-white/20 light-theme:bg-black/5 light-theme:hover:bg-black/10',
  outline: 'border border-white/20 hover:border-white/40 light-theme:border-black/20 light-theme:hover:border-black/40',
};

const defaultIconSizes = {
  sm: 16,
  md: 18,
  lg: 22,
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, icon: Icon, size = 'md', variant = 'ghost', iconSize, ...props }, ref) => {
    const finalIconSize = iconSize ?? defaultIconSizes[size];
    
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full transition-colors',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        <Icon size={finalIconSize} className="text-white/60 light-theme:text-black/60" />
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';
