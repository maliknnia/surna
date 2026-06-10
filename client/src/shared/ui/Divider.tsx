import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white/5 light-theme:bg-black/5',
          orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
          className
        )}
        {...props}
      />
    );
  }
);
Divider.displayName = 'Divider';
