// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Email Campaign Service - Handle automated email campaigns with SendGrid
import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables?: string[];
}

export interface EmailCampaign {
  id: string;
  name: string;
  templateId: string;
  segment: 'all' | 'new_users' | 'inactive' | 'engaged' | 'sport_specific';
  status: 'draft' | 'scheduled' | 'sent' | 'paused';
  scheduledAt?: Date;
  sentAt?: Date;
  recipients: number;
  opens: number;
  clicks: number;
}

export class EmailCampaignService {
  private static readonly FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@surna.app';
  private static readonly FROM_NAME = 'SURNA Team';

  // Email templates
  private static readonly TEMPLATES: Record<string, EmailTemplate> = {
    welcome: {
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to SURNA - Your Sports Journey Begins!',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to SURNA!</h1>
          <p>Hi {{firstName}},</p>
          <p>Welcome to SURNA, the ultimate sports social network! We're excited to have you join our community of athletes, coaches, and sports enthusiasts.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Get Started:</h3>
            <ul>
              <li>Complete your profile</li>
              <li>Join teams in your area</li>
              <li>Discover upcoming events</li>
              <li>Connect with coaches</li>
            </ul>
          </div>
          
          <p>As a welcome bonus, you've received <strong>50 bonus points</strong>!</p>
          
          <a href="{{baseUrl}}/profile" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Complete Your Profile</a>
          
          <p>Have questions? Reply to this email - we're here to help!</p>
          
          <p>Best regards,<br>The SURNA Team</p>
        </div>
      `,
      textContent: `Welcome to SURNA!\n\nHi {{firstName}},\n\nWelcome to SURNA, the ultimate sports social network! We're excited to have you join our community.\n\nGet started by:\n- Completing your profile\n- Joining teams\n- Discovering events\n- Connecting with coaches\n\nVisit: {{baseUrl}}/profile\n\nBest regards,\nThe SURNA Team`,
      variables: ['firstName', 'baseUrl']
    },

    event_reminder: {
      id: 'event_reminder',
      name: 'Event Reminder',
      subject: 'Don\'t forget: {{eventName}} starts tomorrow!',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Event Reminder</h1>
          <p>Hi {{firstName}},</p>
          <p>This is a friendly reminder that <strong>{{eventName}}</strong> starts tomorrow!</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Event Details:</h3>
            <p><strong>Event:</strong> {{eventName}}</p>
            <p><strong>Date:</strong> {{eventDate}}</p>
            <p><strong>Time:</strong> {{eventTime}}</p>
            <p><strong>Location:</strong> {{eventLocation}}</p>
          </div>
          
          <a href="{{eventUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">View Event Details</a>
          
          <p>See you there!</p>
          
          <p>Best regards,<br>The SURNA Team</p>
        </div>
      `,
      textContent: `Event Reminder\n\nHi {{firstName}},\n\nDon't forget: {{eventName}} starts tomorrow!\n\nEvent Details:\n- Event: {{eventName}}\n- Date: {{eventDate}}\n- Time: {{eventTime}}\n- Location: {{eventLocation}}\n\nView details: {{eventUrl}}\n\nSee you there!\n\nBest regards,\nThe SURNA Team`,
      variables: ['firstName', 'eventName', 'eventDate', 'eventTime', 'eventLocation', 'eventUrl']
    },

    referral_invitation: {
      id: 'referral_invitation',
      name: 'Referral Invitation',
      subject: '{{inviterName}} invited you to join SURNA!',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">You're Invited to Join SURNA!</h1>
          <p>Hi there,</p>
          <p><strong>{{inviterName}}</strong> has invited you to join SURNA, the ultimate sports social network!</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>What is SURNA?</h3>
            <p>SURNA is where athletes connect, teams form, and sports communities thrive. Join thousands of sports enthusiasts who are already part of our community.</p>
            
            <ul>
              <li>Connect with athletes in your area</li>
              <li>Join or create teams</li>
              <li>Discover local sports events</li>
              <li>Find coaches and training opportunities</li>
              <li>Share your sports journey</li>
            </ul>
          </div>
          
          <p><strong>Special Bonus:</strong> Sign up with this invitation and get 50 bonus points to start your journey!</p>
          
          <a href="{{signupUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Join SURNA Now</a>
          
          <p>Ready to take your sports experience to the next level?</p>
          
          <p>Best regards,<br>The SURNA Team</p>
        </div>
      `,
      textContent: `You're Invited to Join SURNA!\n\n{{inviterName}} has invited you to join SURNA, the ultimate sports social network!\n\nWhat is SURNA?\nSURNA is where athletes connect, teams form, and sports communities thrive.\n\n- Connect with athletes\n- Join teams\n- Discover events\n- Find coaches\n- Share your journey\n\nSpecial Bonus: Get 50 bonus points when you sign up!\n\nJoin now: {{signupUrl}}\n\nBest regards,\nThe SURNA Team`,
      variables: ['inviterName', 'signupUrl']
    },

    weekly_digest: {
      id: 'weekly_digest',
      name: 'Weekly Digest',
      subject: 'Your Weekly SURNA Update - New Events & Opportunities',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Your Weekly SURNA Update</h1>
          <p>Hi {{firstName}},</p>
          <p>Here's what's happening in your sports community this week:</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🏆 This Week's Highlights</h3>
            <p>{{weeklyHighlights}}</p>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📅 Upcoming Events</h3>
            <p>{{upcomingEvents}}</p>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>👥 New Teams to Join</h3>
            <p>{{newTeams}}</p>
          </div>
          
          <a href="{{baseUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Explore SURNA</a>
          
          <p>Stay active, stay connected!</p>
          
          <p>Best regards,<br>The SURNA Team</p>
        </div>
      `,
      textContent: `Your Weekly SURNA Update\n\nHi {{firstName}},\n\nThis Week's Highlights:\n{{weeklyHighlights}}\n\nUpcoming Events:\n{{upcomingEvents}}\n\nNew Teams:\n{{newTeams}}\n\nExplore: {{baseUrl}}\n\nStay active, stay connected!\n\nBest regards,\nThe SURNA Team`,
      variables: ['firstName', 'weeklyHighlights', 'upcomingEvents', 'newTeams', 'baseUrl']
    },

    email_verification: {
      id: 'email_verification',
      name: 'Email Verification',
      subject: 'Your SURNA verification code',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #803FE1;">Verify your email</h1>
          <p>Hi {{firstName}},</p>
          <p>Welcome to SURNA! Enter this code in the app to verify your email address:</p>
          <div style="background: #f3f4f6; padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111;">{{verificationCode}}</span>
          </div>
          <p style="color: #666;">This code expires in 15 minutes. If you didn't create a SURNA account, you can ignore this email.</p>
          <p>Best regards,<br>The SURNA Team</p>
        </div>
      `,
      textContent: `Verify your email\n\nHi {{firstName}},\n\nYour SURNA verification code is: {{verificationCode}}\n\nThis code expires in 15 minutes.\n\nBest regards,\nThe SURNA Team`,
      variables: ['firstName', 'verificationCode']
    }
  };

  // Send individual email
  static async sendEmail(
    to: string,
    templateId: string,
    variables: Record<string, string> = {}
  ): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('SendGrid not configured, email would be sent:', { to, templateId, variables });
      return true; // Simulate success in development
    }

    try {
      const template = this.TEMPLATES[templateId];
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Replace variables in template
      let htmlContent = template.htmlContent;
      let textContent = template.textContent;
      let subject = template.subject;

      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
        textContent = textContent.replace(new RegExp(placeholder, 'g'), value);
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
      }

      const msg = {
        to,
        from: {
          email: this.FROM_EMAIL,
          name: this.FROM_NAME
        },
        subject,
        text: textContent,
        html: htmlContent
      };

      await sgMail.send(msg);
      console.log(`Email sent successfully to ${to} with template ${templateId}`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Send welcome email to new user
  static async sendWelcomeEmail(userEmail: string, firstName: string): Promise<boolean> {
    const baseUrl = process.env.BASE_URL || 'https://surna.app';
    
    return this.sendEmail(userEmail, 'welcome', {
      firstName,
      baseUrl
    });
  }

  static async sendVerificationEmail(
    userEmail: string,
    firstName: string,
    verificationCode: string,
  ): Promise<boolean> {
    return this.sendEmail(userEmail, 'email_verification', {
      firstName,
      verificationCode,
    });
  }

  // Send referral invitation email
  static async sendReferralInvitation(
    inviteeEmail: string,
    inviterName: string,
    referralCode: string
  ): Promise<boolean> {
    const baseUrl = process.env.BASE_URL || 'https://surna.app';
    const signupUrl = `${baseUrl}/signup?ref=${referralCode}&utm_source=email&utm_medium=referral&utm_campaign=user_invite`;
    
    return this.sendEmail(inviteeEmail, 'referral_invitation', {
      inviterName,
      signupUrl
    });
  }

  // Send event reminder email
  static async sendEventReminder(
    userEmail: string,
    firstName: string,
    event: any
  ): Promise<boolean> {
    const baseUrl = process.env.BASE_URL || 'https://surna.app';
    const eventUrl = `${baseUrl}/events/${event.id}`;
    
    return this.sendEmail(userEmail, 'event_reminder', {
      firstName,
      eventName: event.name,
      eventDate: new Date(event.dateTime).toLocaleDateString(),
      eventTime: new Date(event.dateTime).toLocaleTimeString(),
      eventLocation: event.location,
      eventUrl
    });
  }

  // Send weekly digest email
  static async sendWeeklyDigest(
    userEmail: string,
    firstName: string,
    digestData: any
  ): Promise<boolean> {
    const baseUrl = process.env.BASE_URL || 'https://surna.app';
    
    return this.sendEmail(userEmail, 'weekly_digest', {
      firstName,
      baseUrl,
      weeklyHighlights: digestData.highlights,
      upcomingEvents: digestData.events,
      newTeams: digestData.teams
    });
  }

  // Get available templates
  static getAvailableTemplates(): EmailTemplate[] {
    return Object.values(this.TEMPLATES);
  }

  // Validate template variables
  static validateTemplateVariables(templateId: string, variables: Record<string, string>): boolean {
    const template = this.TEMPLATES[templateId];
    if (!template) return false;

    const requiredVars = template.variables || [];
    return requiredVars.every(varName => variables.hasOwnProperty(varName));
  }
}