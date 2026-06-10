import { useState } from "react";
import { 
  X, 
  Search, 
  Users, 
  GraduationCap, 
  Trophy, 
  Play, 
  User, 
  Crown, 
  Settings, 
  Zap,
  MessageCircle,
  ShoppingBag,
  HelpCircle,
  Info,
  Mail,
  Briefcase,
  ChevronRight,
  Calendar,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import SurnaLogo from "@/components/SurnaLogo";

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HamburgerMenu({ isOpen, onClose }: HamburgerMenuProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth() as { user: any };

  // Main navigation items - organized by priority  
  const mainMenuItems = [
    { name: "Teams", icon: Users, href: "/teams", description: "Join or create teams", badge: "" },
    { name: "Events", icon: Calendar, href: "/events", description: "Discover sports events", badge: "" },
    { name: "Messages", icon: MessageCircle, href: "/messages", description: "Chat with athletes", badge: "" },
    { name: "Recommendations", icon: Brain, href: "/recommendations", description: "Personalized content for you", badge: "AI" },
    { name: "Performance", icon: Zap, href: "/performance", description: "App performance metrics", badge: "" },
    { name: "Feed", icon: Trophy, href: "/feed", description: "Social updates & community", badge: "" },
    { name: "Shop", icon: ShoppingBag, href: "/marketplace", description: "Sports gear & equipment", badge: "" },
  ];

  // Account & settings items
  const accountItems = [
    { name: "Settings", icon: Settings, href: "/settings", description: "Customize your experience" },
    { name: "My Profile", icon: User, href: "/profile", description: "Your sports profile", badge: "4.8★" },
    { name: "SURNA Pro", icon: Crown, href: "/pro", description: "Unlock premium features", badge: "Upgrade" },
  ];

  // Support & company items
  const supportItems = [
    { name: "Help", icon: HelpCircle, href: "/help", description: "FAQ & support center" },
    { name: "About Us", icon: Info, href: "/about", description: "Learn about SURNA" },
    { name: "Contact Us", icon: Mail, href: "/contact", description: "Get in touch" },
    { name: "Join Us", icon: Briefcase, href: "/join-us", description: "Monetize your skills & grow with SURNA" },
  ];

  const coachingOptions = [
    { name: "Personal Training", description: "1-on-1 skill development", price: "€75/hr" },
    { name: "Group Sessions", description: "Team training programs", price: "€40/hr" },
    { name: "Video Analysis", description: "Performance breakdown", price: "€25/session" },
    { name: "Nutrition Plans", description: "Custom meal planning", price: "€50/month" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/60 z-[9999] transition-opacity duration-300" onClick={onClose}>
      <div 
        className={`fixed right-0 top-0 h-full w-full sm:w-80 lg:w-96 bg-background transform transition-all duration-300 ease-out shadow-2xl  ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 ">
          <div className="flex items-center gap-2">
            <SurnaLogo className="h-5 w-auto" showText={true} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-transparent border border-border transition-all duration-200 transform hover:scale-110"
          >
            <X className="h-4 w-4 text-token-text" />
          </Button>
        </div>
        
        <div className="p-4 bg-background transition-colors duration-300 overflow-y-auto max-h-[calc(100vh-80px)]">
          {/* Search Bar */}
          <div className="relative mb-6">
            <Input
              type="text"
              placeholder="Search games, teams, coaches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-token-accent focus:"
            />
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-token-text-muted" />
          </div>

          {/* Quick Action */}
          <div className="mb-6 p-4 bg-transparent border border-border rounded-xl text-token-text shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-transparent border border-border rounded-full flex items-center justify-center ">
                <Zap className="w-4 h-4 text-token-text" />
              </div>
              <h3 className="font-bold">Beast Mode Activated</h3>
            </div>
            <p className="text-sm text-token-text-muted mb-3">3 games available within 2 miles</p>
            <Link href="/instant-join">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-transparent border border-border text-token-text py-2 rounded-lg font-bold hover:bg-background transition-all transform hover:scale-105"
              >
                JOIN NOW 🚀
              </button>
            </Link>
          </div>


          {/* Main Navigation */}
          <div className="mb-6">
<h3 className="font-medium text-sm text-token-text mb-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-transparent border border-border rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-token-text rounded-full"></div>
              </div>
              Navigate
            </h3>
            <div className="space-y-1">
              {mainMenuItems.map((item, index) => (
                <Link key={index} href={item.href}>
                  <button 
                    onClick={() => {
                      onClose();
                      if (item.href !== "/") {
                        window.location.href = item.href;
                      }
                    }}
className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-transparent border border-border transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-transparent border border-border rounded-full flex items-center justify-center group-hover:bg-background transition-all duration-200">
                        <item.icon className="w-4 h-4 text-token-text-muted group-hover:scale-110 transition-transform duration-200" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm text-token-text">{item.name}</p>
                        <p className="text-xs text-token-text-muted">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="text-xs bg-transparent border border-border text-token-text px-2 py-1 rounded-full">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-token-text-muted group-hover:text-token-text transition-all duration-200 group-hover:translate-x-1" />
                    </div>
                  </button>
                </Link>
              ))}
            </div>
          </div>

          {/* Account Section */}
          <div className="mb-6">
<h3 className="font-medium text-sm text-token-text mb-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-transparent border border-border rounded-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-token-text rounded-full mb-0.5"></div>
                <div className="w-3 h-1.5 bg-token-text rounded-b-full"></div>
              </div>
              Account
            </h3>
            <div className="space-y-1">
              {accountItems.map((item, index) => (
                <Link key={index} href={item.href}>
                  <button 
                    onClick={() => {
                      onClose();
                      if (item.href !== "#") {
                        window.location.href = item.href;
                      }
                    }}
className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-transparent border border-border transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-transparent border border-border rounded-full flex items-center justify-center group-hover:bg-background transition-all duration-200">
                        <item.icon className="w-4 h-4 text-token-text-muted group-hover:scale-110 transition-transform duration-200" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm text-token-text">{item.name}</p>
                        <p className="text-xs text-token-text-muted">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="text-xs bg-transparent border border-border text-token-text px-2 py-1 rounded-full">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-token-text-muted group-hover:text-token-text transition-all duration-200 group-hover:translate-x-1" />
                    </div>
                  </button>
                </Link>
              ))}
            </div>
          </div>

          {/* Support Section */}
          <div className="mb-6">
<h3 className="font-medium text-sm text-token-text mb-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-transparent border border-border rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-transparent border border-border rounded-full flex items-center justify-center">
                  <div className="w-1 h-1 bg-token-text rounded-full"></div>
                </div>
              </div>
              Support
            </h3>
            <div className="space-y-1">
              {supportItems.map((item, index) => (
                <Link key={index} href={item.href}>
                  <button 
                    onClick={() => {
                      onClose();
                      if (item.href !== "#") {
                        window.location.href = item.href;
                      }
                    }}
className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-transparent border border-border transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-transparent border border-border rounded-full flex items-center justify-center group-hover:bg-background transition-all duration-200">
                        <item.icon className="w-4 h-4 text-token-text-muted group-hover:scale-110 transition-transform duration-200" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm text-token-text">{item.name}</p>
                        <p className="text-xs text-token-text-muted">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-token-text" />
                  </button>
                </Link>
              ))}
            </div>
          </div>

          {/* Profile Section */}
          {user && (
            <div className="mt-6 pt-6 ">
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-transparent border border-border cursor-pointer">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                  <AvatarFallback>
                    {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-token-text">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.email
                    }
                  </p>
                  <p className="text-xs text-token-text">View your profile</p>
                </div>
              </div>
              
              <Button
                onClick={() => {
                  window.location.href = "/api/logout";
                }}
                variant="outline"
                className="w-full mt-3  text-token-text hover:bg-transparent border border-border"
              >
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
