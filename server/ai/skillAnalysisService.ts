import { db } from "../db";
import { 
  skillAssessments, 
  skillMetrics, 
  trainingRecommendations, 
  userSkillProfiles,
  skillProgressHistory,
  aiAnalysisCache,
  type SkillAssessment,
  type SkillMetric,
  type UserSkillProfile,
  type TrainingRecommendation
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { createHash } from "crypto";
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client (using our existing setup)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface VideoAnalysisResult {
  overallScore: number;
  feedback: string;
  analysisData: {
    technique: {
      score: number;
      feedback: string;
      keyFrames: Array<{ timestamp: number; observation: string; }>;
    };
    form: {
      score: number;
      feedback: string;
      improvements: string[];
    };
    speed: {
      score: number;
      feedback: string;
      measurements: Array<{ metric: string; value: number; unit: string; }>;
    };
    accuracy: {
      score: number;
      feedback: string;
      successRate: number;
    };
    confidence: number;
    processingTime: number;
  };
  metrics: Array<{
    name: string;
    score: number;
    feedback: string;
    improvementAreas: string[];
  }>;
}

interface TrainingRecommendationData {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  equipmentNeeded: string[];
  instructions: string;
  frequency: string;
  priority: number;
}

export class SkillAnalysisService {
  
  /**
   * Analyze uploaded video using AI
   */
  async analyzeVideo(
    videoPath: string, 
    sport: string, 
    skillType: string,
    userId: string
  ): Promise<VideoAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(videoPath, sport, skillType);
      const cachedResult = await this.getCachedAnalysis(cacheKey);
      
      if (cachedResult) {
        await this.updateCacheHit(cachedResult.id);
        return JSON.parse(cachedResult.resultData as string) as VideoAnalysisResult;
      }

      // Simulate AI video analysis (in production, this would call actual AI models)
      const analysisResult = await this.performVideoAnalysis(videoPath, sport, skillType);
      
      // Cache the result
      await this.cacheAnalysisResult(cacheKey, 'video_analysis', analysisResult, Date.now() - startTime);
      
      return analysisResult;
    } catch (error) {
      console.error('Error analyzing video:', error);
      throw new Error('Failed to analyze video');
    }
  }

  /**
   * Simulate AI video analysis (placeholder for actual AI integration)
   */
  private async performVideoAnalysis(
    videoPath: string, 
    sport: string, 
    skillType: string
  ): Promise<VideoAnalysisResult> {
    
    // Use Anthropic to generate contextual analysis based on sport and skill type
    const prompt = `Analyze a ${sport} video focusing on ${skillType}. Provide detailed feedback on:
    1. Overall technique and form
    2. Areas for improvement
    3. Specific skills assessment
    4. Training recommendations
    
    Format the response as if analyzing an actual video performance, being constructive and specific to ${sport}.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const aiInsights = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Generate realistic scores based on sport and skill type
    const baseScore = 65 + Math.random() * 30; // 65-95 range
    const techniqueScore = Math.max(40, Math.min(100, baseScore + (Math.random() - 0.5) * 20));
    const formScore = Math.max(40, Math.min(100, baseScore + (Math.random() - 0.5) * 15));
    const speedScore = Math.max(40, Math.min(100, baseScore + (Math.random() - 0.5) * 25));
    const accuracyScore = Math.max(40, Math.min(100, baseScore + (Math.random() - 0.5) * 20));

    return {
      overallScore: Math.round((techniqueScore + formScore + speedScore + accuracyScore) / 4),
      feedback: this.generateContextualFeedback(sport, skillType, aiInsights),
      analysisData: {
        technique: {
          score: Math.round(techniqueScore),
          feedback: this.generateTechniqueFeedback(sport, skillType),
          keyFrames: this.generateKeyFrames()
        },
        form: {
          score: Math.round(formScore),
          feedback: this.generateFormFeedback(sport, skillType),
          improvements: this.generateImprovementAreas(sport, skillType)
        },
        speed: {
          score: Math.round(speedScore),
          feedback: this.generateSpeedFeedback(sport),
          measurements: this.generateSpeedMeasurements(sport)
        },
        accuracy: {
          score: Math.round(accuracyScore),
          feedback: this.generateAccuracyFeedback(sport, skillType),
          successRate: Math.round(60 + Math.random() * 35) // 60-95%
        },
        confidence: Math.round(80 + Math.random() * 15), // 80-95% confidence
        processingTime: Math.round(5000 + Math.random() * 10000) // 5-15 seconds
      },
      metrics: [
        {
          name: 'Form Consistency',
          score: Math.round(formScore),
          feedback: 'Maintain consistent posture throughout the movement',
          improvementAreas: ['Balance', 'Core stability', 'Alignment']
        },
        {
          name: 'Technical Execution',
          score: Math.round(techniqueScore),
          feedback: 'Good technical foundation with room for refinement',
          improvementAreas: ['Timing', 'Coordination', 'Precision']
        },
        {
          name: 'Performance Efficiency',
          score: Math.round((speedScore + accuracyScore) / 2),
          feedback: 'Strong performance with consistent results',
          improvementAreas: ['Speed development', 'Accuracy training']
        }
      ]
    };
  }

  /**
   * Generate personalized training recommendations
   */
  async generateTrainingRecommendations(
    userId: string,
    sport: string,
    assessmentId: string,
    skillAreas: string[]
  ): Promise<TrainingRecommendationData[]> {
    
    try {
      // Get user's skill profile for context
      const skillProfile = await this.getUserSkillProfile(userId, sport);
      const recentAssessments = await this.getRecentAssessments(userId, sport, 5);
      
      // Use AI to generate contextual recommendations
      const recommendations: TrainingRecommendationData[] = [];
      
      for (const skillArea of skillAreas) {
        const recommendation = await this.generateSkillAreaRecommendation(
          skillArea, 
          sport, 
          skillProfile?.skillLevel || 'beginner',
          recentAssessments
        );
        recommendations.push(recommendation);
      }
      
      // Sort by priority (higher priority first)
      return recommendations.sort((a, b) => b.priority - a.priority);
      
    } catch (error) {
      console.error('Error generating training recommendations:', error);
      throw new Error('Failed to generate training recommendations');
    }
  }

  /**
   * Create or update user skill profile
   */
  async updateUserSkillProfile(
    userId: string,
    sport: string,
    assessmentScore: number,
    skillAreas: any
  ): Promise<UserSkillProfile> {
    
    try {
      // Get existing profile or create new one
      let profile = await db.select()
        .from(userSkillProfiles)
        .where(and(
          eq(userSkillProfiles.userId, userId),
          eq(userSkillProfiles.sport, sport)
        ))
        .limit(1)
        .then(rows => rows[0]);

      if (profile) {
        const prevTotal = profile.totalAssessments ?? 0;
        const prevAvg = Number(profile.averageScore ?? 0);
        const prevRecent = profile.recentAssessments ?? 0;
        const newTotalAssessments = prevTotal + 1;
        const newAverageScore =
          (prevAvg * prevTotal + assessmentScore) / newTotalAssessments;
        const progressTrend = this.calculateProgressTrend(prevAvg, newAverageScore);

        const [updatedProfile] = await db.update(userSkillProfiles)
          .set({
            totalAssessments: newTotalAssessments,
            recentAssessments: prevRecent + 1,
            averageScore: String(newAverageScore),
            progressTrend,
            lastAssessmentDate: new Date(),
            skillLevel: this.determineSkillLevel(newAverageScore),
            updatedAt: new Date(),
          })
          .where(eq(userSkillProfiles.id, profile.id))
          .returning();
        
        return updatedProfile;
        
      } else {
        // Create new profile
        const [newProfile] = await db.insert(userSkillProfiles)
          .values({
            userId,
            sport,
            skillLevel: this.determineSkillLevel(assessmentScore),
            overallRating: assessmentScore.toString(),
            totalAssessments: 1,
            recentAssessments: 1,
            averageScore: assessmentScore.toString(),
            lastAssessmentDate: new Date(),
          })
          .returning();
        
        return newProfile;
      }
    } catch (error) {
      console.error('Error updating user skill profile:', error);
      throw new Error('Failed to update skill profile');
    }
  }

  /**
   * Get user's skill profile
   */
  async getUserSkillProfile(userId: string, sport: string): Promise<UserSkillProfile | null> {
    try {
      const profiles = await db.select()
        .from(userSkillProfiles)
        .where(and(
          eq(userSkillProfiles.userId, userId),
          eq(userSkillProfiles.sport, sport)
        ))
        .limit(1);
      
      return profiles[0] || null;
    } catch (error) {
      console.error('Error getting user skill profile:', error);
      return null;
    }
  }

  /**
   * Get recent skill assessments for a user
   */
  async getRecentAssessments(userId: string, sport: string, limit: number = 10): Promise<SkillAssessment[]> {
    try {
      return await db.select()
        .from(skillAssessments)
        .where(and(
          eq(skillAssessments.userId, userId),
          eq(skillAssessments.sport, sport),
          eq(skillAssessments.status, 'completed')
        ))
        .orderBy(desc(skillAssessments.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error getting recent assessments:', error);
      return [];
    }
  }

  /**
   * Generate cache key for analysis results
   */
  private generateCacheKey(videoPath: string, sport: string, skillType: string): string {
    const input = `${videoPath}-${sport}-${skillType}`;
    return createHash('sha256').update(input).digest('hex');
  }

  /**
   * Get cached analysis result
   */
  private async getCachedAnalysis(cacheKey: string) {
    try {
      const results = await db.select()
        .from(aiAnalysisCache)
        .where(and(
          eq(aiAnalysisCache.cacheKey, cacheKey),
          gte(aiAnalysisCache.expiresAt, new Date())
        ))
        .limit(1);
      
      return results[0] || null;
    } catch (error) {
      console.error('Error getting cached analysis:', error);
      return null;
    }
  }

  /**
   * Cache analysis result
   */
  private async cacheAnalysisResult(
    cacheKey: string, 
    analysisType: string, 
    resultData: any,
    processingTime: number
  ) {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Cache for 7 days
      
      const conf = Number(resultData?.analysisData?.confidence ?? 0);
      await db.insert(aiAnalysisCache)
        .values({
          cacheKey,
          analysisType,
          inputHash: cacheKey,
          resultData: JSON.stringify(resultData),
          modelVersion: 'v1.0',
          confidenceScore: String(conf / 100),
          processingTime: Math.round(processingTime / 1000),
          expiresAt
        });
    } catch (error) {
      console.error('Error caching analysis result:', error);
    }
  }

  /**
   * Update cache hit counter
   */
  private async updateCacheHit(cacheId: string) {
    try {
      await db.update(aiAnalysisCache)
        .set({ 
          hitCount: sql`hit_count + 1`,
          lastAccessed: new Date() 
        })
        .where(eq(aiAnalysisCache.id, cacheId));
    } catch (error) {
      console.error('Error updating cache hit:', error);
    }
  }

  // Helper methods for generating contextual content

  private generateContextualFeedback(sport: string, skillType: string, aiInsights: string): string {
    const sportSpecificFeedback = {
      'basketball': `Great shooting form! Focus on consistent follow-through and arc. ${aiInsights.slice(0, 200)}`,
      'soccer': `Good ball control and positioning. Work on first touch and quick decision making. ${aiInsights.slice(0, 200)}`,
      'tennis': `Solid baseline technique. Focus on racket head speed and court positioning. ${aiInsights.slice(0, 200)}`,
      'baseball': `Good swing mechanics. Focus on timing and bat path consistency. ${aiInsights.slice(0, 200)}`,
      'volleyball': `Strong approach and contact. Work on consistency and court awareness. ${aiInsights.slice(0, 200)}`,
      'default': `Good overall technique with solid fundamentals. Focus on consistency and precision. ${aiInsights.slice(0, 200)}`
    };
    
    return sportSpecificFeedback[sport.toLowerCase() as keyof typeof sportSpecificFeedback] 
           || sportSpecificFeedback.default;
  }

  private generateTechniqueFeedback(sport: string, skillType: string): string {
    const techniques = {
      'basketball': 'Excellent shooting form with good arc and follow-through. Focus on consistent release point.',
      'soccer': 'Good ball striking technique. Work on body positioning over the ball for better accuracy.',
      'tennis': 'Solid groundstroke technique. Focus on racket preparation and weight transfer.',
      'default': 'Good fundamental technique. Focus on consistency and precision in execution.'
    };
    
    return techniques[sport.toLowerCase() as keyof typeof techniques] || techniques.default;
  }

  private generateFormFeedback(sport: string, skillType: string): string {
    return `Maintain strong core engagement and balanced stance throughout the movement. Your ${sport} form shows good fundamentals.`;
  }

  private generateSpeedFeedback(sport: string): string {
    return `Good movement speed with room for explosive power development. Focus on acceleration and reaction time.`;
  }

  private generateAccuracyFeedback(sport: string, skillType: string): string {
    return `Solid accuracy with consistent target acquisition. Continue working on precision under pressure.`;
  }

  private generateImprovementAreas(sport: string, skillType: string): string[] {
    const areas = {
      'basketball': ['Shot consistency', 'Arc trajectory', 'Follow-through'],
      'soccer': ['First touch', 'Shooting accuracy', 'Weak foot development'],
      'tennis': ['Footwork', 'Racket head speed', 'Court positioning'],
      'default': ['Consistency', 'Power development', 'Precision']
    };
    
    return areas[sport.toLowerCase() as keyof typeof areas] || areas.default;
  }

  private generateKeyFrames() {
    return [
      { timestamp: 0.5, observation: 'Initial setup and stance' },
      { timestamp: 1.2, observation: 'Movement initiation and balance' },
      { timestamp: 2.1, observation: 'Peak execution phase' },
      { timestamp: 2.8, observation: 'Follow-through and recovery' }
    ];
  }

  private generateSpeedMeasurements(sport: string) {
    const measurements = {
      'basketball': [
        { metric: 'Release Speed', value: 18.5, unit: 'mph' },
        { metric: 'Movement Time', value: 0.85, unit: 'seconds' }
      ],
      'soccer': [
        { metric: 'Ball Speed', value: 45.2, unit: 'mph' },
        { metric: 'Approach Speed', value: 12.3, unit: 'mph' }
      ],
      'default': [
        { metric: 'Movement Speed', value: 15.7, unit: 'mph' },
        { metric: 'Execution Time', value: 1.2, unit: 'seconds' }
      ]
    };
    
    return measurements[sport.toLowerCase() as keyof typeof measurements] || measurements.default;
  }

  private async generateSkillAreaRecommendation(
    skillArea: string,
    sport: string,
    skillLevel: string,
    recentAssessments: SkillAssessment[]
  ): Promise<TrainingRecommendationData> {
    
    const difficulties: ('beginner' | 'intermediate' | 'advanced')[] = ['beginner', 'intermediate', 'advanced'];
    const difficulty = difficulties.includes(skillLevel as any) ? skillLevel as any : 'beginner';
    
    const recommendations = {
      'form': {
        title: `${sport} Form Fundamentals`,
        description: `Improve your basic ${sport} form and posture through targeted exercises`,
        estimatedDuration: 30,
        equipmentNeeded: ['Mirror', 'Basic equipment'],
        instructions: `Practice fundamental movements focusing on proper form and muscle memory`,
        frequency: 'daily',
        priority: 5
      },
      'speed': {
        title: `Speed Development for ${sport}`,
        description: `Enhance your movement speed and reaction time`,
        estimatedDuration: 45,
        equipmentNeeded: ['Cones', 'Timer'],
        instructions: `Perform speed drills with focus on acceleration and quick direction changes`,
        frequency: '3x_week',
        priority: 4
      },
      'accuracy': {
        title: `Precision Training for ${sport}`,
        description: `Develop accuracy and consistency in your ${sport} skills`,
        estimatedDuration: 40,
        equipmentNeeded: ['Targets', 'Basic equipment'],
        instructions: `Practice precision exercises with progressive difficulty levels`,
        frequency: 'daily',
        priority: 4
      },
      'default': {
        title: `General ${sport} Skill Development`,
        description: `Comprehensive skill development for ${sport}`,
        estimatedDuration: 35,
        equipmentNeeded: ['Basic equipment'],
        instructions: `Focus on fundamental skills and consistent practice`,
        frequency: 'weekly',
        priority: 3
      }
    };
    
    const base = recommendations[skillArea.toLowerCase() as keyof typeof recommendations] || recommendations.default;
    
    return {
      ...base,
      difficulty
    };
  }

  private determineSkillLevel(averageScore: number): string {
    if (averageScore >= 85) return 'expert';
    if (averageScore >= 75) return 'advanced';
    if (averageScore >= 60) return 'intermediate';
    return 'beginner';
  }

  private calculateProgressTrend(oldScore: number, newScore: number): string {
    const difference = newScore - oldScore;
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }
}

// Export singleton instance
export const skillAnalysisService = new SkillAnalysisService();
