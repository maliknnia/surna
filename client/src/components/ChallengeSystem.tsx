import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Swords, 
  Plus, 
  Users, 
  MapPin, 
  Calendar,
  Clock,
  Trophy,
  Send,
  UserPlus,
  Target,
  Zap,
  CheckCircle,
  XCircle,
  Search
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { searchUsers } from "@/lib/searchUsers";

interface Challenge {
  id: string;
  challenger: {
    id: string;
    username: string;
    profileImageUrl?: string;
    level?: number;
  };
  opponent?: {
    id: string;
    username: string;
    profileImageUrl?: string;
    level?: number;
  };
  sport: string;
  type: "1v1" | "team" | "group";
  location?: string;
  scheduledFor?: Date;
  status: "pending" | "accepted" | "declined" | "active" | "completed";
  description: string;
  stakes?: {
    points: number;
    winner_takes: string;
  };
  createdAt: Date;
}

interface User {
  id: string;
  username: string;
  profileImageUrl?: string;
  level?: number;
}

const sportsOptions = [
  { value: "basketball", label: "🏀 Basketball" },
  { value: "soccer", label: "⚽ Soccer" },
  { value: "tennis", label: "🎾 Tennis" },
  { value: "running", label: "🏃 Running" },
  { value: "swimming", label: "🏊 Swimming" },
  { value: "cycling", label: "🚴 Cycling" },
  { value: "boxing", label: "🥊 Boxing" },
  { value: "volleyball", label: "🏐 Volleyball" },
];

const challengeTypes = [
  { value: "1v1", label: "⚡ 1v1 Duel", desc: "Direct head-to-head competition" },
  { value: "team", label: "👥 Team Battle", desc: "Bring your squad" },
  { value: "group", label: "🎯 Group Challenge", desc: "Multiple participants" },
];

