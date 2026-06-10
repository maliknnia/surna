// VirtualizedList Component - High-performance list rendering
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { memo } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (props: { index: number; style: React.CSSProperties; data: T[] }) => React.ReactElement;
  className?: string;
  height?: number;
  overscanCount?: number;
}

function VirtualizedListInner<T>({
  items,
  itemHeight,
  renderItem,
  className = "",
  height,
  overscanCount = 5
}: VirtualizedListProps<T>) {
  const ItemRenderer = memo(({ index, style }: { index: number; style: React.CSSProperties }) => 
    renderItem({ index, style, data: items })
  );

  if (height) {
    return (
      <div className={className}>
        <List
          height={height}
          width="100%"
          itemCount={items.length}
          itemSize={itemHeight}
          itemData={items}
          overscanCount={overscanCount}
        >
          {ItemRenderer}
        </List>
      </div>
    );
  }

  return (
    <div className={`${className} flex-1`}>
      <AutoSizer>
        {({ height: autoHeight, width }) => (
          <List
            height={autoHeight}
            width={width}
            itemCount={items.length}
            itemSize={itemHeight}
            itemData={items}
            overscanCount={overscanCount}
          >
            {ItemRenderer}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}

export const VirtualizedList = memo(VirtualizedListInner) as typeof VirtualizedListInner;