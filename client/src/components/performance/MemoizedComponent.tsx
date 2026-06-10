// Memoized component utilities for performance optimization
import React, { memo, useCallback, useMemo } from 'react';

// Higher-order component for memoization with custom comparison
export function withMemoization<P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) {
  const MemoizedComponent = memo(Component, areEqual);
  MemoizedComponent.displayName = `Memoized(${Component.displayName || Component.name})`;
  return MemoizedComponent;
}

// Shallow comparison for props
export function shallowEqual(obj1: any, obj2: any): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}

// Custom hook for stable callbacks
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

// Custom hook for stable values
export function useStableValue<T>(value: T, equalityFn?: (a: T, b: T) => boolean): T {
  return useMemo(() => value, [value, equalityFn]);
}

// Performance-optimized list item component
interface ListItemProps {
  id: string | number;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  onClick?: (id: string | number) => void;
  isSelected?: boolean;
  className?: string;
}

export const MemoizedListItem = memo(function ListItem({
  id,
  title,
  subtitle,
  imageUrl,
  onClick,
  isSelected,
  className
}: ListItemProps) {
  const handleClick = useCallback(() => {
    onClick?.(id);
  }, [onClick, id]);

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
        ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'}
        ${className || ''}
      `}
      onClick={handleClick}
      data-testid={`list-item-${id}`}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{title}</h3>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {isSelected && (
        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.id === nextProps.id &&
    prevProps.title === nextProps.title &&
    prevProps.subtitle === nextProps.subtitle &&
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.className === nextProps.className &&
    prevProps.onClick === nextProps.onClick
  );
});

// Performance-optimized card component
interface CardProps {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  badge?: string;
  onAction?: (id: string, action: string) => void;
  isLoading?: boolean;
}

export const MemoizedCard = memo(function Card({
  id,
  title,
  description,
  imageUrl,
  badge,
  onAction,
  isLoading
}: CardProps) {
  const handleAction = useCallback((action: string) => {
    onAction?.(id, action);
  }, [onAction, id]);

  if (isLoading) {
    return (
      <div className="bg-transparent border border-border rounded-lg p-4 animate-pulse" data-testid={`card-loading-${id}`}>
        <div className="w-full h-32 bg-muted rounded mb-3" />
        <div className="w-3/4 h-4 bg-muted rounded mb-2" />
        <div className="w-1/2 h-3 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="bg-transparent border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow" data-testid={`card-${id}`}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="w-full h-32 object-cover"
          loading="lazy"
        />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold truncate">{title}</h3>
          {badge && (
            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs flex-shrink-0 ml-2">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {description}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('view')}
            className="flex-1 px-3 py-1 text-sm bg-background rounded hover:bg-muted transition-colors"
          >
            View
          </button>
          <button
            onClick={() => handleAction('share')}
            className="px-3 py-1 text-sm bg-background rounded hover:bg-muted transition-colors"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
});