import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Check, AlertCircle, Loader2, Sparkles, User as UserIcon, AtSign, ArrowRight, ArrowLeft, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { SPORTS_CATEGORIES, getSportCategories, POPULAR_SPORTS } from "@shared/sportsData";

interface FirstTimeUserSetupProps {
  user: User;
  onComplete: () => void;
}

export default function FirstTimeUserSetup({ user, onComplete }: FirstTimeUserSetupProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [displayName, setDisplayName] = useState(`${user.firstName || ''} ${user.lastName || ''}`.trim());
  const [username, setUsername] = useState("");
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Popular");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkUsername = async (usernameToCheck: string) => {
    if (!usernameToCheck) {
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

  const setupProfileMutation = useMutation({
    mutationFn: async () => {
      // First try without CSRF token for setup
      const response = await fetch("/api/user/setup", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username || undefined,
          displayName: displayName.trim() || undefined,
          sportsPreferences: selectedSports.length > 0 ? selectedSports : undefined,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to SURNA! 🎉",
        description: "Your profile has been set up successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
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
      if (formattedValue) {
        checkUsername(formattedValue);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const toggleSport = (sportName: string) => {
    setSelectedSports(prev => 
      prev.includes(sportName) 
        ? prev.filter(s => s !== sportName)
        : [...prev, sportName]
    );
  };

  const getSportsToShow = () => {
    if (selectedCategory === "Popular") {
      return SPORTS_CATEGORIES.filter(sport => POPULAR_SPORTS.includes(sport.name));
    }
    if (selectedCategory === "All") {
      return SPORTS_CATEGORIES;
    }
    return SPORTS_CATEGORIES.filter(sport => sport.category === selectedCategory);
  };

  const canCompleteStep1 = displayName.trim() && (!username || (usernameAvailable !== false && !usernameError));
  const canCompleteStep2 = true;
  const canComplete = canCompleteStep1;

  // Get sports categories for selection
  const sportCategories = ["Popular", ...getSportCategories(), "All"];

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 bg-transparent border border-border rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-token-text" />
            </div>
            <CardTitle className="text-2xl mb-2">Welcome to SURNA!</CardTitle>
            <p className="text-token-text">
              {currentStep === 1 ? "Let's set up your profile to help other athletes find and connect with you." : 
               "Choose your favorite sports to get personalized recommendations and connect with like-minded athletes."}
            </p>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-xs text-token-text mb-2">
                <span>Step {currentStep} of 2</span>
                <span>{Math.round((currentStep / 2) * 100)}% Complete</span>
              </div>
              <Progress value={(currentStep / 2) * 100} className="h-2" />
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Step 1: Profile Setup */}
            {currentStep === 1 && (
              <>
                {/* Current User Preview */}
                <div className="text-center">
                  <Avatar className="w-16 h-16 mx-auto mb-3">
                    <AvatarFallback className="text-lg bg-transparent border border-border text-token-text">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm text-token-text">Setting up profile for {user.email}</p>
                </div>

                {/* Display Name */}
                <div>
                  <Label htmlFor="displayName" className="text-sm font-medium flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    Your Display Name *
                  </Label>
                  <p className="text-xs text-token-text mb-2">This is how other athletes will see your name</p>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    className="w-full"
                    maxLength={50}
                  />
                </div>

                {/* Username */}
                <div>
                  <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                    <AtSign className="w-4 h-4" />
                    Choose a Username (Optional)
                  </Label>
                  <p className="text-xs text-token-text mb-2">A unique handle others can use to find you quickly</p>
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
                      Great! This username is available
                    </p>
                  )}
                  
                  <p className="text-xs text-token-text mt-1">
                    You can skip this for now and add it later in your profile settings
                  </p>
                </div>

                {/* Navigation */}
                <div className="flex justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onComplete}
                    className="text-token-text"
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(2)}
                    disabled={!canCompleteStep1}
                    className="bg-transparent border border-border text-token-text"
                  >
                    Next: Choose Sports <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 2: Sports Selection */}
            {currentStep === 2 && (
              <>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">What sports do you love?</h3>
                  <p className="text-token-text">Optional — pick any you like, or skip and add them later from your profile</p>
                  <p className="text-sm text-token-text mt-2">Selected: {selectedSports.length} sports</p>
                </div>

                {/* Category Selector */}
                <div className="mb-6">
                  <Label className="text-sm font-medium mb-3 block">Browse by Category</Label>
                  <div className="flex flex-wrap gap-2">
                    {sportCategories.map((category) => (
                      <Badge
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        className={`cursor-pointer transition-all hover:scale-105 ${
                          selectedCategory === category 
                            ? "bg-transparent border border-border text-token-text shadow-md" 
                            : "hover:bg-transparent border border-border"
                        }`}
                        onClick={() => setSelectedCategory(category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Sports Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-64 overflow-y-auto">
                  {getSportsToShow().map((sport) => {
                    const isSelected = selectedSports.includes(sport.name);
                    return (
                      <Card
                        key={sport.name}
                        className={`cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md ${
                          isSelected 
                            ? "ring-2 ring-surna-outline bg-transparent border border-border shadow-lg transform scale-105" 
                            : "hover:bg-transparent border border-border"
                        }`}
                        onClick={() => toggleSport(sport.name)}
                      >
                        <CardContent className="p-3 text-center">
                          <div className="text-2xl mb-2">{sport.icon}</div>
                          <div className="text-xs font-medium text-token-text">{sport.name}</div>
                          {isSelected && (
                            <div className="mt-2">
                              <Badge className="bg-transparent border border-border text-token-text text-xs">
                                <Heart className="w-3 h-3 mr-1" />
                                Selected
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Selected Sports Preview */}
                {selectedSports.length > 0 && (
                  <Card className="bg-transparent border border-border">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-token-text" />
                        Your Selected Sports ({selectedSports.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedSports.map((sportName) => {
                          const sport = SPORTS_CATEGORIES.find(s => s.name === sportName);
                          return (
                            <Badge
                              key={sportName}
                              className="bg-background text-token-text hover:bg-transparent border border-border cursor-pointer"
                              onClick={() => toggleSport(sportName)}
                            >
                              {sport?.icon} {sportName} ✕
                            </Badge>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button
                    onClick={() => setCurrentStep(1)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setupProfileMutation.mutate()}
                    disabled={!canComplete || setupProfileMutation.isPending}
                    className="bg-transparent border border-border text-token-text"
                  >
                    {setupProfileMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {selectedSports.length > 0 ? "Complete Setup" : "Continue without sports"}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            <p className="text-xs text-center text-token-text">
              You can always change these settings later from your profile
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}