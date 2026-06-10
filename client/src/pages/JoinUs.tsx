import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  GraduationCap, 
  Users, 
  Building2, 
  MapPin, 
  Trophy, 
  ShoppingBag, 
  Handshake, 
  Shield, 
  Camera,
  Video,
  BookOpen,
  DollarSign,
  TrendingUp,
  Star,
  ChevronRight,
  Zap,
  Target
} from "lucide-react";

export default function JoinUs() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const monetizationOptions = [
    {
      id: "coach-signup",
      title: "Become a Coach",
      icon: GraduationCap,
      description: "Share your expertise and train athletes",
      earningPotential: "€50-150/hour",
      difficulty: "Medium",
      timeToStart: "2-3 days",
      features: ["Set your own rates", "Flexible scheduling", "Video sessions", "Skill verification"],
      color: "from-primary to-surna-red-dark",
      href: "/monetization/coach-signup"
    },
    {
      id: "team-registration",
      title: "Register Your Team",
      icon: Users,
      description: "List your team and attract new members",
      earningPotential: "€20-50/member",
      difficulty: "Easy",
      timeToStart: "1 day",
      features: ["Team branding", "Member management", "Tournament eligibility", "Sponsorship opportunities"],
      color: "from-green-500 to-green-600",
      href: "/monetization/team-registration"
    },
    {
      id: "gym-listing",
      title: "List Your Gym",
      icon: Building2,
      description: "Connect with athletes seeking training spaces",
      earningPotential: "€500-2000/month",
      difficulty: "Medium",
      timeToStart: "3-5 days",
      features: ["Space optimization", "Equipment showcase", "Peak hour pricing", "Member analytics"],
      color: "from-purple-500 to-purple-600",
      href: "/monetization/gym-listing"
    },
    {
      id: "pitch-rental",
      title: "Rent Your Sports Pitch",
      icon: MapPin,
      description: "Monetize your sports facilities and fields",
      earningPotential: "€100-500/day",
      difficulty: "Easy",
      timeToStart: "1-2 days",
      features: ["Dynamic pricing", "Booking management", "Equipment rental", "Event hosting"],
      color: "from-orange-500 to-orange-600",
      href: "/places"
    },
    {
      id: "host-tournament",
      title: "Host Tournaments",
      icon: Trophy,
      description: "Organize and monetize sporting competitions",
      earningPotential: "€1000-10000/event",
      difficulty: "Hard",
      timeToStart: "1-2 weeks",
      features: ["Event planning tools", "Registration system", "Prize management", "Live streaming"],
      color: "from-yellow-500 to-yellow-600",
      href: "/events/create"
    },
    {
      id: "sell-gear",
      title: "Sell Sports Gear",
      icon: ShoppingBag,
      description: "Create your sports equipment marketplace",
      earningPotential: "€200-5000/month",
      difficulty: "Medium",
      timeToStart: "2-4 days",
      features: ["Product catalog", "Inventory management", "Customer reviews", "Shipping integration"],
      color: "from-red-500 to-red-600",
      href: "/seller/dashboard"
    },
    {
      id: "sponsor-event",
      title: "Sponsor Events",
      icon: Handshake,
      description: "Promote your brand through sports sponsorships",
      earningPotential: "€500-50000/campaign",
      difficulty: "Medium",
      timeToStart: "1 week",
      features: ["Brand visibility", "Audience targeting", "ROI tracking", "Event partnerships"],
      color: "from-indigo-500 to-indigo-600",
      href: "/contact"
    },
    {
      id: "verified-vendor",
      title: "Verified Vendor",
      icon: Shield,
      description: "Become a trusted sports service provider",
      earningPotential: "€1000-20000/month",
      difficulty: "Medium",
      timeToStart: "5-7 days",
      features: ["Trust badge", "Priority listings", "Premium support", "Analytics dashboard"],
      color: "from-teal-500 to-teal-600",
      href: "/seller/dashboard"
    }
  ];

  const additionalOpportunities = [
    {
      id: "affiliate-program",
      title: "Affiliate Partner",
      icon: TrendingUp,
      description: "Earn by referring athletes to SURNA",
      earningPotential: "€5-50/referral",
      color: "from-pink-500 to-pink-600",
      href: "/monetization/affiliate-program"
    },
    {
      id: "event-photographer",
      title: "Event Photography",
      icon: Camera,
      description: "Capture sporting moments professionally",
      earningPotential: "€200-1000/event",
      color: "from-cyan-500 to-cyan-600",
      href: "/monetization/event-photography"
    },
    {
      id: "online-classes",
      title: "Online Skill Classes",
      icon: BookOpen,
      description: "Teach sports skills through video courses",
      earningPotential: "€30-200/student",
      color: "from-neutral-700 to-neutral-900",
      href: "/monetization/coach-signup"
    }
  ];

  const stats = [
    { label: "Active Earners", value: "15,000+", icon: Users },
    { label: "Monthly Revenue", value: "€2.5M", icon: DollarSign },
    { label: "Success Rate", value: "94%", icon: Star },
    { label: "Avg. Time to First Sale", value: "3 days", icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="p-2 hover:bg-accent/10 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Join SURNA</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 sm:space-y-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-primary via-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Target className="h-8 w-8 sm:h-10 sm:w-10 text-foreground" />
          </div>
          <div className="space-y-2 sm:space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Turn Your Sports Passion Into Profit
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
              Join thousands of athletes, coaches, and sports businesses already earning on SURNA. 
              Multiple income streams, proven success, full support.
            </p>
          </div>
        </div>

        {/* Success Stats */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
          <h3 className="font-semibold text-base sm:text-lg mb-4 sm:mb-6 text-center">Platform Success Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center group">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="text-lg sm:text-xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Primary Earning Opportunities */}
        <div className="space-y-4 sm:space-y-6">
          <h3 className="font-semibold text-lg sm:text-xl flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-neutral-700 to-neutral-900 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-foreground" />
            </div>
            Primary Earning Opportunities
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {monetizationOptions.slice(0, 6).map((option) => {
              const Icon = option.icon;
              return (
                <Link key={option.id} href={option.href}>
                  <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${option.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-sm sm:text-base">{option.title}</h4>
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">{option.description}</p>
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {option.earningPotential}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {option.difficulty}
                            </Badge>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Start in {option.timeToStart}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Additional Opportunities - Compact */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-foreground" />
            </div>
            Additional Revenue Streams
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {additionalOpportunities.map((option) => {
              const Icon = option.icon;
              return (
                <Link key={option.id} href={option.href}>
                  <Card className="hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer text-center">
                    <CardContent className="p-3 sm:p-4">
                      <div className={`w-10 h-10 bg-gradient-to-r ${option.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                        <Icon className="w-5 h-5 text-foreground" />
                      </div>
                      <h4 className="font-medium text-xs sm:text-sm mb-1">{option.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{option.description}</p>
                      <Badge variant="secondary" className="text-xs">
                        {option.earningPotential}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-primary via-purple-500 to-indigo-500 text-foreground rounded-2xl p-6 text-center shadow-lg">
          <div className="space-y-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-muted/40 rounded-2xl flex items-center justify-center mx-auto">
              <Zap className="h-7 w-7 sm:h-8 sm:w-8 text-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-lg sm:text-xl mb-2 text-foreground">Ready to Start Earning?</h3>
              <p className="text-foreground/90 text-sm leading-relaxed max-w-md mx-auto">
                Most users start earning within their first week. Pick your opportunity above and let's get started!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="bg-background text-primary hover:bg-muted/40 font-semibold px-6 py-2 rounded-lg shadow-md">
                🚀 Get Started Now
              </Button>
              <Button variant="ghost" className="text-foreground hover:bg-muted/40 border border-border px-6 py-2 rounded-lg">
                💬 Get Support
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}