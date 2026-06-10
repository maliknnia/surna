import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Users, MessageCircle, ShoppingBag, MoreVertical, Bell, Video, Zap, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import SurnaLogo from "@/components/SurnaLogo";

interface AnimatedNavigationProps {
  onSocialClick: () => void;
  onMessengerClick: () => void;
  onShoppingClick: () => void;
  onMenuClick: () => void;
  onNotificationClick?: () => void;
  unreadMessages?: number;
  unreadNotifications?: number;
  isSocialMode?: boolean;
  activeSocialTab?: string;
  onSocialTabChange?: (tab: string) => void;
}

export default function AnimatedNavigation({
  onSocialClick,
  onMessengerClick,
  onShoppingClick,
  onMenuClick,
  onNotificationClick,
  unreadMessages = 0,
  unreadNotifications = 0,
  isSocialMode = false,
  activeSocialTab = "feed",
  onSocialTabChange,
}: AnimatedNavigationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Handle social feed transition
  useEffect(() => {
    if (location === '/feed') {
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 500);
    }
  }, [location]);

  const handleSocialClick = () => {
    setIsTransitioning(true);
    
    // Instant navigation
    onSocialClick();
  };

  const handleTabChange = (tab: string) => {
    if (onSocialTabChange) {
      onSocialTabChange(tab);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 bg-transparent border border-border/95 backdrop-blur-sm shadow-sm  z-50 transition-all duration-500 ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      } ${isTransitioning ? 'transform scale-105' : ''}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-10">
          {/* Logo Section with Animation */}
          <div className={`flex items-center gap-2 transition-all duration-500 ${
            isSocialMode ? 'transform -translate-x-2 scale-95' : ''
          }`}>
            <SurnaLogo className="h-8 w-auto" showText={true} />
          </div>
          
          {/* Navigation Content - Pushed to far right corner */}
          <div className="flex items-center relative ml-auto">
            {/* Default Navigation */}
            <div className={`flex items-center space-x-2 transition-all duration-500 ease-in-out ${
              isSocialMode 
                ? 'transform translate-x-full opacity-0 pointer-events-none absolute' 
                : 'transform translate-x-0 opacity-100'
            }`}>
              {/* Social Icon */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSocialClick}
                className="p-2 rounded-full hover:bg-background transition-all duration-100 hover:scale-110 active:scale-95 transform"
              >
                <Users className="h-5 w-5 text-token-text stroke-[2.5] filter drop-shadow-sm" />
              </Button>
              
              {/* Messenger Icon */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onMessengerClick}
                className="p-2 rounded-full hover:bg-background transition-all duration-100 hover:scale-110 active:scale-95 transform"
              >
                <MessageCircle className="h-5 w-5 text-token-text stroke-[2.5] filter drop-shadow-sm" />
              </Button>
              
              {/* Notification Icon */}
              {onNotificationClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNotificationClick}
                  className="p-2 rounded-full hover:bg-background transition-all duration-100 hover:scale-110 active:scale-95 transform"
                >
                  <Bell className="h-5 w-5 text-token-text stroke-[2.5] filter drop-shadow-sm" />
                </Button>
              )}
              
              {/* Shopping Icon */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onShoppingClick}
                className="p-2 rounded-full hover:bg-background transition-all duration-100 hover:scale-110 active:scale-95 transform"
              >
                <ShoppingBag className="h-5 w-5 text-token-text stroke-[2.5] filter drop-shadow-sm" />
              </Button>
              
              {/* More Options Menu */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onMenuClick}
                className="p-2 rounded-full hover:bg-background transition-all duration-100 hover:scale-110 active:scale-95 transform"
              >
                <MoreVertical className="h-5 w-5 text-token-text stroke-[2.5] filter drop-shadow-sm" />
              </Button>
            </div>

            {/* Social Navigation Tabs */}
            <div className={`flex items-center space-x-2 bg-background rounded-full p-1 transition-all duration-500 ease-in-out ${
              isSocialMode 
                ? 'transform translate-x-0 opacity-100' 
                : 'transform -translate-x-full opacity-0 pointer-events-none absolute'
            }`}>
              <Button
                variant={activeSocialTab === "feed" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleTabChange("feed")}
                className={`rounded-full text-xs px-3 py-1.5 transition-all duration-200 ${
                  activeSocialTab === "feed" 
                    ? "bg-transparent border border-border text-token-text shadow-sm transform scale-105" 
                    : "text-token-text hover:bg-transparent border border-border"
                }`}
              >
                <Users className="h-3 w-3 mr-1" />
                Feed
              </Button>
              <Button
                variant={activeSocialTab === "videos" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleTabChange("videos")}
                className={`rounded-full text-xs px-3 py-1.5 transition-all duration-200 ${
                  activeSocialTab === "videos" 
                    ? "bg-transparent border border-border text-token-text shadow-sm transform scale-105" 
                    : "text-token-text hover:bg-transparent border border-border"
                }`}
              >
                <Video className="h-3 w-3 mr-1" />
                Videos
              </Button>
              <Button
                variant={activeSocialTab === "live" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleTabChange("live")}
                className={`rounded-full text-xs px-3 py-1.5 transition-all duration-200 ${
                  activeSocialTab === "live" 
                    ? "bg-transparent border border-border text-token-text shadow-sm transform scale-105" 
                    : "text-token-text hover:bg-transparent border border-border"
                }`}
              >
                <Zap className="h-3 w-3 mr-1" />
                Live
              </Button>
              <Button
                variant={activeSocialTab === "shorts" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleTabChange("shorts")}
                className={`rounded-full text-xs px-3 py-1.5 transition-all duration-200 ${
                  activeSocialTab === "shorts" 
                    ? "bg-transparent border border-border text-token-text shadow-sm transform scale-105" 
                    : "text-token-text hover:bg-transparent border border-border"
                }`}
              >
                <Hash className="h-3 w-3 mr-1" />
                Shorts
              </Button>
            </div>
          </div>
          
          {/* Right spacer for balance in social mode */}
          <div className={`transition-all duration-500 ${
            isSocialMode ? 'w-10 opacity-100' : 'w-0 opacity-0'
          }`}></div>
        </div>
      </div>

      {/* Loading indicator during transition */}
      {isTransitioning && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-black via-neutral-600 to-black dark:from-white dark:via-neutral-300 dark:to-white animate-pulse"></div>
      )}
    </nav>
  );
}