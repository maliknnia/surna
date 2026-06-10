// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Social Sharing Service - Generate shareable links with UTM tracking
export interface ShareContent {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  hashtags?: string[];
}

export interface UTMParameters {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
}

export class SocialSharingService {
  private static readonly BASE_URL = process.env.BASE_URL || 'https://surna.app';

  // Generate URL with UTM parameters
  static addUTMParameters(url: string, utm: UTMParameters): string {
    const urlObj = new URL(url);
    
    urlObj.searchParams.set('utm_source', utm.source);
    urlObj.searchParams.set('utm_medium', utm.medium);
    urlObj.searchParams.set('utm_campaign', utm.campaign);
    
    if (utm.content) urlObj.searchParams.set('utm_content', utm.content);
    if (utm.term) urlObj.searchParams.set('utm_term', utm.term);
    
    return urlObj.toString();
  }

  // Generate Facebook share URL
  static generateFacebookShareUrl(content: ShareContent, utm: UTMParameters): string {
    const trackedUrl = this.addUTMParameters(content.url, {
      ...utm,
      source: 'facebook'
    });
    
    const params = new URLSearchParams({
      u: trackedUrl,
      quote: content.description
    });
    
    return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
  }

  // Generate Twitter share URL
  static generateTwitterShareUrl(content: ShareContent, utm: UTMParameters): string {
    const trackedUrl = this.addUTMParameters(content.url, {
      ...utm,
      source: 'twitter'
    });
    
    const tweet = content.hashtags 
      ? `${content.description} ${content.hashtags.map(tag => `#${tag}`).join(' ')}`
      : content.description;
    
    const params = new URLSearchParams({
      url: trackedUrl,
      text: tweet
    });
    
    return `https://twitter.com/intent/tweet?${params.toString()}`;
  }

  // Generate LinkedIn share URL
  static generateLinkedInShareUrl(content: ShareContent, utm: UTMParameters): string {
    const trackedUrl = this.addUTMParameters(content.url, {
      ...utm,
      source: 'linkedin'
    });
    
    const params = new URLSearchParams({
      url: trackedUrl,
      title: content.title,
      summary: content.description
    });
    
    return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
  }

  // Generate WhatsApp share URL
  static generateWhatsAppShareUrl(content: ShareContent, utm: UTMParameters): string {
    const trackedUrl = this.addUTMParameters(content.url, {
      ...utm,
      source: 'whatsapp'
    });
    
    const message = `${content.title}\n${content.description}\n${trackedUrl}`;
    
    const params = new URLSearchParams({
      text: message
    });
    
    return `https://wa.me/?${params.toString()}`;
  }

  // Generate Instagram story URL (requires mobile app)
  static generateInstagramShareUrl(content: ShareContent): string {
    // Instagram doesn't support direct URL sharing, return app scheme
    return `instagram://story-camera`;
  }

  // Generate Telegram share URL
  static generateTelegramShareUrl(content: ShareContent, utm: UTMParameters): string {
    const trackedUrl = this.addUTMParameters(content.url, {
      ...utm,
      source: 'telegram'
    });
    
    const message = `${content.title}\n${content.description}`;
    
    const params = new URLSearchParams({
      url: trackedUrl,
      text: message
    });
    
    return `https://t.me/share/url?${params.toString()}`;
  }

  // Generate email share URL
  static generateEmailShareUrl(content: ShareContent, utm: UTMParameters): string {
    const trackedUrl = this.addUTMParameters(content.url, {
      ...utm,
      source: 'email'
    });
    
    const params = new URLSearchParams({
      subject: content.title,
      body: `${content.description}\n\n${trackedUrl}`
    });
    
    return `mailto:?${params.toString()}`;
  }

  // Generate all social share URLs
  static generateAllShareUrls(content: ShareContent, utm: UTMParameters) {
    return {
      facebook: this.generateFacebookShareUrl(content, utm),
      twitter: this.generateTwitterShareUrl(content, utm),
      linkedin: this.generateLinkedInShareUrl(content, utm),
      whatsapp: this.generateWhatsAppShareUrl(content, utm),
      instagram: this.generateInstagramShareUrl(content),
      telegram: this.generateTelegramShareUrl(content, utm),
      email: this.generateEmailShareUrl(content, utm)
    };
  }

  // Generate share content for different types
  static generatePostShareContent(post: any, userId: string): ShareContent {
    return {
      title: `Check out this post on SURNA`,
      description: post.content.substring(0, 280) + (post.content.length > 280 ? '...' : ''),
      url: `${this.BASE_URL}/posts/${post.id}`,
      imageUrl: post.media?.[0]?.url,
      hashtags: ['SURNA', 'Sports', 'Community']
    };
  }

  static generateEventShareContent(event: any): ShareContent {
    return {
      title: `Join ${event.name} on SURNA`,
      description: `Don't miss this amazing sports event! ${event.description?.substring(0, 200)}`,
      url: `${this.BASE_URL}/events/${event.id}`,
      imageUrl: event.imageUrl,
      hashtags: ['SURNA', 'SportsEvent', event.sport]
    };
  }

  static generateTeamShareContent(team: any): ShareContent {
    return {
      title: `Join ${team.name} on SURNA`,
      description: `Looking for team members! Join our ${team.sport} team and connect with like-minded athletes.`,
      url: `${this.BASE_URL}/teams/${team.id}`,
      imageUrl: team.logoUrl,
      hashtags: ['SURNA', 'Sports', 'Team', team.sport]
    };
  }

  static generateAchievementShareContent(achievement: any, user: any): ShareContent {
    return {
      title: `${user.firstName} achieved ${achievement.name}!`,
      description: `Just unlocked a new achievement on SURNA! Join me and start your sports journey.`,
      url: `${this.BASE_URL}/profile/${user.id}`,
      imageUrl: achievement.badgeUrl,
      hashtags: ['SURNA', 'Achievement', 'Sports']
    };
  }

  static generateReferralShareContent(userId: string, referralCode: string): ShareContent {
    return {
      title: 'Join me on SURNA - Sports Social Network',
      description: 'Connect with athletes, join teams, discover events and coaches. Use my referral code to get bonus points!',
      url: `${this.BASE_URL}/signup?ref=${referralCode}`,
      hashtags: ['SURNA', 'Sports', 'SocialNetwork']
    };
  }

  // Track social share events
  static async trackShareEvent(platform: string, contentType: string, contentId: string, userId: string): Promise<void> {
    // This would integrate with your analytics service
    try {
      // Log share event for analytics
      console.log(`Share tracked: ${platform} | ${contentType} | ${contentId} | ${userId}`);
      
      // You could send this to your analytics service or database
      // await analyticsService.trackEvent('social_share', {
      //   platform,
      //   contentType,
      //   contentId,
      //   userId,
      //   timestamp: new Date()
      // });
    } catch (error) {
      console.error('Failed to track share event:', error);
    }
  }
}