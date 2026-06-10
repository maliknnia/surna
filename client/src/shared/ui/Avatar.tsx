import { forwardRef, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  ring?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

const iconSizes = {
  sm: 14,
  md: 18,
  lg: 24,
  xl: 32,
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, size = 'md', fallback, ring = false, ...props }, ref) => {
    const hasImage = !!src;
    
    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-full overflow-hidden flex-shrink-0',
          sizeClasses[size],
          ring && 'ring-2 ring-white/30',
          className
        )}
      >
        {hasImage ? (
          <img
            src={src}
            alt={alt || ''}
            className="w-full h-full object-cover"
            {...props}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-600 to-neutral-800 flex items-center justify-center text-white font-semibold">
            {fallback ? (
              <span className="text-xs">{fallback.charAt(0).toUpperCase()}</span>
            ) : (
              <User size={iconSizes[size]} />
            )}
          </div>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';
