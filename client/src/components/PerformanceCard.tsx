import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Confetti from "react-confetti";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Gift, Zap, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PerformanceData } from "../../../shared/performance-types";

export default function PerformanceCard() {
  const [showDetails, setShowDetails] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<PerformanceData>({
    queryKey: ["/api/user/performance"],
  });

  const redeemMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const response = await fetch("/api/user/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ rewardId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to redeem reward");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      toast({
        title: "Reward Redeemed!",
        description: "Your reward has been successfully redeemed!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/performance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse rounded-3xl border bg-card/50 backdrop-blur-xl text-card-foreground">
        <CardContent className="p-6">
          <div className="h-4 rounded mb-4 bg-muted/20"></div>
          <div className="h-3 rounded mb-2 bg-muted/20"></div>
          <div className="h-3 rounded w-2/3 bg-muted/20"></div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = data ? ((data.totalPoints % 100) / 100) * 100 : 0;
  const level = data?.currentLevel || 1;
  const pointsToNextLevel = 100 - (data?.totalPoints || 0) % 100;

  // Handle error state
  if (error) {
    return (
      <Card className="rounded-3xl border bg-card backdrop-blur-xl text-card-foreground">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2 text-destructive">Unable to Load Performance Data</h3>
            <p className="text-secondary">Please try refreshing the page or contact support if the issue persists.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
        />
      )}
      
      <Card 
        onClick={() => setShowDetails(true)}
        className="cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-300 rounded-3xl border bg-card backdrop-blur-xl text-card-foreground"
        data-testid="performance-card"
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6" style={{ strokeWidth: 1.75 }} />
              <h2 className="text-2xl font-semibold text-foreground">Performance</h2>
            </div>
            <div className="rounded-xl px-3 py-1" style={{ background: 'var(--surna-border)' }}>
              <span className="text-xs font-medium text-foreground">Level {level}</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-semibold text-foreground">{data?.totalPoints || 0} Points</span>
                <span className="text-sm text-secondary">{pointsToNextLevel} to next level</span>
              </div>
              <div className="w-full h-[6px] rounded-[6px] overflow-hidden bg-[var(--token-progress-bg)]">
                <div 
                  className="h-full rounded-[6px] transition-all duration-500 bg-[var(--token-accent)]"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-foreground">{data?.eventsAttended || 0}</div>
                <div className="text-xs text-muted-foreground">Events</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{data?.teamsJoined || 0}</div>
                <div className="text-xs text-muted-foreground">Teams</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{data?.challengesCompleted || 0}</div>
                <div className="text-xs text-muted-foreground">Challenges</div>
              </div>
            </div>

            {data?.milestonesReached && data.milestonesReached.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <Star className="w-4 h-4 animate-pulse text-primary" />
                <span className="text-sm font-medium text-primary">
                  Recent: {data.milestonesReached.slice(-1)[0]}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showDetails && (
        <div
          className="fixed inset-0 flex justify-center items-center z-50 p-4 bg-foreground/40 backdrop-blur-[8px]"
          onClick={() => setShowDetails(false)}
          data-testid="performance-modal-backdrop"
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative rounded-[24px] px-7 pt-9 pb-12 bg-[var(--token-surface)]"
            onClick={(e) => e.stopPropagation()}
            data-testid="performance-modal"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowDetails(false)}
              className="absolute top-6 right-6 text-[32px] leading-none text-[var(--token-text)] hover:opacity-80 transition-opacity"
              data-testid="close-modal-button"
            >
              <span>×</span>
            </button>
            
            {/* Header */}
            <div className="text-center mb-2">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy size={28} style={{ strokeWidth: 1.75 }} className="text-primary" />
                <h3 className="text-[28px] font-bold m-0 text-[var(--token-text)]">
                  Performance Dashboard
                </h3>
              </div>
              <p className="text-base font-normal leading-6 mt-1 mb-8 text-[var(--token-text-secondary)]">
                Track your progress and redeem rewards
              </p>
            </div>

            {/* Stats Grid - 2x2 layout with exact spacing */}
            <div className="grid grid-cols-2 gap-x-[18px] gap-y-[22px] mb-10">
              {/* Total Points */}
              <div 
                className="backdrop-blur-xl text-center flex flex-col items-center justify-center h-[130px] rounded-[22px] p-4 bg-[var(--token-surface)] border border-[var(--token-border)]"
                data-testid="stat-total-points"
              >
                <Zap size={28} style={{ strokeWidth: 1.75, marginBottom: '8px' }} className="text-primary" />
                <div className="text-2xl font-bold text-[var(--token-text)]">{data?.totalPoints || 0}</div>
                <div className="text-sm mt-1 text-[var(--token-text-secondary)]">Total Points</div>
              </div>

              {/* Events */}
              <div 
                className="backdrop-blur-xl text-center flex flex-col items-center justify-center h-[130px] rounded-[22px] p-4 bg-[var(--token-surface)] border border-[var(--token-border)]"
                data-testid="stat-events"
              >
                <TrendingUp size={28} style={{ strokeWidth: 1.75, marginBottom: '8px' }} className="text-primary" />
                <div className="text-2xl font-bold text-[var(--token-text)]">{data?.eventsAttended || 0}</div>
                <div className="text-sm mt-1 text-[var(--token-text-secondary)]">Events</div>
              </div>

              {/* Teams */}
              <div 
                className="backdrop-blur-xl text-center flex flex-col items-center justify-center h-[130px] rounded-[22px] p-4 bg-[var(--token-surface)] border border-[var(--token-border)]"
                data-testid="stat-teams"
              >
                <Trophy size={28} style={{ strokeWidth: 1.75, marginBottom: '8px' }} className="text-primary" />
                <div className="text-2xl font-bold text-[var(--token-text)]">{data?.teamsJoined || 0}</div>
                <div className="text-sm mt-1 text-[var(--token-text-secondary)]">Teams</div>
              </div>

              {/* Challenges */}
              <div 
                className="backdrop-blur-xl text-center flex flex-col items-center justify-center h-[130px] rounded-[22px] p-4 bg-[var(--token-surface)] border border-[var(--token-border)]"
                data-testid="stat-challenges"
              >
                <Star size={28} style={{ strokeWidth: 1.75, marginBottom: '8px' }} className="text-primary" />
                <div className="text-2xl font-bold text-[var(--token-text)]">{data?.challengesCompleted || 0}</div>
                <div className="text-sm mt-1 text-[var(--token-text-secondary)]">Challenges</div>
              </div>
            </div>

            {/* Available Rewards Section */}
            <div className="mt-10">
              <div className="flex items-center gap-3 mb-4">
                <Gift size={28} style={{ strokeWidth: 1.75 }} className="text-primary" />
                <h4 className="text-xl font-semibold m-0 text-[var(--token-text)]">
                  Available Rewards
                </h4>
              </div>
              
              {(!data?.availableRewards || data.availableRewards.length === 0) && (
                <p className="text-center text-base mt-4 text-[var(--token-text-secondary)]">
                  No rewards available at the moment
                </p>
              )}

              {data?.availableRewards && data.availableRewards.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.availableRewards.map((reward) => (
                    <div 
                      key={reward.id} 
                      className="backdrop-blur-xl rounded-[22px] p-4 bg-[var(--token-surface)] border border-[var(--token-border)]"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-semibold text-[var(--token-text)]">{reward.title}</h5>
                        <Badge variant="outline" className="border-primary text-primary">{reward.pointsCost} pts</Badge>
                      </div>
                      <p className="text-sm mb-4 text-[var(--token-text-secondary)]">{reward.description}</p>
                      <Button
                        onClick={() => redeemMutation.mutate(reward.id)}
                        disabled={redeemMutation.isPending || (data?.totalPoints || 0) < reward.pointsCost}
                        className="w-full"
                        variant={((data?.totalPoints || 0) >= reward.pointsCost) ? "default" : "secondary"}
                      >
                        {redeemMutation.isPending ? "Redeeming..." : "Redeem"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}