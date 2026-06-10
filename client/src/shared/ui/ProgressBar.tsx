import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'default' | 'gradient';
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2',
};

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value, max = 100, size = 'md', showLabel = false, variant = 'gradient', ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {showLabel && (
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-white/50 light-theme:text-black/50">{value.toLocaleString()}</span>
            <span style={{ color: 'var(--surna-text-secondary)' }}>{Math.round(percentage)}%</span>
          </div>
        )}
        <div className={cn('bg-white/10 light-theme:bg-black/10 rounded-full overflow-hidden', sizeClasses[size])}>
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              'bg-foreground/80'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);
ProgressBar.displayName = 'ProgressBar';
