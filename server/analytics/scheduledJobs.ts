// Stage 5: Scheduled Jobs for Analytics Aggregation
import cron from 'node-cron';
import { calculateDailyMetrics, updatePopularContent } from './analyticsService';

// Initialize scheduled jobs for analytics
export function initializeScheduledJobs(): void {
  console.log('ðŸ• Initializing analytics scheduled jobs...');

  // Temporarily disable daily metrics to fix loading issues
  // cron.schedule('0 0 * * *', async () => {
  //   console.log('ðŸ“Š Running daily metrics calculation...');
  //   try {
  //     await calculateDailyMetrics();
  //     console.log('âœ… Daily metrics calculation completed');
  //   } catch (error) {
  //     console.error('âŒ Daily metrics calculation failed:', error);
  //   }
  // }, {
  //   timezone: 'UTC'
  // });

  // Update popular content rankings every hour
  cron.schedule('0 * * * *', async () => {
    console.log('ðŸ“ˆ Updating popular content rankings...');
    try {
      await updatePopularContent();
      console.log('âœ… Popular content rankings updated');
    } catch (error) {
      console.error('âŒ Popular content ranking update failed:', error);
    }
  }, {
    timezone: 'UTC'
  });

  // Temporarily disable metrics calculation to fix loading issues
  // setTimeout(async () => {
  //   const yesterday = new Date();
  //   yesterday.setDate(yesterday.getDate() - 1);
  //   
  //   try {
  //     await calculateDailyMetrics(yesterday);
  //     console.log('âœ… Yesterday metrics calculation completed');
  //   } catch (error) {
  //     console.error('âŒ Yesterday metrics calculation failed:', error);
  //   }
  // }, 5000); // Wait 5 seconds after startup

  console.log('âœ… Analytics scheduled jobs initialized');
}
