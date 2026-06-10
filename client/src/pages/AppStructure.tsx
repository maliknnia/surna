import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import SurnaLogo from "@/components/SurnaLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, Calendar, Trophy, MapPin, MessageCircle, ShoppingBag, 
  Video, Radio, Search, Bell, Settings, User, Heart, Star,
  Shield, Target, Zap, Camera, Music, BookOpen, Award,
  TrendingUp, Globe, Clock, Filter, BarChart, Gamepad2,
  Briefcase, GraduationCap, Compass, Flame, Gift
} from "lucide-react";

// Central hub features radiating from SURNA Feed
const hubFeatures = [
  // Core Social Features
  { name: "Social Feed", icon: Users, category: "social", color: "blue" },
  { name: "Live Streaming", icon: Radio, category: "social", color: "red" },
  { name: "Video Content", icon: Video, category: "social", color: "purple" },
  { name: "Messaging", icon: MessageCircle, category: "social", color: "green" },
  
  // Sports & Events
  { name: "Event Calendar", icon: Calendar, category: "events", color: "orange" },
  { name: "Team Management", icon: Shield, category: "teams", color: "blue" },
  { name: "Tournament", icon: Trophy, category: "competition", color: "yellow" },
  { name: "Field Booking", icon: Target, category: "booking", color: "green" },
  
  // Discovery & Location
  { name: "Location Discovery", icon: MapPin, category: "location", color: "red" },
  { name: "Nearby Games", icon: Compass, category: "location", color: "blue" },
  { name: "Sports Venues", icon: Globe, category: "location", color: "purple" },
  
  // Performance & Analytics
  { name: "Performance Analytics", icon: BarChart, category: "analytics", color: "blue" },
  { name: "Player Stats", icon: TrendingUp, category: "analytics", color: "green" },
  { name: "Skill Ratings", icon: Star, category: "analytics", color: "yellow" },
  
  // Marketplace & Shopping
  { name: "Equipment Store", icon: ShoppingBag, category: "shopping", color: "purple" },
  { name: "Gear Marketplace", icon: Briefcase, category: "shopping", color: "orange" },
  
  // Training & Education
  { name: "Coach Finder", icon: GraduationCap, category: "training", color: "blue" },
  { name: "Training Programs", icon: BookOpen, category: "training", color: "green" },
  { name: "Skill Development", icon: Award, category: "training", color: "yellow" },
  
  // Community Features
  { name: "Notifications", icon: Bell, category: "community", color: "red" },
  { name: "User Profiles", icon: User, category: "community", color: "blue" },
  { name: "Search & Discovery", icon: Search, category: "community", color: "purple" },
  { name: "Favorites", icon: Heart, category: "community", color: "red" },
  
  // Gaming & Entertainment
  { name: "Sports Gaming", icon: Gamepad2, category: "gaming", color: "purple" },
  { name: "Challenges", icon: Flame, category: "gaming", color: "orange" },
  { name: "Rewards System", icon: Gift, category: "gaming", color: "green" },
  
  // Additional Features
  { name: "Photo Gallery", icon: Camera, category: "media", color: "blue" },
  { name: "Music Integration", icon: Music, category: "media", color: "purple" },
  { name: "Settings", icon: Settings, category: "system", color: "gray" },
  { name: "Quick Actions", icon: Zap, category: "system", color: "yellow" },
  { name: "Time Tracking", icon: Clock, category: "system", color: "blue" },
  { name: "Content Filtering", icon: Filter, category: "system", color: "gray" }
];

