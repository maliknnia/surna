import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
}

const variantClasses = {
  default: 'bg-white/10 text-white/70',
  accent: 'bg-white/15 text-white/80',
  success: 'bg-white/15 text-white/80',
  warning: 'bg-[#3A3A3A] text-white/70',
  error: 'bg-[#3A3A3A] text-white/70',
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-[9px]',
  md: 'px-2 py-1 text-[10px]',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-full',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
