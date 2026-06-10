import { useState } from "react";
import { Gift, Star, ShoppingCart, Trophy, Clock, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: "badge" | "cosmetic" | "premium" | "physical" | "experience";
  availability: "unlimited" | "limited" | "seasonal" | "exclusive";
  maxRedemptions?: number;
  currentRedemptions?: number;
  imageUrl?: string;
  isActive: boolean;
  requiredLevel?: number;
  validUntil?: Date;
}

interface UserReward {
  id: string;
  rewardId: string;
  userId: string;
  redeemedAt: Date;
  status: "pending" | "fulfilled" | "shipped" | "completed";
  reward: Reward;
}

interface RewardsSystemProps {
  userPoints: number;
  userLevel: number;
  className?: string;
}

export function RewardsSystem({ userPoints, userLevel, className }: RewardsSystemProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for rewards
  const mockRewards: Reward[] = [
    {
      id: "1",
      title: "Champion Badge",
      description: "Show off your achievements with this exclusive badge",
      pointsCost: 100,
      category: "badge",
      availability: "unlimited",
      isActive: true,
    },
    {
      id: "2",
      title: "Premium Profile Theme",
      description: "Customize your profile with premium themes",
      pointsCost: 250,
      category: "cosmetic",
      availability: "unlimited",
      isActive: true,
      requiredLevel: 5,
    },
    {
      id: "3",
      title: "Sports Equipment Discount",
      description: "20% off on sports equipment from our partners",
      pointsCost: 500,
      category: "physical",
      availability: "limited",
      maxRedemptions: 100,
      currentRedemptions: 23,
      isActive: true,
      validUntil: new Date("2024-12-31"),
    },
    {
      id: "4",
      title: "Personal Training Session",
      description: "One-on-one training session with a certified coach",
      pointsCost: 1000,
      category: "experience",
      availability: "limited",
      maxRedemptions: 50,
      currentRedemptions: 12,
      isActive: true,
      requiredLevel: 10,
    },
    {
      id: "5",
      title: "VIP Event Access",
      description: "Exclusive access to VIP sporting events",
      pointsCost: 2000,
      category: "experience",
      availability: "exclusive",
      maxRedemptions: 20,
      currentRedemptions: 5,
      isActive: true,
      requiredLevel: 15,
    },
  ];

  // Fetch user rewards
  const { data: userRewards = [] } = useQuery<UserReward[]>({
    queryKey: ["/api/rewards/user"],
  });

  // Redeem reward mutation
  const redeemMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      return apiRequest("POST", `/api/rewards/${rewardId}/redeem`);
    },
    onSuccess: () => {
      toast({
        title: "Reward Redeemed!",
        description: "Your reward has been successfully redeemed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Redemption Failed",
        description: error.message || "Failed to redeem reward",
        variant: "destructive",
      });
    },
  });

  const filteredRewards = mockRewards.filter(reward => {
    if (selectedCategory === "all") return true;
    return reward.category === selectedCategory;
  });

  const canRedeem = (reward: Reward) => {
    if (!reward.isActive) return false;
    if (userPoints < reward.pointsCost) return false;
    if (reward.requiredLevel && userLevel < reward.requiredLevel) return false;
    if (reward.availability === "limited" && reward.maxRedemptions && 
        reward.currentRedemptions && reward.currentRedemptions >= reward.maxRedemptions) return false;
    if (reward.validUntil && new Date() > reward.validUntil) return false;
    return true;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "badge": return Trophy;
      case "cosmetic": return Star;
      case "physical": return ShoppingCart;
      case "experience": return Gift;
      default: return Gift;
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "unlimited": return "bg-background text-token-text";
      case "limited": return "bg-transparent border border-border text-token-text";
      case "seasonal": return "bg-background text-token-text";
      case "exclusive": return "bg-transparent border border-border text-token-text";
      default: return "bg-background text-token-text";
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--surna-border)] bg-[var(--surna-elevated)] overflow-hidden",
        className,
      )}
      data-testid="rewards-system"
    >
      <div className="p-5 border-b border-[var(--surna-border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--surna-text)] tracking-tight">Rewards</h2>
          <p className="text-sm text-[var(--surna-text-muted)] mt-0.5">
            Redeem points for perks and experiences
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surna-bg-highlight)] border border-[var(--surna-border)]">
          <Star className="w-4 h-4 text-[var(--surna-text)]" />
          <span className="font-bold text-sm text-[var(--surna-text)] tabular-nums">
            {userPoints.toLocaleString()} pts
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="w-full h-auto flex flex-wrap gap-1 p-1 rounded-full bg-[var(--surna-bg-highlight)] border border-[var(--surna-border)]">
          <TabsTrigger value="all" className="rounded-full text-xs data-[state=active]:bg-[var(--surna-elevated)]">All</TabsTrigger>
          <TabsTrigger value="badge" className="rounded-full text-xs data-[state=active]:bg-[var(--surna-elevated)]">Badges</TabsTrigger>
          <TabsTrigger value="cosmetic" className="rounded-full text-xs data-[state=active]:bg-[var(--surna-elevated)]">Style</TabsTrigger>
          <TabsTrigger value="physical" className="rounded-full text-xs data-[state=active]:bg-[var(--surna-elevated)]">Gear</TabsTrigger>
          <TabsTrigger value="experience" className="rounded-full text-xs data-[state=active]:bg-[var(--surna-elevated)]">Experiences</TabsTrigger>
          <TabsTrigger value="premium" className="rounded-full text-xs data-[state=active]:bg-[var(--surna-elevated)]">Premium</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-5 focus-visible:outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredRewards.map((reward) => {
              const Icon = getCategoryIcon(reward.category);
              const canRedeemReward = canRedeem(reward);
              const isAlreadyRedeemed = userRewards.some((ur: UserReward) => ur.rewardId === reward.id);

              return (
                <Card 
                  key={reward.id} 
                  className={cn(
                    "relative border-[var(--surna-border)] bg-[var(--surna-bg-highlight)] shadow-none",
                    !canRedeemReward && "opacity-55",
                    isAlreadyRedeemed && "border-[var(--surna-border)]",
                  )}
                  data-testid={`reward-card-${reward.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-[var(--surna-elevated)] flex-shrink-0">
                          <Icon className="w-5 h-5 text-[var(--surna-text)]" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base text-[var(--surna-text)]">{reward.title}</CardTitle>
                          <Badge variant="secondary" className="mt-1 text-[10px] capitalize">
                            {reward.availability}
                          </Badge>
                        </div>
                      </div>
                      
                      {isAlreadyRedeemed && (
                        <div className="text-token-text">
                          <Check className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <p className="text-[var(--surna-text-secondary)] text-sm leading-relaxed">
                      {reward.description}
                    </p>

                    {/* Requirements */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-token-text">Cost:</span>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-token-text" />
                          <span className="font-medium">{reward.pointsCost.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {reward.requiredLevel && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-token-text">Required Level:</span>
                          <span className={cn(
                            "font-medium text-token-text",
                            userLevel >= reward.requiredLevel ? "" : ""
                          )}>
                            Level {reward.requiredLevel}
                          </span>
                        </div>
                      )}

                      {reward.availability === "limited" && reward.maxRedemptions && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-token-text">Available:</span>
                          <span className="font-medium text-token-text">
                            {(reward.maxRedemptions - (reward.currentRedemptions || 0))} / {reward.maxRedemptions}
                          </span>
                        </div>
                      )}

                      {reward.validUntil && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-token-text">Valid Until:</span>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-token-text" />
                            <span className="font-medium text-token-text">
                              {reward.validUntil.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => redeemMutation.mutate(reward.id)}
                      disabled={!canRedeemReward || isAlreadyRedeemed || redeemMutation.isPending}
                      className="w-full"
                      variant={isAlreadyRedeemed ? "secondary" : canRedeemReward ? "default" : "outline"}
                      data-testid={`redeem-button-${reward.id}`}
                    >
                      {redeemMutation.isPending ? (
                        "Redeeming..."
                      ) : isAlreadyRedeemed ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Redeemed
                        </>
                      ) : !canRedeemReward ? (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          {userPoints < reward.pointsCost ? "Not Enough Points" : 
                           reward.requiredLevel && userLevel < reward.requiredLevel ? "Level Required" :
                           "Unavailable"}
                        </>
                      ) : (
                        <>
                          <Gift className="w-4 h-4 mr-2" />
                          Redeem for {reward.pointsCost} pts
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredRewards.length === 0 && (
            <div className="text-center py-12">
              <Gift className="w-12 h-12 text-token-text mx-auto mb-4" />
              <h3 className="text-lg font-medium text-token-text mb-2">
                No rewards available
              </h3>
              <p className="text-token-text">
                Check back later for new rewards in this category!
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {userRewards.length > 0 && (
        <Card className="border-[var(--surna-border)] bg-[var(--surna-bg-highlight)] shadow-none">
          <CardHeader>
            <CardTitle className="text-token-text">Your Redeemed Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userRewards.map((userReward: UserReward) => (
                <div 
                  key={userReward.id}
                  className="flex items-center justify-between p-3 bg-background rounded-lg"
                  data-testid={`user-reward-${userReward.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-transparent border border-border rounded-lg">
                      <Check className="w-4 h-4 text-token-text" />
                    </div>
                    <div>
                      <p className="font-medium text-token-text">
                        {userReward.reward.title}
                      </p>
                      <p className="text-sm text-token-text">
                        Redeemed on {new Date(userReward.redeemedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={
                    userReward.status === "completed" ? "default" :
                    userReward.status === "pending" ? "secondary" : "outline"
                  }>
                    {userReward.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}