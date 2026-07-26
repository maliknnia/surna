import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useInteractionTracking } from "@/hooks/useInteractionTracking";
import { Sparkles, Target, TrendingUp, Users, MapPin, Star, ArrowRight, ArrowLeft } from "lucide-react";
import { useSmartBack } from "@/lib/navigation";
import { flags } from "@/config/flags";
import { Link, useLocation } from "wouter";

interface RecommendationItem {
  contentId: string;
  score: number;
  reasons: string[];
}

interface RecommendationsResponse {
  teams?: RecommendationItem[];
  coaches?: RecommendationItem[];
  users?: RecommendationItem[];
  algorithm: string;
  generatedAt?: string;
}

interface Team {
  id: string;
  name: string;
  sport: string;
  location: string;
  currentMembers: number;
  maxMembers: number;
  description?: string;
}

interface Coach {
  id: string;
  userId: string;
  user?: {
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    sport?: string;
  };
  specialties: string[];
  experience: number;
  hourlyRate: number;
  rating: number;
}

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  bio?: string;
  sport?: string;
  location?: string;
}

export default function Recommendations() {
  const { trackPageView } = useInteractionTracking();
  const [, setLocation] = useLocation();
  const goBack = useSmartBack({ fallback: "/" });

  useEffect(() => {
    trackPageView('recommendations');
  }, [trackPageView]);

  // Feature gate - hide if disabled
  if (!flags.aiRecommendations) {
    return null;
  }

  const { data: recommendations, isLoading } = useQuery<RecommendationsResponse>({
    queryKey: ['/api/recommendations'],
    queryFn: async () => {
      const response = await fetch('/api/recommendations?types=team,coach&algorithm=hybrid');
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      return response.json();
    },
  });

  // Fetch team details
  const { data: teams } = useQuery<Team[]>({
    queryKey: ['/api/teams', recommendations?.teams?.map(t => t.contentId)],
    enabled: !!recommendations?.teams?.length,
    queryFn: async () => {
      const teamIds = recommendations?.teams?.map(t => t.contentId) || [];
      const response = await fetch('/api/teams');
      if (!response.ok) throw new Error('Failed to fetch teams');
      const allTeams = await response.json();
      return allTeams.filter((team: Team) => teamIds.includes(team.id));
    },
  });

  // Fetch coach details
  const coachIds = recommendations?.coaches?.map((c) => c.contentId) ?? [];
  const { data: coaches } = useQuery<Coach[]>({
    queryKey: ["recommendations-coaches", coachIds.join(",")],
    enabled: coachIds.length > 0,
    queryFn: async () => {
      const response = await fetch("/api/coaches?limit=100");
      if (!response.ok) throw new Error("Failed to fetch coaches");
      const allCoaches = await response.json();
      return allCoaches.filter((coach: Coach) => coachIds.includes(coach.id));
    },
  });

  // Fetch user details
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users/search', recommendations?.users?.map(u => u.contentId)],
    enabled: !!recommendations?.users?.length,
    queryFn: async () => {
      const userIds = recommendations?.users?.map(u => u.contentId) || [];
      if (userIds.length === 0) return [];
      // Fetch users one by one since we don't have a bulk endpoint
      const userPromises = userIds.map(id => 
        fetch(`/api/users/${id}`).then(r => r.ok ? r.json() : null)
      );
      const results = await Promise.all(userPromises);
      return results.filter(Boolean);
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="recommendations-page">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goBack} aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Link href="/">
            <Button variant="ghost" size="sm">Home</Button>
          </Link>
        </div>
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80">
              <Sparkles className="h-8 w-8 text-background" data-testid="icon-ai" />
            </div>
            <h1 className="text-4xl font-bold text-foreground" data-testid="text-title">
              AI Recommendations
            </h1>
          </div>
          <p className="text-lg max-w-2xl mx-auto text-foreground/90" data-testid="text-description">
            Discover personalized teams, coaches, and athletes tailored just for you using advanced AI matching
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <RecommendationSectionSkeleton />
            <RecommendationSectionSkeleton />
            <RecommendationSectionSkeleton />
          </div>
        )}

        {/* Team Recommendations */}
        {!isLoading && recommendations?.teams && recommendations.teams.length > 0 && (
          <div className="space-y-4" data-testid="section-teams">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" data-testid="icon-teams" />
              <h2 className="text-2xl font-bold text-foreground" data-testid="text-teams-title">
                Recommended Teams
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {recommendations.teams.map((rec) => {
                const team = teams?.find(t => t.id === rec.contentId);
                if (!team) return null;
                return (
                  <RecommendationCard
                    key={rec.contentId}
                    type="team"
                    id={team.id}
                    title={team.name}
                    subtitle={team.sport}
                    description={`${team.location} • ${team.currentMembers}/${team.maxMembers} members`}
                    score={rec.score}
                    reasons={rec.reasons}
                    onView={() => setLocation(`/teams/${team.id}`)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Coach Recommendations */}
        {!isLoading && recommendations?.coaches && recommendations.coaches.length > 0 && (
          <div className="space-y-4" data-testid="section-coaches">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-primary" data-testid="icon-coaches" />
              <h2 className="text-2xl font-bold text-foreground" data-testid="text-coaches-title">
                Recommended Coaches
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {recommendations.coaches.map((rec) => {
                const coach = coaches?.find(c => c.id === rec.contentId);
                if (!coach) return null;
                const coachName = coach.user
                  ? `${coach.user.firstName ?? ""} ${coach.user.lastName ?? ""}`.trim() || "Coach"
                  : "Coach";
                const subtitle = coach.specialties?.length
                  ? coach.specialties.join(", ")
                  : coach.user?.sport ?? "Sports coach";
                const rate = coach.hourlyRate ? `€${coach.hourlyRate}/hr` : null;
                const exp = coach.experience ? `${coach.experience} yrs exp` : null;
                const description = [exp, rate].filter(Boolean).join(" · ") || "View profile";
                return (
                  <RecommendationCard
                    key={rec.contentId}
                    type="coach"
                    id={coach.id}
                    title={coachName}
                    subtitle={subtitle}
                    description={description}
                    imageUrl={coach.user?.profileImageUrl}
                    score={rec.score}
                    reasons={rec.reasons}
                    onView={() => setLocation(`/coaches/${coach.id}`)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* User Recommendations */}
        {!isLoading && recommendations?.users && recommendations.users.length > 0 && (
          <div className="space-y-4" data-testid="section-users">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-primary" data-testid="icon-users" />
              <h2 className="text-2xl font-bold text-foreground" data-testid="text-users-title">
                Athletes to Follow
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {recommendations.users.map((rec) => {
                const user = users?.find(u => u.id === rec.contentId);
                if (!user) return null;
                return (
                  <RecommendationCard
                    key={rec.contentId}
                    type="user"
                    id={user.id}
                    title={`${user.firstName} ${user.lastName}`}
                    subtitle={user.sport || 'Athlete'}
                    description={user.location || user.bio?.substring(0, 60) || ''}
                    imageUrl={user.profileImageUrl}
                    score={rec.score}
                    reasons={rec.reasons}
                    onView={() => setLocation(`/person/${user.id}`)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!recommendations?.teams?.length && !recommendations?.coaches?.length && !recommendations?.users?.length) && (
          <Card className="bg-transparent border-primary/20" data-testid="empty-state">
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                No recommendations yet
              </h3>
              <p className="text-foreground/70 mb-4">
                Start interacting with teams, coaches, and events to get personalized recommendations
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="outline" onClick={() => setLocation("/teams")}>Browse teams</Button>
                <Button variant="outline" onClick={() => setLocation("/coaches")}>Find coaches</Button>
                <Button variant="outline" onClick={() => setLocation("/discover/people")}>Discover people</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function RecommendationCard({
  type,
  id,
  title,
  subtitle,
  description,
  imageUrl,
  score,
  reasons,
  onView
}: {
  type: 'team' | 'coach' | 'user';
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl?: string;
  score: number;
  reasons: string[];
  onView: () => void;
}) {
  const matchPercentage = Math.round(score * 100);
  
  return (
    <Card 
      className="group transition-all duration-300 hover:scale-[1.02] bg-card/60 border-2 border-primary/30"
      data-testid={`card-${type}-${id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar/Image */}
          <Avatar className="h-16 w-16 border-2 border-primary" data-testid={`avatar-${type}-${id}`}>
            <AvatarImage src={imageUrl} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-background">
              {title.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-lg font-bold text-foreground" data-testid={`text-${type}-name-${id}`}>
                {title}
              </h3>
              <p className="text-sm text-foreground/80" data-testid={`text-${type}-subtitle-${id}`}>
                {subtitle}
              </p>
              <p className="text-sm mt-1 text-muted-foreground" data-testid={`text-${type}-description-${id}`}>
                {description}
              </p>
            </div>

            {/* Match Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary" data-testid={`text-match-score-${id}`}>
                  {matchPercentage}% Match
                </span>
                <Star className="h-4 w-4 text-primary" />
              </div>
              <div 
                className="h-2 w-full rounded-full overflow-hidden bg-foreground/10"
                data-testid={`progress-${type}-${id}`}
              >
                <div 
                  className="h-full transition-all duration-300 bg-gradient-to-r from-primary via-primary/90 to-primary/80"
                  style={{ width: `${matchPercentage}%` }}
                />
              </div>
            </div>

            {/* Reasons */}
            <div className="flex flex-wrap gap-2">
              {reasons.map((reason, idx) => (
                <Badge 
                  key={idx}
                  variant="outline"
                  className="bg-primary/10 border-primary text-foreground"
                  data-testid={`badge-reason-${id}-${idx}`}
                >
                  {reason}
                </Badge>
              ))}
            </div>

            {/* View Button */}
            <Button 
              onClick={onView}
              className="w-full group-hover:scale-[1.02] transition-transform bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-background font-semibold"
              data-testid={`button-view-${type}-${id}`}
            >
              View Profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationSectionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64 bg-primary/10" />
      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton className="h-48 bg-primary/10" />
        <Skeleton className="h-48 bg-primary/10" />
      </div>
    </div>
  );
}
