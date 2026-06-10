import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

interface SocialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SocialModal({ isOpen, onClose }: SocialModalProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: suggestedUsers } = useQuery<User[]>({
    queryKey: ["/api/users/suggested"],
    enabled: isOpen,
  });

  const { data: following } = useQuery<User[]>({
    queryKey: ["/api/users", (user as any)?.id, "following"],
    queryFn: async () => {
      if (!(user as any)?.id) throw new Error("User ID not available");
      const response = await fetch(`/api/users/${(user as any).id}/following`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch following");
      return response.json();
    },
    enabled: isOpen && !!(user as any)?.id,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background bg-opacity-60 z-50" onClick={onClose}>
      <div 
        className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-background transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 ">
          <h2 className="font-medium text-sm text-token-text">Social</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-transparent border border-border"
          >
            <X className="h-4 w-4 text-token-text" />
          </Button>
        </div>
        
        <div className="p-4">
          {/* Following List */}
          <div className="mb-6">
            <h3 className="font-medium text-xs text-token-text mb-3">Following ({following?.length || 0})</h3>
            <div className="space-y-3">
              {following && following.length > 0 ? (
                following.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div 
                      className="flex items-center space-x-3 cursor-pointer hover:bg-transparent border border-border p-2 rounded-lg flex-1"
                      onClick={() => {
                        setLocation(`/profile/${user.id}`);
                        onClose();
                      }}
                      data-testid={`following-user-${user.id}`}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                        <AvatarFallback>
                          {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-token-text">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user.email
                          }
                        </p>
                        <p className="text-xs text-token-text">Following</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-token-text">
                  Connect with friends to see them here
                </div>
              )}
              {following && following.length > 5 && (
                <button 
                  className="text-sm text-token-text hover:text-token-text"
                  onClick={() => {
                    if ((user as any)?.id) {
                      setLocation(`/profile/${(user as any).id}`);
                      onClose();
                    }
                  }}
                >
                  View all {following.length} following
                </button>
              )}
            </div>
          </div>

          {/* Suggested Users */}
          <div>
            <h3 className="font-medium text-token-text mb-3">People You May Know</h3>
            <div className="space-y-3">
              {suggestedUsers && suggestedUsers.length > 0 ? (
                suggestedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div 
                      className="flex items-center space-x-3 cursor-pointer hover:bg-transparent border border-border p-2 rounded-lg flex-1"
                      onClick={() => {
                        setLocation(`/profile/${user.id}`);
                        onClose();
                      }}
                      data-testid={`suggested-user-${user.id}`}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                        <AvatarFallback>
                          {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-token-text">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user.email
                          }
                        </p>
                        <p className="text-xs text-token-text">Athlete</p>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      className="px-3 py-1 bg-transparent border border-border text-token-text text-xs rounded-full hover:bg-background flex-shrink-0"
                      onClick={() => {
                        setLocation(`/profile/${user.id}`);
                        onClose();
                      }}
                      data-testid={`button-add-${user.id}`}
                    >
                      View
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-sm text-token-text">
                  No suggestions at the moment
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
