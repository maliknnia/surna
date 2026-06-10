// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from "../db";
import { skillAssessments, type SkillAssessment } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { skillAnalysisService } from "../ai/skillAnalysisService";

interface VideoUploadData {
  userId: string;
  sport: string;
  skillType: string;
  videoUrl: string;
  videoFileName: string;
  videoFileSize: number;
  videoDuration: number;
  coachReviewRequested?: boolean;
  coachId?: string;
  isPublic?: boolean;
}

interface VideoProcessingResult {
  assessmentId: string;
  status: 'completed' | 'failed';
  overallScore?: number;
  feedback?: string;
  processingTime: number;
  error?: string;
}

export class VideoUploadService {

  /**
   * Create a new skill assessment from uploaded video
   */
  async createSkillAssessment(uploadData: VideoUploadData): Promise<SkillAssessment> {
    try {
      const [assessment] = await db.insert(skillAssessments)
        .values({
          userId: uploadData.userId,
          sport: uploadData.sport,
          skillType: uploadData.skillType,
          videoUrl: uploadData.videoUrl,
          videoFileName: uploadData.videoFileName,
          videoFileSize: uploadData.videoFileSize,
          videoDuration: uploadData.videoDuration,
          status: 'pending',
          coachReviewRequested: uploadData.coachReviewRequested || false,
          coachId: uploadData.coachId,
          isPublic: uploadData.isPublic || false,
        })
        .returning();

      // Start processing the video in the background
      this.processVideoAsync(assessment);

      return assessment;
    } catch (error) {
      console.error('Error creating skill assessment:', error);
      throw new Error('Failed to create skill assessment');
    }
  }

  /**
   * Process video analysis asynchronously
   */
  private async processVideoAsync(assessment: SkillAssessment): Promise<void> {
    try {
      // Update status to processing
      await this.updateAssessmentStatus(assessment.id, 'processing');

      // Analyze the video using AI service
      const analysisResult = await skillAnalysisService.analyzeVideo(
        assessment.videoUrl!,
        assessment.sport,
        assessment.skillType,
        assessment.userId
      );

      // Store the analysis results
      await this.storeAnalysisResults(assessment, analysisResult);

      // Update user skill profile
      await skillAnalysisService.updateUserSkillProfile(
        assessment.userId,
        assessment.sport,
        analysisResult.overallScore,
        analysisResult.analysisData
      );

      // Generate training recommendations if score suggests improvement needed
      if (analysisResult.overallScore < 80) {
        await this.generateTrainingRecommendations(assessment, analysisResult);
      }

      console.log(`Successfully processed assessment ${assessment.id}`);

    } catch (error) {
      console.error(`Error processing assessment ${assessment.id}:`, error);
      
      // Update status to failed
      await this.updateAssessmentStatus(assessment.id, 'failed');
    }
  }

  /**
   * Store analysis results in the database
   */
  private async storeAnalysisResults(
    assessment: SkillAssessment, 
    analysisResult: any
  ): Promise<void> {
    try {
      // Update the main assessment
      await db.update(skillAssessments)
        .set({
          status: 'completed',
          overallScore: analysisResult.overallScore.toString(),
          feedback: analysisResult.feedback,
          analysisData: analysisResult.analysisData,
          processingTime: Math.round(analysisResult.analysisData.processingTime / 1000),
          updatedAt: new Date(),
        })
        .where(eq(skillAssessments.id, assessment.id));

      // Store individual metrics
      const { skillMetrics } = await import("@shared/schema");
      
      for (const metric of analysisResult.metrics) {
        await db.insert(skillMetrics)
          .values({
            assessmentId: assessment.id,
            metricName: metric.name,
            score: metric.score.toString(),
            feedback: metric.feedback,
            improvementAreas: metric.improvementAreas,
            keyFrames: analysisResult.analysisData.technique.keyFrames,
          });
      }

    } catch (error) {
      console.error('Error storing analysis results:', error);
      throw error;
    }
  }

  /**
   * Generate training recommendations based on analysis
   */
  private async generateTrainingRecommendations(
    assessment: SkillAssessment,
    analysisResult: any
  ): Promise<void> {
    try {
      // Identify areas needing improvement
      const improvementAreas = analysisResult.metrics
        .filter((metric: any) => metric.score < 75)
        .map((metric: any) => metric.name.toLowerCase().replace(' ', '_'));

      if (improvementAreas.length === 0) return;

      // Generate recommendations using AI service
      const recommendations = await skillAnalysisService.generateTrainingRecommendations(
        assessment.userId,
        assessment.sport,
        assessment.id,
        improvementAreas
      );

      // Store recommendations in database
      const { trainingRecommendations } = await import("@shared/schema");
      
      for (const rec of recommendations) {
        await db.insert(trainingRecommendations)
          .values({
            userId: assessment.userId,
            sport: assessment.sport,
            skillArea: improvementAreas[0], // Primary area
            recommendationType: 'drill',
            title: rec.title,
            description: rec.description,
            difficulty: rec.difficulty,
            estimatedDuration: rec.estimatedDuration,
            equipmentNeeded: rec.equipmentNeeded,
            instructions: rec.instructions,
            frequency: rec.frequency,
            priority: rec.priority,
            sourceAssessmentId: assessment.id,
          });
      }

    } catch (error) {
      console.error('Error generating training recommendations:', error);
    }
  }

  /**
   * Update assessment status
   */
  async updateAssessmentStatus(
    assessmentId: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    try {
      await db.update(skillAssessments)
        .set({ 
          status, 
          updatedAt: new Date() 
        })
        .where(eq(skillAssessments.id, assessmentId));
    } catch (error) {
      console.error('Error updating assessment status:', error);
    }
  }

