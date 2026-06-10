import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon: Icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center py-12 px-4 text-center',
          className
        )}
        {...props}
      >
        {Icon && (
          <div className="w-12 h-12 rounded-full bg-white/10 light-theme:bg-black/5 flex items-center justify-center mb-4">
            <Icon size={24} className="text-white/40 light-theme:text-black/40" />
          </div>
        )}
        <h3 className="text-sm font-semibold text-white/80 light-theme:text-black/80 mb-1">{title}</h3>
        {description && (
          <p className="text-xs text-white/50 light-theme:text-black/50 max-w-xs">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }
);
EmptyState.displayName = 'EmptyState';
