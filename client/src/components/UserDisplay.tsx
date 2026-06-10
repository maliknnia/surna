import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { User } from "@shared/schema";

interface UserDisplayProps {
  user: User;
  size?: "sm" | "md" | "lg";
  showUsername?: boolean;
  showEmail?: boolean;
  layout?: "horizontal" | "vertical";
  className?: string;
}

export default function UserDisplay({ 
  user, 
  size = "md", 
  showUsername = true, 
  showEmail = false,
  layout = "horizontal",
  className = ""
}: UserDisplayProps) {
  const avatarSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-10 h-10"
  };
  
  const textSizes = {
    sm: { name: "text-sm", username: "text-xs", email: "text-xs" },
    md: { name: "text-base", username: "text-sm", email: "text-sm" },
    lg: { name: "text-lg", username: "text-base", email: "text-base" }
  };

  const displayName = user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous';
  
  if (layout === "vertical") {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <Avatar className={avatarSizes[size]}>
          <AvatarImage src={user.profileImageUrl || ""} />
          <AvatarFallback className={`bg-gradient-to-br from-blue-400 to-blue-600 text-token-text ${size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"}`}>
            {user.firstName?.[0]}{user.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        
        <div className="mt-2">
          <div className={`font-medium ${textSizes[size].name}`}>
            {displayName}
          </div>
          
          {showUsername && user.username && (
            <Badge variant="outline" className={`mt-1 ${textSizes[size].username}`}>
              {user.username}
            </Badge>
          )}
          
          {showEmail && user.email && (
            <div className={`text-token-text mt-1 ${textSizes[size].email}`}>
              {user.email}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Avatar className={avatarSizes[size]}>
        <AvatarImage src={user.profileImageUrl || ""} />
        <AvatarFallback className={size === "sm" ? "text-xs" : size === "lg" ? "text-lg" : ""}>
          {user.firstName?.[0]}{user.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate ${textSizes[size].name}`}>
          {displayName}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {showUsername && user.username && (
            <Badge variant="outline" className={textSizes[size].username}>
              {user.username}
            </Badge>
          )}
          
          {showEmail && user.email && (
            <div className={`text-token-text truncate ${textSizes[size].email}`}>
              {user.email}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}