  /**
   * Get assessment by ID
   */
  async getAssessment(assessmentId: string): Promise<SkillAssessment | null> {
    try {
      const assessments = await db.select()
        .from(skillAssessments)
        .where(eq(skillAssessments.id, assessmentId))
        .limit(1);

      return assessments[0] || null;
    } catch (error) {
      console.error('Error getting assessment:', error);
      return null;
    }
  }

  /**
   * Get assessments for a user
   */
  async getUserAssessments(
    userId: string, 
    sport?: string, 
    limit: number = 10
  ): Promise<SkillAssessment[]> {
    try {
      const base = db.select().from(skillAssessments);
      const filtered = sport
        ? base.where(
            and(
              eq(skillAssessments.userId, userId),
              eq(skillAssessments.sport, sport),
            ),
          )
        : base.where(eq(skillAssessments.userId, userId));

      return await filtered
        .orderBy(desc(skillAssessments.createdAt))
        .limit(limit);
        
    } catch (error) {
      console.error('Error getting user assessments:', error);
      return [];
    }
  }

  /**
   * Get public assessments for inspiration/comparison
   */
  async getPublicAssessments(
    sport?: string,
    skillType?: string,
    limit: number = 10
  ): Promise<SkillAssessment[]> {
    try {
      let conditions = [eq(skillAssessments.isPublic, true)];
      
      if (sport) {
        conditions.push(eq(skillAssessments.sport, sport));
      }
      if (skillType) {
        conditions.push(eq(skillAssessments.skillType, skillType));
      }

      return await db.select()
        .from(skillAssessments)
        .where(and(...conditions))
        .orderBy(desc(skillAssessments.overallScore))
        .limit(limit);
        
    } catch (error) {
      console.error('Error getting public assessments:', error);
      return [];
    }
  }

  /**
   * Request coach review for an assessment
   */
  async requestCoachReview(
    assessmentId: string, 
    coachId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Verify the assessment belongs to the user
      const assessment = await this.getAssessment(assessmentId);
      if (!assessment || assessment.userId !== userId) {
        throw new Error('Assessment not found or access denied');
      }

      // Update the assessment to include coach review request
      await db.update(skillAssessments)
        .set({
          coachReviewRequested: true,
          coachId: coachId,
          updatedAt: new Date(),
        })
        .where(eq(skillAssessments.id, assessmentId));

      return true;
    } catch (error) {
      console.error('Error requesting coach review:', error);
      return false;
    }
  }

  /**
   * Submit coach feedback
   */
  async submitCoachFeedback(
    assessmentId: string,
    coachId: string,
    feedback: string,
    score: number
  ): Promise<boolean> {
    try {
      // Verify the coach is assigned to this assessment
      const assessment = await this.getAssessment(assessmentId);
      if (!assessment || assessment.coachId !== coachId) {
        throw new Error('Assessment not found or coach not assigned');
      }

      // Update the assessment with coach feedback
      await db.update(skillAssessments)
        .set({
          coachFeedback: feedback,
          coachScore: score.toString(),
          updatedAt: new Date(),
        })
        .where(eq(skillAssessments.id, assessmentId));

      return true;
    } catch (error) {
      console.error('Error submitting coach feedback:', error);
      return false;
    }
  }

  /**
   * Delete an assessment (user can delete their own)
   */
  async deleteAssessment(assessmentId: string, userId: string): Promise<boolean> {
    try {
      // Verify ownership
      const assessment = await this.getAssessment(assessmentId);
      if (!assessment || assessment.userId !== userId) {
        throw new Error('Assessment not found or access denied');
      }

      // Delete related metrics first
      const { skillMetrics } = await import("@shared/schema");
      await db.delete(skillMetrics)
        .where(eq(skillMetrics.assessmentId, assessmentId));

      // Delete the assessment
      await db.delete(skillAssessments)
        .where(eq(skillAssessments.id, assessmentId));

      return true;
    } catch (error) {
      console.error('Error deleting assessment:', error);
      return false;
    }
  }

  /**
   * Get assessment statistics for a user
   */
  async getUserAssessmentStats(userId: string, sport?: string) {
    try {
      // This would normally use aggregate queries, but we'll compute in memory for now
      const assessments = await this.getUserAssessments(userId, sport, 100);
      
      const completedAssessments = assessments.filter(a => a.status === 'completed');
      const totalScore = completedAssessments.reduce((sum, a) => sum + (parseFloat(a.overallScore || '0')), 0);
      const averageScore = completedAssessments.length > 0 ? totalScore / completedAssessments.length : 0;
      
      const recentAssessments = completedAssessments.slice(0, 5);
      const trend = this.calculateProgressTrend(recentAssessments);

      return {
        totalAssessments: assessments.length,
        completedAssessments: completedAssessments.length,
        averageScore: Math.round(averageScore * 100) / 100,
        trend,
        recentScores: recentAssessments.map(a => parseFloat(a.overallScore || '0')),
        mostRecentScore: recentAssessments[0]?.overallScore || null,
      };
    } catch (error) {
      console.error('Error getting user assessment stats:', error);
      return null;
    }
  }

  /**
   * Calculate progress trend from recent assessments
   */
  private calculateProgressTrend(assessments: SkillAssessment[]): string {
    if (assessments.length < 2) return 'stable';
    
    const scores = assessments.map(a => parseFloat(a.overallScore || '0'));
    const recent = scores.slice(0, 2);
    const improvement = recent[0] - recent[1];
    
    if (improvement > 5) return 'improving';
    if (improvement < -5) return 'declining';
    return 'stable';
  }
}

// Export singleton instance
export const videoUploadService = new VideoUploadService();