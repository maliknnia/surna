import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, MessageCircle, UserPlus, UserMinus, Trophy, Star, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProfileSettings from "./ProfileSettings";
import type { User } from "@shared/schema";

interface UserProfileProps {
  user: User & {
    isFollowing?: boolean;
    followersCount?: number;
    followingCount?: number;
    postsCount?: number;
  };
  isOwnProfile?: boolean;
  onMessage?: () => void;
}

export default function UserProfile({ user, isOwnProfile = false, onMessage }: UserProfileProps) {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing || false);
  const [followersCount, setFollowersCount] = useState<number>(user.followersCount || 0);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  const handleFollowToggle = async () => {
    // Optimistic UI: flip the follow state and follower count immediately
    // so the button reflects the user's intent without waiting for the
    // round-trip, and revert both if the request fails.
    const wasFollowing = isFollowing;
    const prevCount = followersCount;
    const nextCount = wasFollowing ? Math.max(0, prevCount - 1) : prevCount + 1;
    setIsFollowing(!wasFollowing);
    setFollowersCount(nextCount);
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}/follow`, {
        method: "POST",
        credentials: "include"
      });

      if (!response.ok) throw new Error("follow failed");
      const data = await response.json();
      // Sync to authoritative server state in case it disagrees with our guess.
      if (typeof data.following === 'boolean') setIsFollowing(data.following);
      if (typeof data.followersCount === 'number') setFollowersCount(data.followersCount);
      toast({
        title: data.following ? "Following!" : "Unfollowed",
        description: data.following
          ? `You are now following ${user.firstName} ${user.lastName}`
          : `You unfollowed ${user.firstName} ${user.lastName}`
      });
    } catch (error) {
      setIsFollowing(wasFollowing);
      setFollowersCount(prevCount);
      toast({
        title: "Couldn't update follow",
        description: "Please try again in a moment.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto px-4 pb-28">
      {/* Profile header */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 w-full">
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
              <AvatarFallback className="text-xl sm:text-2xl bg-gradient-to-br from-token-accent to-token-accent text-token-text">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 w-full min-w-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-between gap-3 mb-3">
                <div className="text-center sm:text-left min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-bold truncate">
                    {user.displayName || `${user.firstName} ${user.lastName}`}
                  </h1>
                  {user.username && (
                    <Badge variant="outline" className="text-xs sm:text-sm mt-2">
                      @{user.username}
                    </Badge>
                  )}
                </div>
                {isOwnProfile && (
                  <Button
                    onClick={() => setShowSettings(true)}
                    variant="outline"
                    size="sm"
                    className="p-2"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <p className="text-muted-foreground text-center sm:text-left mb-4">{user.email}</p>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 w-full">
                <div className="text-center p-2 sm:p-3 bg-card border border-border rounded-lg">
                  <div className="font-bold text-base sm:text-lg">{user.postsCount || 0}</div>
                  <div className="text-xs text-muted-foreground">Posts</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-card border border-border rounded-lg">
                  <div className="font-bold text-base sm:text-lg">{followersCount}</div>
                  <div className="text-xs text-muted-foreground">Followers</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-card border border-border rounded-lg">
                  <div className="font-bold text-base sm:text-lg">{user.followingCount || 0}</div>
                  <div className="text-xs text-muted-foreground">Following</div>
                </div>
              </div>
              
              {/* Action buttons */}
              {!isOwnProfile && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
                  <Button
                    onClick={handleFollowToggle}
                    disabled={loading}
                    variant={isFollowing ? "outline" : "default"}
                    size="sm"
                    className={isFollowing ? "flex-1" : "flex-1 bg-primary text-primary-foreground hover:bg-primary/90"}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="w-4 h-4 mr-2" />
                        <span className="truncate">Unfollow</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        <span className="truncate">Follow</span>
                      </>
                    )}
                  </Button>
                  
                  {onMessage && (
                    <Button
                      onClick={onMessage}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      <span className="truncate">Message</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile tabs */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-4 sticky top-0 bg-background z-10">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        
        <TabsContent value="posts" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Recent Posts</h4>
                  <span className="text-sm text-token-text">{user.postsCount || 0} posts</span>
                </div>
                {user.postsCount === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-token-text">No posts yet</p>
                    <p className="text-sm text-token-text">Posts will appear here when they start sharing</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-token-text">Post history coming soon</p>
                    <p className="text-sm text-token-text">Full post display will be available in the next update</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Teams</h4>
                  <span className="text-sm text-token-text">0 teams</span>
                </div>
                <div className="text-center py-8">
                  <p className="text-token-text">No teams joined yet</p>
                  <p className="text-sm text-token-text">Team memberships will appear here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Events</h4>
                  <span className="text-sm text-token-text">0 events</span>
                </div>
                <div className="text-center py-8">
                  <p className="text-token-text">No events registered</p>
                  <p className="text-sm text-token-text">Event participation will appear here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-transparent border border-border rounded-full flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-token-text" />
                  </div>
                  <div>
                    <p className="font-medium">Joined SURNA</p>
                    <p className="text-sm text-token-text">
                      {new Date(user.createdAt!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-transparent border border-border rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-token-text" />
                  </div>
                  <div>
                    <p className="font-medium">Profile completed</p>
                    <p className="text-sm text-token-text">Ready to connect with athletes</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {showSettings && (
        <ProfileSettings
          user={user}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}