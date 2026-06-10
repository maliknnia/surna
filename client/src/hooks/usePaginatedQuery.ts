// usePaginatedQuery Hook - Optimized pagination with infinite scroll
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

interface PaginatedResponse<T> {
  data: T[];
  hasNextPage: boolean;
  nextCursor?: string;
  totalCount?: number;
}

interface UsePaginatedQueryOptions<T> {
  queryKey: string[];
  queryFn: (cursor?: string) => Promise<PaginatedResponse<T>>;
  pageSize?: number;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

export function usePaginatedQuery<T>({
  queryKey,
  queryFn,
  pageSize = 20,
  enabled = true,
  staleTime = 5 * 60 * 1000, // 5 minutes
  cacheTime = 10 * 60 * 1000 // 10 minutes
}: UsePaginatedQueryOptions<T>) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch
  } = useInfiniteQuery({
    queryKey: [...queryKey, pageSize],
    queryFn: ({ pageParam }: { pageParam?: string }) => queryFn(pageParam),
    getNextPageParam: (lastPage: PaginatedResponse<T>) => lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    initialPageParam: undefined as string | undefined,
    enabled,
    staleTime,
    gcTime: cacheTime,
    refetchOnWindowFocus: false
  });

  const items = useMemo(() => {
    return data?.pages.flatMap((page: any) => page.data) ?? [];
  }, [data]);

  const totalCount = useMemo(() => {
    return data?.pages?.[0]?.totalCount;
  }, [data]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetching, fetchNextPage]);

  return {
    items,
    totalCount,
    loadMore,
    hasNextPage,
    isLoading,
    isError,
    error,
    isFetching,
    isFetchingNextPage,
    refetch
  };
}