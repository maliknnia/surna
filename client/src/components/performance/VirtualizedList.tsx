// Virtualized list component for rendering large datasets efficiently
import React, { memo, useCallback, useMemo } from 'react';
import { useVirtualScroll } from '@/lib/performance';
import { cn } from '@/lib/utils';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  overscan?: number;
  loading?: boolean;
  emptyComponent?: React.ReactNode;
}

function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  className,
  renderItem,
  keyExtractor,
  onEndReached,
  onEndReachedThreshold = 0.8,
  overscan = 5,
  loading = false,
  emptyComponent
}: VirtualizedListProps<T>) {
  const {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    onScroll
  } = useVirtualScroll(items, {
    itemHeight,
    containerHeight: height,
    overscan
  });

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    onScroll(e);

    // Check if we need to load more items
    if (onEndReached) {
      const scrollTop = e.currentTarget.scrollTop;
      const scrollHeight = e.currentTarget.scrollHeight;
      const clientHeight = e.currentTarget.clientHeight;
      
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
      
      if (scrollPercentage >= onEndReachedThreshold) {
        onEndReached();
      }
    }
  }, [onScroll, onEndReached, onEndReachedThreshold]);

  // Memoize visible items to prevent unnecessary re-renders
  const memoizedItems = useMemo(() => {
    return visibleItems.map((item, virtualIndex) => {
      const actualIndex = startIndex + virtualIndex;
      const key = keyExtractor(item, actualIndex);
      
      return (
        <div
          key={key}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: itemHeight,
            transform: `translateY(${(actualIndex) * itemHeight}px)`
          }}
          data-testid={`virtual-item-${actualIndex}`}
        >
          {renderItem(item, actualIndex)}
        </div>
      );
    });
  }, [visibleItems, startIndex, itemHeight, renderItem, keyExtractor]);

  if (items.length === 0 && !loading) {
    return (
      <div 
        className={cn('flex items-center justify-center', className)}
        style={{ height }}
        data-testid="virtualized-list-empty"
      >
        {emptyComponent || (
          <div className="text-center text-muted-foreground">
            <p>No items to display</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn('relative overflow-auto', className)}
      style={{ height }}
      onScroll={handleScroll}
      data-testid="virtualized-list"
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative'
        }}
        data-testid="virtualized-list-container"
      >
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'relative'
          }}
        >
          {memoizedItems}
        </div>
      </div>
      
      {loading && (
        <div 
          className="absolute bottom-0 left-0 right-0 p-4 text-center"
          data-testid="virtualized-list-loading"
        >
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 rounded-full animate-spin bg-gradient-to-r from-transparent to-current" />
            Loading more...
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(VirtualizedList) as <T>(props: VirtualizedListProps<T>) => JSX.Element;