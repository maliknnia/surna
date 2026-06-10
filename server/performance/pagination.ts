// Advanced pagination utilities for API performance optimization
import { Request, Response } from 'express';
import { SQL, and, desc, asc, gt, lt, gte, lte } from 'drizzle-orm';

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    next_cursor?: string;
    prev_cursor?: string;
  };
}

export interface CursorPaginationResult<T> {
  data: T[];
  pagination: {
    per_page: number;
    has_next: boolean;
    has_prev: boolean;
    next_cursor?: string;
    prev_cursor?: string;
  };
}

// Parse pagination parameters from request
export function parsePaginationParams(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20)); // Max 100 items
  const cursor = req.query.cursor as string;
  const sort = req.query.sort as string || 'createdAt';
  const order = (req.query.order as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  return { page, limit, cursor, sort, order };
}

// Offset-based pagination (traditional)
export class OffsetPagination {
  static async paginate<T>(
    query: any,
    countQuery: any,
    params: PaginationParams
  ): Promise<PaginationResult<T>> {
    const { page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    // Execute queries in parallel for better performance
    const [data, totalResult] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        current_page: page,
        per_page: limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    };
  }

  static addLinks(req: Request, res: Response, result: PaginationResult<any>) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.path}`;
    const queryParams = new URLSearchParams(req.query as any);
    
    // Remove page parameter for link generation
    queryParams.delete('page');
    
    const links: string[] = [];
    
    if (result.pagination.has_prev) {
      queryParams.set('page', (result.pagination.current_page - 1).toString());
      links.push(`<${baseUrl}?${queryParams.toString()}>; rel="prev"`);
    }
    
    if (result.pagination.has_next) {
      queryParams.set('page', (result.pagination.current_page + 1).toString());
      links.push(`<${baseUrl}?${queryParams.toString()}>; rel="next"`);
    }
    
    if (links.length > 0) {
      res.set('Link', links.join(', '));
    }
    
    // Add total count header
    res.set('X-Total-Count', result.pagination.total.toString());
  }
}

// Cursor-based pagination (more efficient for large datasets)
export class CursorPagination {
  static async paginate<T extends { id: string; createdAt: Date }>(
    baseQuery: any,
    params: PaginationParams & { sortField?: any }
  ): Promise<CursorPaginationResult<T>> {
    const { limit = 20, cursor, order = 'desc', sortField } = params;
    
    let query = baseQuery;
    
    // Apply cursor condition
    if (cursor) {
      try {
        const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString());
        const { id, sortValue } = cursorData;
        
        if (sortField && sortValue !== undefined) {
          if (order === 'desc') {
            query = query.where(
              and(
                lt(sortField, sortValue),
                // Handle ties by comparing ID
                lt(sortField.id || sortField, id)
              )
            );
          } else {
            query = query.where(
              and(
                gt(sortField, sortValue),
                gt(sortField.id || sortField, id)
              )
            );
          }
        } else {
          // Fallback to ID-based cursor
          if (order === 'desc') {
            query = query.where(lt(sortField?.id || 'id', id));
          } else {
            query = query.where(gt(sortField?.id || 'id', id));
          }
        }
      } catch (error) {
        console.warn('Invalid cursor provided:', error);
        // Continue without cursor filter
      }
    }
    
    // Add sorting
    if (sortField) {
      query = order === 'desc' ? query.orderBy(desc(sortField)) : query.orderBy(asc(sortField));
    }
    
    // Fetch one extra item to determine if there's a next page
    const data = await query.limit(limit + 1);
    
    const hasNext = data.length > limit;
    const items = hasNext ? data.slice(0, limit) : data;
    
    // Generate cursors
    let nextCursor: string | undefined;
    let prevCursor: string | undefined;
    
    if (hasNext && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = this.generateCursor(lastItem, sortField);
    }
    
    if (cursor && items.length > 0) {
      const firstItem = items[0];
      prevCursor = this.generateCursor(firstItem, sortField, true);
    }
    
    return {
      data: items,
      pagination: {
        per_page: limit,
        has_next: hasNext,
        has_prev: !!cursor,
        next_cursor: nextCursor,
        prev_cursor: prevCursor
      }
    };
  }
  
  private static generateCursor(item: any, sortField?: any, reverse: boolean = false): string {
    const cursorData = {
      id: item.id,
      sortValue: sortField ? item[sortField.name || 'createdAt'] : item.createdAt
    };
    
    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }
}

// Efficient search with pagination
export class SearchPagination {
  static async searchAndPaginate<T>(
    searchQuery: any,
    searchTerm: string,
    searchFields: any[],
    params: PaginationParams
  ): Promise<PaginationResult<T>> {
    const { page = 1, limit = 20 } = params;
    
    if (!searchTerm.trim()) {
      // No search term, return empty results
      return {
        data: [],
        pagination: {
          current_page: page,
          per_page: limit,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false
        }
      };
    }
    
    // Build search conditions (this would depend on your specific search implementation)
    // This is a simplified example - in practice you'd use full-text search
    // const searchConditions = searchFields.map(field => 
    //   // Using ilike for case-insensitive search (PostgreSQL)
    //   // You might want to use a proper full-text search solution
    // );
    
    // Execute search with pagination
    const offset = (page - 1) * limit;
    const data = await searchQuery
      .limit(limit)
      .offset(offset);
    
    // For search, total count might be expensive - consider approximation
    const estimatedTotal = Math.min(1000, data.length + offset + (data.length === limit ? 100 : 0));
    const totalPages = Math.ceil(estimatedTotal / limit);
    
    return {
      data,
      pagination: {
        current_page: page,
        per_page: limit,
        total: estimatedTotal,
        total_pages: totalPages,
        has_next: data.length === limit,
        has_prev: page > 1
      }
    };
  }
}

// Pagination middleware
export function paginationMiddleware(defaultLimit: number = 20, maxLimit: number = 100) {
  return (req: Request, res: Response, next: any) => {
    req.pagination = parsePaginationParams(req);
    
    // Validate and adjust limits
    req.pagination.limit = Math.min(maxLimit, Math.max(1, req.pagination.limit || defaultLimit));
    
    next();
  };
}

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      pagination?: PaginationParams;
    }
  }
}
