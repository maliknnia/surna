import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, X, Check, AlertCircle, User as UserIcon, AtSign, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface ProfileSettingsProps {
  user: User;
  onClose: () => void;
}

export default function ProfileSettings({ user, onClose }: ProfileSettingsProps) {
  const [username, setUsername] = useState(user.username || "");
  const [displayName, setDisplayName] = useState(user.displayName || `${user.firstName} ${user.lastName}` || "");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkUsername = async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck === user.username) {
      setUsernameAvailable(null);
      setUsernameError("");
      return;
    }

    // Validate format first
    if (!usernameToCheck.startsWith("@")) {
      setUsernameError("Username must start with @");
      setUsernameAvailable(false);
      return;
    }

    if (usernameToCheck.length < 4) {
      setUsernameError("Username must be at least 4 characters long");
      setUsernameAvailable(false);
      return;
    }

    if (!/^@[a-zA-Z0-9_]+$/.test(usernameToCheck)) {
      setUsernameError("Username can only contain letters, numbers, and underscores");
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    setUsernameError("");

    try {
      const response = await fetch(`/api/user/check-username/${encodeURIComponent(usernameToCheck)}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUsernameAvailable(data.available);
        if (!data.available) {
          setUsernameError(data.message || "Username is not available");
        }
      } else {
        const errorData = await response.json();
        setUsernameError(errorData.message || "Error checking username");
        setUsernameAvailable(false);
      }
    } catch (error) {
      setUsernameError("Error checking username");
      setUsernameAvailable(false);
    } finally {
      setCheckingUsername(false);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/user/profile", {
        username: username || undefined,
        displayName: displayName || undefined,
      });
      return res.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Profile Updated! ✨",
        description: "Your username and display name have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUsernameChange = (value: string) => {
    let formattedValue = value.trim();
    
    // Auto-add @ if not present and user types something
    if (formattedValue && !formattedValue.startsWith("@")) {
      formattedValue = "@" + formattedValue;
    }
    
    setUsername(formattedValue);
    
    // Debounced username check
    const timeoutId = setTimeout(() => {
      checkUsername(formattedValue);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const canSave = displayName.trim() && (!username || (usernameAvailable !== false && !usernameError));

  return (
    <div
      className="fixed inset-0 bg-background bg-opacity-50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-transparent border border-border rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-token-text hover:text-token-text text-xl z-10"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-token-text" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-token-text">Profile Settings</h2>
            <p className="text-token-text">Customize your display name and username</p>
          </div>

          <div className="space-y-6">
            {/* Display Name */}
            <div>
              <Label htmlFor="displayName" className="text-sm font-medium flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Display Name
              </Label>
              <p className="text-xs text-token-text mb-2">This is how your name appears to other users</p>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="w-full"
                maxLength={50}
              />
              <p className="text-xs text-token-text mt-1">{displayName.length}/50 characters</p>
            </div>

            {/* Username */}
            <div>
              <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                <AtSign className="w-4 h-4" />
                Username (Optional)
              </Label>
              <p className="text-xs text-token-text mb-2">A unique identifier that others can use to find you</p>
              <div className="relative">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="@yourusername"
                  className="w-full pr-10"
                  maxLength={30}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {checkingUsername && <Loader2 className="w-4 h-4 animate-spin text-token-text" />}
                  {!checkingUsername && usernameAvailable === true && <Check className="w-4 h-4 text-token-text" />}
                  {!checkingUsername && usernameAvailable === false && <AlertCircle className="w-4 h-4 text-token-text" />}
                </div>
              </div>
              
              {usernameError && (
                <p className="text-xs text-token-text mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {usernameError}
                </p>
              )}
              
              {usernameAvailable === true && (
                <p className="text-xs text-token-text mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Username is available
                </p>
              )}
              
              <p className="text-xs text-token-text mt-1">
                {username.length}/30 characters • Must start with @ and contain only letters, numbers, and underscores
              </p>
            </div>

            {/* Current Info Preview */}
            <Card className="bg-background">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-token-text">Preview</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-token-text">{displayName || "Display Name"}</span>
                  </div>
                  {username && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs text-token-text ">
                        {username}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 mt-8">
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateProfileMutation.mutate()}
              disabled={!canSave || updateProfileMutation.isPending}
              className="flex-1"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}