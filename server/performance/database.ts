// Database performance optimizations and indexing
import { db } from '../db';
import { sql } from 'drizzle-orm';

// Database performance monitoring
export class DatabasePerformance {
  private static queryTimes: Map<string, number[]> = new Map();

  static async measureQuery<T>(
    operation: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      this.recordQueryTime(operation, duration);
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow database query: ${operation} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Database query failed: ${operation} after ${duration}ms`, error);
      throw error;
    }
  }

  private static recordQueryTime(operation: string, duration: number) {
    if (!this.queryTimes.has(operation)) {
      this.queryTimes.set(operation, []);
    }
    
    const times = this.queryTimes.get(operation)!;
    times.push(duration);
    
    // Keep only the last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
  }

  static getQueryStats() {
    const stats: Record<string, {
      count: number;
      avg: number;
      min: number;
      max: number;
      p95: number;
    }> = {};

    for (const [operation, times] of this.queryTimes.entries()) {
      if (times.length === 0) continue;

      const sorted = [...times].sort((a, b) => a - b);
      const count = times.length;
      const sum = times.reduce((a, b) => a + b, 0);
      const avg = sum / count;
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const p95Index = Math.floor(count * 0.95);
      const p95 = sorted[p95Index] || max;

      stats[operation] = { count, avg, min, max, p95 };
    }

    return stats;
  }
}

// Database optimization utilities
export class DatabaseOptimizer {
  // Create performance indexes
  static async createOptimizationIndexes() {
    console.log('Creating database performance indexes...');

    const indexes = [
      // User indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_sport ON users(sport)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_location ON users(location)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at)`,

      // Posts indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_id ON posts(author_id)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_sport ON posts(sport)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_visibility ON posts(visibility)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_created_at ON posts(created_at)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_likes_count ON posts(likes_count)`,

      // Post likes indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_likes_created_at ON post_likes(created_at)`,

      // Post comments indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_comments_author_id ON post_comments(author_id)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_comments_parent_id ON post_comments(parent_id)`,

      // Teams indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_captain_id ON teams(captain_id)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_sport ON teams(sport)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_location ON teams(location)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_is_public ON teams(is_public)`,

      // Team members indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_team_id ON team_members(team_id)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_user_id ON team_members(user_id)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_role ON team_members(role)`,

      // Events indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_organizer_id ON events(organizer_id)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_sport ON events(sport)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_location ON events(location)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_start_time ON events(start_time)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_is_public ON events(is_public)`,

      // Event participants indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id)`,

      // Messages indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_room_id ON messages(room_id)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at ON messages(created_at)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_is_read ON messages(is_read)`,

      // Analytics indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at)`,

      // Composite indexes for common queries
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_created ON posts(author_id, created_at DESC)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_sport_created ON posts(sport, created_at DESC)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_sport_start_time ON events(sport, start_time)`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_sport_public ON teams(sport, is_public)`,

      // Full-text search indexes (PostgreSQL specific)
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_content_fts ON posts USING gin(to_tsvector('english', content))`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name_fts ON users USING gin(to_tsvector('english', first_name || ' ' || last_name))`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_name_fts ON teams USING gin(to_tsvector('english', name))`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_name_fts ON events USING gin(to_tsvector('english', name))`,
    ];

    for (const indexSql of indexes) {
      try {
        await db.execute(sql.raw(indexSql));
        console.log(`âœ… Created index: ${indexSql.match(/idx_\w+/)?.[0]}`);
      } catch (error: any) {
        if (!error.message.includes('already exists')) {
          console.error(`âŒ Failed to create index: ${indexSql}`, error.message);
        }
      }
    }

    console.log('Database optimization indexes created successfully');
  }

  // Analyze database performance
  static async analyzePerformance() {
    try {
      // Get table sizes
      const tableSizes = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
      `);

      // Get index usage statistics
      const indexStats = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC;
      `);

      // Get slow queries (if pg_stat_statements is enabled)
      let slowQueries: Awaited<ReturnType<typeof db.execute>> | null = null;
      try {
        slowQueries = await db.execute(sql`
          SELECT 
            query,
            calls,
            total_time,
            mean_time,
            rows
          FROM pg_stat_statements
          WHERE mean_time > 100
          ORDER BY mean_time DESC
          LIMIT 10;
        `);
      } catch (error) {
        console.log('pg_stat_statements not available for slow query analysis');
      }

      return {
        tableSizes,
        indexStats,
        slowQueries: slowQueries ?? { rows: [] },
        queryStats: DatabasePerformance.getQueryStats()
      };
    } catch (error) {
      console.error('Failed to analyze database performance:', error);
      return null;
    }
  }

  // Cleanup old data for performance
  static async cleanupOldData() {
    console.log('Starting database cleanup...');

    try {
      // Clean up old analytics events (keep last 3 months)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const deletedAnalytics = await db.execute(sql`
        DELETE FROM analytics_events 
        WHERE created_at < ${threeMonthsAgo}
      `);

      // Clean up old user sessions (keep last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedSessions = await db.execute(sql`
        DELETE FROM user_sessions 
        WHERE end_time < ${thirtyDaysAgo} OR (start_time < ${thirtyDaysAgo} AND is_active = false)
      `);

      // Vacuum analyze tables for performance
      await db.execute(sql`VACUUM ANALYZE analytics_events`);
      await db.execute(sql`VACUUM ANALYZE user_sessions`);

      console.log(`âœ… Database cleanup completed:
        - Deleted ${deletedAnalytics.rowCount} old analytics events
        - Deleted ${deletedSessions.rowCount} old user sessions`);

    } catch (error) {
      console.error('Database cleanup failed:', error);
    }
  }
}

// Connection pool optimization
export function optimizeConnectionPool() {
  // These would typically be set via environment variables
  const poolConfig = {
    max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum connections
    min: parseInt(process.env.DB_POOL_MIN || '5'),  // Minimum connections
    idle: parseInt(process.env.DB_POOL_IDLE || '10000'), // Idle timeout (ms)
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000'), // Acquire timeout (ms)
  };

  console.log('Database connection pool optimized:', poolConfig);
  return poolConfig;
}

// Query optimization helpers
export class QueryOptimizer {
  // Optimize batch operations
  static async batchInsert<T>(
    table: any,
    data: T[],
    batchSize: number = 1000
  ): Promise<void> {
    const batches: T[][] = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await db.insert(table).values(batch);
    }
  }

  // Optimize bulk updates
  static async batchUpdate<T>(
    updateFn: (batch: T[]) => Promise<void>,
    data: T[],
    batchSize: number = 500
  ): Promise<void> {
    const batches: T[][] = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await updateFn(batch);
    }
  }
}