export function ChallengeSystem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"active" | "pending" | "history">("active");
  const [searchQuery, setSearchQuery] = useState("");

  // Form state for creating challenges
  const [newChallenge, setNewChallenge] = useState({
    sport: "",
    type: "1v1" as "1v1" | "team" | "group",
    opponentId: "",
    location: "",
    scheduledFor: "",
    description: "",
    stakes: { points: 100, winner_takes: "bragging_rights" }
  });

  // Fetch active challenges
  const { data: challenges = [], isLoading } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges/user"],
    staleTime: 1000 * 30,
  });

  // Fetch potential opponents
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/search", "users", searchQuery],
    queryFn: () => searchUsers<User>(searchQuery),
    enabled: searchQuery.length > 2,
    staleTime: 1000 * 60,
  });

  // Create challenge mutation
  const createChallengeMutation = useMutation({
    mutationFn: async (challenge: any) => {
      return apiRequest("POST", "/api/challenges", challenge);
    },
    onSuccess: () => {
      toast({
        title: "Challenge Sent!",
        description: "Your challenge has been sent to the opponent.",
      });
      setShowCreateForm(false);
      setNewChallenge({
        sport: "",
        type: "1v1",
        opponentId: "",
        location: "",
        scheduledFor: "",
        description: "",
        stakes: { points: 100, winner_takes: "bragging_rights" }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create challenge",
        variant: "destructive",
      });
    },
  });

  // Accept/Decline challenge mutations
  const respondChallengeMutation = useMutation({
    mutationFn: async ({ challengeId, response }: { challengeId: string; response: "accept" | "decline" }) => {
      return apiRequest("POST", `/api/challenges/${challengeId}/respond`, { response });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges/user"] });
    },
  });

  const handleCreateChallenge = () => {
    if (!newChallenge.sport || !newChallenge.opponentId) {
      toast({
        title: "Missing Information",
        description: "Please select a sport and opponent",
        variant: "destructive",
      });
      return;
    }
    
    createChallengeMutation.mutate(newChallenge);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-background text-token-text";
      case "accepted": return "bg-transparent border border-border text-token-text";
      case "active": return "bg-background text-token-text";
      case "completed": return "bg-transparent border border-border text-token-text";
      case "declined": return "bg-background text-token-text";
      default: return "bg-transparent border border-border text-token-text";
    }
  };

  const filterChallenges = () => {
    switch (selectedTab) {
      case "pending": 
        return challenges.filter(c => c.status === "pending");
      case "active":
        return challenges.filter(c => ["accepted", "active"].includes(c.status));
      case "history":
        return challenges.filter(c => ["completed", "declined"].includes(c.status));
      default:
        return challenges;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-background rounded-2xl shadow-sm  overflow-hidden">
        <div className="p-6 space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="w-12 h-12 bg-transparent border border-border rounded-full"/>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-transparent border border-border rounded w-3/4"/>
                <div className="h-3 bg-transparent border border-border rounded w-1/2"/>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-background rounded-2xl shadow-sm  overflow-hidden">
      {/* Header */}
      <div className="bg-transparent border border-border p-6 ">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-token-text flex items-center gap-3">
            <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
              <Swords className="h-5 w-5 text-token-text" />
            </div>
            Challenges
          </h2>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-token-accent hover:bg-token-accent text-token-text"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Challenge
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-transparent border border-border p-1 rounded-lg">
          {["active", "pending", "history"].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab as any)}
              className={`
                flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all
                ${selectedTab === tab 
                  ? "bg-background text-token-text shadow-sm" 
                  : "text-token-text hover:text-token-text"
                }
              `}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <Badge variant="secondary" className="ml-2 text-xs">
                {filterChallenges().length}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Create Challenge Form */}
      {showCreateForm && (
        <div className="p-6 bg-transparent border border-border ">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sport</label>
              <Select value={newChallenge.sport} onValueChange={(v) => setNewChallenge({...newChallenge, sport: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your sport" />
                </SelectTrigger>
                <SelectContent>
                  {sportsOptions.map(sport => (
                    <SelectItem key={sport.value} value={sport.value}>
                      {sport.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Challenge Type</label>
              <Select value={newChallenge.type} onValueChange={(v: any) => setNewChallenge({...newChallenge, type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {challengeTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div>{type.label}</div>
                        <div className="text-xs text-token-text">{type.desc}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Find Opponent</label>
              <div className="relative">
                <Input
                  placeholder="Search for players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-token-text" />
              </div>
              {users.length > 0 && searchQuery.length > 2 && (
                <div className="bg-background rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
                  {users.map(user => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setNewChallenge({...newChallenge, opponentId: user.id});
                        setSearchQuery(user.username);
                      }}
                      className="flex items-center space-x-2 p-2 hover:bg-transparent border border-border rounded cursor-pointer"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.profileImageUrl} />
                        <AvatarFallback className="text-xs">{user.username[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user.username}</span>
                      {user.level && (
                        <Badge variant="outline" className="text-xs">L{user.level}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location (Optional)</label>
              <div className="relative">
                <Input
                  placeholder="Where will you compete?"
                  value={newChallenge.location}
                  onChange={(e) => setNewChallenge({...newChallenge, location: e.target.value})}
                  className="pl-10"
                />
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-token-text" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Schedule For (Optional)</label>
              <div className="relative">
                <Input
                  type="datetime-local"
                  value={newChallenge.scheduledFor}
                  onChange={(e) => setNewChallenge({...newChallenge, scheduledFor: e.target.value})}
                  className="pl-10"
                />
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-token-text" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Stakes (Points)</label>
              <Input
                type="number"
                placeholder="100"
                value={newChallenge.stakes.points}
                onChange={(e) => setNewChallenge({
                  ...newChallenge, 
                  stakes: {...newChallenge.stakes, points: parseInt(e.target.value) || 100}
                })}
              />
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium">Challenge Message</label>
            <Textarea
              placeholder="Add a message to your opponent... (optional)"
              value={newChallenge.description}
              onChange={(e) => setNewChallenge({...newChallenge, description: e.target.value})}
              rows={2}
            />
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={handleCreateChallenge}
              disabled={createChallengeMutation.isPending}
              className="bg-token-accent hover:bg-token-accent"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Challenge
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Challenge List */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {filterChallenges().length === 0 ? (
          <div className="text-center py-12 text-token-text">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No {selectedTab} challenges</p>
            <p className="text-sm mt-1">
              {selectedTab === "active" 
                ? "Create your first challenge to get started!" 
                : `You don't have any ${selectedTab} challenges yet.`
              }
            </p>
          </div>
        ) : (
          filterChallenges().map((challenge) => (
            <div key={challenge.id} className="bg-background rounded-xl p-4  hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={challenge.challenger.profileImageUrl} />
                    <AvatarFallback>{challenge.challenger.username[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{challenge.challenger.username}</span>
                      <span className="text-token-text">challenges</span>
                      {challenge.opponent ? (
                        <>
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={challenge.opponent.profileImageUrl} />
                            <AvatarFallback className="text-xs">{challenge.opponent.username[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold">{challenge.opponent.username}</span>
                        </>
                      ) : (
                        <span className="text-token-text italic">you</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-token-text">
                      <span>{sportsOptions.find(s => s.value === challenge.sport)?.label || challenge.sport}</span>
                      <span>•</span>
                      <span>{challenge.stakes?.points || 0} points</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Badge className={getStatusColor(challenge.status)}>
                    {challenge.status}
                  </Badge>
                  
                  {challenge.status === "pending" && challenge.opponent?.id === user?.id && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => respondChallengeMutation.mutate({ 
                          challengeId: challenge.id, 
                          response: "accept" 
                        })}
                        className="bg-token-accent hover:bg-token-accent text-token-text"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respondChallengeMutation.mutate({ 
                          challengeId: challenge.id, 
                          response: "decline" 
                        })}
                        className="text-token-text  hover:bg-background"
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {challenge.description && (
                <p className="text-sm text-token-text mb-2 italic">
                  "{challenge.description}"
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-token-text">
                <div className="flex items-center space-x-4">
                  {challenge.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {challenge.location}
                    </div>
                  )}
                  {challenge.scheduledFor && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(challenge.scheduledFor).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <span>{new Date(challenge.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}