const categoryColors = {
  social: "bg-transparent border border-border  hover:bg-background",
  events: "bg-transparent border border-border  hover:bg-background",
  teams: "bg-transparent border border-border  hover:bg-background",
  competition: "bg-transparent border border-border  hover:bg-background",
  booking: "bg-transparent border border-border  hover:bg-background",
  location: "bg-transparent border border-border  hover:bg-background",
  analytics: "bg-transparent border border-border  hover:bg-background",
  shopping: "bg-transparent border border-border  hover:bg-background",
  training: "bg-transparent border border-border  hover:bg-background",
  community: "bg-transparent border border-border  hover:bg-background",
  gaming: "bg-transparent border border-border  hover:bg-background",
  media: "bg-transparent border border-border  hover:bg-background",
  system: "bg-transparent border border-border  hover:bg-background"
};

export default function AppStructure() {
  const { isAuthenticated, user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const categories = Array.from(new Set(hubFeatures.map(f => f.category)));
  const filteredFeatures = selectedCategory 
    ? hubFeatures.filter(f => f.category === selectedCategory)
    : hubFeatures;

  // This page is for internal app structure documentation only
  // Not meant to be user-facing in production

  const handleFeatureClick = (featureName: string) => {
    // Navigate to appropriate page based on feature
    switch (featureName) {
      case "Social Feed":
        window.location.href = "/feed";
        break;
      case "Field Booking":
        window.location.href = "/booking";
        break;
      case "Event Calendar":
        window.location.href = "/events";
        break;
      case "Team Management":
        window.location.href = "/teams";
        break;
      default:
        alert(`${featureName} feature coming soon!`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-md  z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => window.location.href = "/"}
              className="p-2"
            >
              <MapPin className="w-5 h-5" />
            </Button>
            <SurnaLogo className="h-12 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-foreground">SURNA Network</h1>
              <p className="text-sm text-muted-foreground">Complete Sports Platform Structure</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedCategory(null)}
              className={!selectedCategory ? "bg-primary text-primary-foreground" : ""}
            >
              All Features
            </Button>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-6 py-4 ">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(
                selectedCategory === category ? null : category
              )}
              className="capitalize"
            >
              {category.replace(/([A-Z])/g, ' $1').trim()}
            </Button>
          ))}
        </div>
      </div>

      {/* Central Hub Visualization */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Central SURNA Feed Node */}
          <div className="flex justify-center mb-8">
            <Card className="w-48 h-32 flex items-center justify-center bg-primary text-primary-foreground shadow-lg">
              <CardContent className="text-center p-4">
                <SurnaLogo className="h-8 w-auto mx-auto mb-2" />
                <div className="text-lg font-bold">SURNA FEED</div>
                <div className="text-sm opacity-90">Central Hub</div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Grid - Radiating from Center */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {filteredFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              const categoryColor = categoryColors[feature.category as keyof typeof categoryColors];
              
              return (
                <Card
                  key={feature.name}
                  className={`${categoryColor}  transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                    hoveredFeature === feature.name ? "shadow-lg" : "shadow-sm"
                  }`}
                  onClick={() => handleFeatureClick(feature.name)}
                  onMouseEnter={() => setHoveredFeature(feature.name)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  <CardContent className="p-4 text-center h-24 flex flex-col items-center justify-center">
                    <IconComponent className="w-6 h-6 mb-2 text-foreground" />
                    <div className="text-xs font-medium text-foreground leading-tight">
                      {feature.name}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Connection Lines Visualization */}
          <div className="mt-8 text-center">
            <div className="text-sm text-muted-foreground mb-4">
              All features are interconnected through the central SURNA Feed
            </div>
            <div className="flex justify-center space-x-2">
              {categories.slice(0, 6).map((category, index) => (
                <div
                  key={category}
                  className={`w-3 h-3 rounded-full ${
                    selectedCategory === category ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          {isAuthenticated && (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-foreground">{filteredFeatures.length}</div>
                <div className="text-sm text-muted-foreground">Available Features</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-foreground">{categories.length}</div>
                <div className="text-sm text-muted-foreground">Feature Categories</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-foreground">24/7</div>
                <div className="text-sm text-muted-foreground">Platform Access</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-foreground">∞</div>
                <div className="text-sm text-muted-foreground">Connections</div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}