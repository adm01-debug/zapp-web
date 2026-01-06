import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  overscan?: number;
  className?: string;
  itemClassName?: string;
  gap?: number;
  loading?: boolean;
  loadingCount?: number;
  emptyState?: React.ReactNode;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualList<T>({
  items,
  renderItem,
  estimateSize = 60,
  overscan = 5,
  className,
  itemClassName,
  gap = 0,
  loading = false,
  loadingCount = 5,
  emptyState,
  onEndReached,
  endReachedThreshold = 3,
  getItemKey,
}: VirtualListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const hasReachedEnd = React.useRef(false);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize + gap,
    overscan,
    getItemKey: getItemKey
      ? (index) => getItemKey(items[index], index)
      : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // End reached detection
  React.useEffect(() => {
    if (!onEndReached || items.length === 0) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    const isNearEnd = lastItem.index >= items.length - endReachedThreshold;

    if (isNearEnd && !hasReachedEnd.current && !loading) {
      hasReachedEnd.current = true;
      onEndReached();
    }

    if (!isNearEnd) {
      hasReachedEnd.current = false;
    }
  }, [virtualItems, items.length, onEndReached, endReachedThreshold, loading]);

  // Loading state
  if (loading && items.length === 0) {
    return (
      <div className={cn('space-y-2 p-2', className)}>
        {Array.from({ length: loadingCount }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // Empty state
  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className={itemClassName}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
              paddingBottom: gap,
            }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>

      {/* Loading more indicator */}
      {loading && items.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// Grid variant
interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columns?: number;
  estimateSize?: number;
  overscan?: number;
  className?: string;
  gap?: number;
  loading?: boolean;
  loadingCount?: number;
  emptyState?: React.ReactNode;
  onEndReached?: () => void;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualGrid<T>({
  items,
  renderItem,
  columns = 3,
  estimateSize = 200,
  overscan = 3,
  className,
  gap = 16,
  loading = false,
  loadingCount = 9,
  emptyState,
  onEndReached,
  getItemKey,
}: VirtualGridProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const hasReachedEnd = React.useRef(false);

  const rows = React.useMemo(() => {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      result.push(items.slice(i, i + columns));
    }
    return result;
  }, [items, columns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize + gap,
    overscan,
  });

  const virtualRows = virtualizer.getVirtualItems();

  // End reached detection
  React.useEffect(() => {
    if (!onEndReached || rows.length === 0) return;

    const lastRow = virtualRows[virtualRows.length - 1];
    if (!lastRow) return;

    const isNearEnd = lastRow.index >= rows.length - 2;

    if (isNearEnd && !hasReachedEnd.current && !loading) {
      hasReachedEnd.current = true;
      onEndReached();
    }

    if (!isNearEnd) {
      hasReachedEnd.current = false;
    }
  }, [virtualRows, rows.length, onEndReached, loading]);

  // Loading state
  if (loading && items.length === 0) {
    return (
      <div
        className={cn('grid p-2', className)}
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap,
        }}
      >
        {Array.from({ length: loadingCount }).map((_, i) => (
          <Skeleton key={i} style={{ height: estimateSize }} className="rounded-lg" />
        ))}
      </div>
    );
  }

  // Empty state
  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap,
              paddingBottom: gap,
            }}
          >
            {rows[virtualRow.index].map((item, colIndex) => {
              const itemIndex = virtualRow.index * columns + colIndex;
              return (
                <div key={getItemKey ? getItemKey(item, itemIndex) : itemIndex}>
                  {renderItem(item, itemIndex)}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Loading more indicator */}
      {loading && items.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// Horizontal virtual list
interface VirtualHorizontalListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  overscan?: number;
  className?: string;
  itemClassName?: string;
  gap?: number;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualHorizontalList<T>({
  items,
  renderItem,
  estimateSize = 200,
  overscan = 3,
  className,
  itemClassName,
  gap = 16,
  getItemKey,
}: VirtualHorizontalListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize + gap,
    horizontal: true,
    overscan,
    getItemKey: getItemKey
      ? (index) => getItemKey(items[index], index)
      : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn('overflow-x-auto overflow-y-hidden', className)}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          width: virtualizer.getTotalSize(),
          height: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualCol) => (
          <div
            key={virtualCol.key}
            className={itemClassName}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              transform: `translateX(${virtualCol.start}px)`,
              paddingRight: gap,
            }}
          >
            {renderItem(items[virtualCol.index], virtualCol.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
