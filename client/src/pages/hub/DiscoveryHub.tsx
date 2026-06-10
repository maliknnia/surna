import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { MessageCircle, ArrowLeft, MapPin, Users, Map, GraduationCap, Calendar, Trophy, MoreHorizontal, Award, Zap, UserPlus, Settings, Plus } from "lucide-react";
import { useLocation } from "wouter";
import SurnaLogo from "@/components/SurnaLogo";
import MessengerModal from "@/components/MessengerModal";
import { flags } from "@/config/flags";

// Lazy load panel components for better performance
const MapPlacesHub = lazy(() => import("./MapPlacesHub"));
const Coaches = lazy(() => import("../Coaches"));
const Teams = lazy(() => import("../Teams"));
const SportsCategoriesPanel = lazy(() => import("./SportsCategoriesPanel"));
const EventsPage = lazy(() => import("@/components/events/EventsPage"));

// Loading skeleton component for lazy panels
const LazyPanelSkeleton = () => (
  <div className="animate-pulse p-4">
    <div className="h-6 bg-transparent border border-border rounded mb-4 w-1/3"></div>
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 bg-transparent border border-border rounded"></div>
      ))}
    </div>
  </div>
);

// Lazy panel components with suspense
const PlacesPanel = () => (
  <Suspense fallback={<LazyPanelSkeleton />}>
    <MapPlacesHub viewMode="list" />
  </Suspense>
);
const MapPanel = () => (
  <Suspense fallback={<LazyPanelSkeleton />}>
    <MapPlacesHub viewMode="map" />
  </Suspense>
);
const EventsPanel = () => (
  <Suspense fallback={<LazyPanelSkeleton />}>
    <EventsPage compact={true} maxEvents={12} />
  </Suspense>
);
const CoachesPanel = () => (
  <Suspense fallback={<LazyPanelSkeleton />}>
    <Coaches embedded />
  </Suspense>
);
const TeamsPanel = () => (
  <Suspense fallback={<LazyPanelSkeleton />}>
    <Teams />
  </Suspense>
);
const SportsPanel = () => (
  <Suspense fallback={<LazyPanelSkeleton />}>
    <SportsCategoriesPanel />
  </Suspense>
);

type ActivePanel = 'places' | 'teams' | 'map' | 'coaches' | 'events' | 'sports';

// No longer needed - using conditional rendering instead of scroll snap

const navigationIcons = [
  { key: 'places', icon: MapPin, label: 'Places', enabled: flags.placesEnabled },
  { key: 'teams', icon: Users, label: 'Teams', enabled: flags.teamsEnabled },
  { key: 'map', icon: Map, label: 'Map', enabled: flags.mapEnabled },
  { key: 'coaches', icon: GraduationCap, label: 'Coaches', enabled: flags.coachesEnabled },
  { key: 'events', icon: Calendar, label: 'Events', enabled: flags.eventsEnabled },
  { key: 'sports', icon: Trophy, label: 'Sports', enabled: true },
].filter(item => item.enabled);

export default function DiscoveryHub() {
  const [messengerModalOpen, setMessengerModalOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>('places');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [, setLocation] = useLocation();
  const [headerVisible, setHeaderVisible] = useState(false);
  const lastScrollYRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Show header always for Sports panel, scroll-up-to-reveal for others
  useEffect(() => {
    if (activePanel === 'sports') {
      setHeaderVisible(true);
      return;
    }

    const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const currentScrollY = container.scrollTop;
      const lastScrollY = lastScrollYRef.current;

      if (currentScrollY < lastScrollY && currentScrollY > 10) {
        // Scrolling up (and not at very top) - show header
        setHeaderVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down - hide header
        setHeaderVisible(false);
      } else if (currentScrollY <= 10) {
        // At the very top - hide header for clean view
        setHeaderVisible(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [activePanel]);

  const handlePanelChange = (panel: ActivePanel) => {
    if (panel === activePanel) return;
    
    setIsTransitioning(true);
    setActivePanel(panel);
    
    // Reset transition state after animation
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleBackToPersonalized = () => {
    setLocation("/"); // Navigate back to main personalized page
  };

  return (
    <main className="min-h-[100dvh] flex flex-col bg-background text-token-text">
      {/* Header floats above nav - slides in from above viewport */}
      <header className={`h-[60px] px-4 py-3 flex items-center justify-between transition-transform duration-300 fixed top-0 left-0 right-0 z-50 bg-background ${
        headerVisible ? 'translate-y-0' : 'translate-y-[-100%]'
      }`}>
        {/* Left: Back button + SURNA Logo + Text */}
        <div className="flex items-center">
          <button
            onClick={handleBackToPersonalized}
            className="p-1.5 mr-2 text-token-text opacity-70 hover:opacity-100 transition-colors duration-200 rounded-lg hover:bg-muted/40"
            data-testid="back-button"
          >
            <ArrowLeft size={18} strokeWidth={1.5} />
          </button>
          <SurnaLogo className="h-6 w-auto mr-2" showText={true} />
        </div>
        
        {/* Right: Messenger + 3-dots */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMessengerModalOpen(true)}
            className="p-2 text-token-text opacity-70 hover:opacity-100 transition-colors duration-200 rounded-lg hover:bg-muted/40"
            data-testid="messenger-icon"
          >
            <MessageCircle size={20} strokeWidth={1.5} />
          </button>
          
          <HubMenu />
        </div>
      </header>

      {/* Nav fixed at top - moves down when header appears */}
      <nav className={`px-2 py-2 bg-background fixed left-0 right-0 z-40 transition-all duration-300 ${
        headerVisible ? 'top-[60px]' : 'top-0'
      }`}>
        <div className="flex items-center justify-around max-w-full">
          {navigationIcons.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => handlePanelChange(key as ActivePanel)}
              className={`flex flex-col items-center gap-1 px-2 py-2 transition-all duration-200 min-w-0 flex-1 ${
                activePanel === key 
                  ? "text-token-text scale-110" 
                  : "text-token-text opacity-60 hover:opacity-80"
              }`}
              data-testid={`nav-${key}`}
            >
              <Icon 
                size={20} 
                strokeWidth={activePanel === key ? 2.5 : 1.5} 
              />
              <span className={`text-xs font-medium truncate ${
                activePanel === key ? "font-semibold" : ""
              }`}>
                {label}
              </span>
              {activePanel === key && (
                <div className="w-1 h-1 bg-token-text rounded-full"></div>
              )}
            </button>
          ))}
        </div>
        
        {/* Loading indicator during transition */}
        {isTransitioning && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-black via-neutral-600 to-black dark:from-white dark:via-neutral-300 dark:to-white animate-pulse"></div>
        )}
      </nav>

      {/* Spacer for fixed nav - adjusts when header appears */}
      <div className={`flex-shrink-0 transition-all duration-300 ${
        headerVisible ? 'h-[116px]' : 'h-[56px]'
      }`}></div>

      {/* Conditional Panel Rendering - Instagram Style / Full-screen Map */}
      <section className={`${
        activePanel === 'map' 
          ? 'fixed inset-0 top-[56px]' 
          : 'flex-1 min-h-0 p-2'
      }`}>
        <div ref={scrollContainerRef} className={`h-full bg-background ${
          activePanel === 'map' 
            ? 'overflow-hidden' 
            : 'rounded-xl p-2 overflow-y-auto'
        }`}>
          {activePanel === "places" && (
            <div className="h-full animate-in fade-in duration-300">
              <PlacesPanel />
            </div>
          )}
          
          {activePanel === "teams" && (
            <div className="h-full animate-in fade-in duration-300">
              <TeamsPanel />
            </div>
          )}
          
          {activePanel === "map" && (
            <div className="h-full animate-in fade-in duration-300">
              <MapPanel />
            </div>
          )}
          
          {activePanel === "coaches" && (
            <div className="h-full animate-in fade-in duration-300">
              <CoachesPanel />
            </div>
          )}
          
          {activePanel === "events" && (
            <div className="h-full animate-in fade-in duration-300">
              <EventsPanel />
            </div>
          )}
          
          {activePanel === "sports" && (
            <div className="h-full animate-in fade-in duration-300">
              <SportsPanel />
            </div>
          )}
        </div>
      </section>

      {/* Messenger Modal */}
      <MessengerModal
        isOpen={messengerModalOpen}
        onClose={() => setMessengerModalOpen(false)}
      />
    </main>
  );
}

// HomePanel now uses the main Home component

function HubMenu() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative">
      <details className="group">
        <summary className="list-none cursor-pointer p-2 text-token-text opacity-70 hover:opacity-100 transition-colors duration-200 rounded-lg hover:bg-muted/40">
          <MoreHorizontal size={20} strokeWidth={1.5} />
        </summary>
        <div className="absolute right-0 mt-2 w-56 bg-background rounded-xl shadow-lg z-20 overflow-hidden">
          {/* Leaderboards */}
          <MenuItem 
            icon={Award}
            label="Leaderboards" 
            description="View rankings"
            onClick={() => setLocation("/gamification")}
            show={flags.menu.leaderboards} 
          />
          
          {/* Create */}
          <CreateMenuItem show={flags.menu.create} />
          
          {/* Challenges */}
          <MenuItem 
            icon={Zap}
            label="Challenges" 
            description="Join competitions"
            onClick={() => setLocation("/challenges")}
            show={flags.menu.challenge} 
          />
          
          {/* Calendar */}
          <MenuItem 
            icon={Calendar}
            label="Calendar" 
            description="View events"
            onClick={() => setLocation("/calendar")}
            show={flags.menu.calendar} 
          />
          
          {/* Discover People */}
          <MenuItem 
            icon={UserPlus}
            label="Discover People" 
            description="Find athletes near you"
            onClick={() => setLocation("/discover/people")}
            show={true} 
          />
          
          {/* Join Us */}
          <MenuItem 
            icon={UserPlus}
            label="Join Us" 
            description="Invite friends"
            onClick={() => setLocation("/join-us")}
            show={flags.menu.joinUs} 
          />
          
          {/* Settings */}
          <div className=" mt-1 pt-1">
            <MenuItem 
              icon={Settings}
              label="Settings" 
              description="App preferences"
              onClick={() => setLocation("/settings")}
              show={true} 
            />
          </div>
        </div>
      </details>
    </div>
  );
}

function MenuItem({ 
  icon: Icon, 
  label, 
  description, 
  onClick, 
  show 
}: { 
  icon: any; 
  label: string; 
  description: string; 
  onClick: () => void; 
  show: boolean; 
}) {
  if (!show) return null;
  return (
    <button 
      onClick={onClick}
      className="w-full text-left px-4 py-3 hover:bg-muted/40 rounded-xl transition-colors group flex items-center space-x-3"
      data-testid={`menu-${label.toLowerCase()}`}
    >
      <div className="w-8 h-8 bg-muted/40 rounded-lg flex items-center justify-center group-hover:bg-muted/40 transition-colors">
        <Icon size={16} className="text-token-text opacity-80" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-token-text truncate">{label}</div>
        <div className="text-xs text-token-text opacity-70 truncate">{description}</div>
      </div>
    </button>
  );
}

function CreateMenuItem({ show }: { show: boolean }) {
  const [, setLocation] = useLocation();

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={() => setLocation("/create")}
      className="w-full text-left px-4 py-3 hover:bg-muted/40 rounded-xl transition-colors group flex items-center space-x-3"
      data-testid="menu-create"
    >
      <div className="w-8 h-8 bg-muted/40 rounded-lg flex items-center justify-center group-hover:bg-muted/40 transition-colors">
        <Plus size={16} className="text-token-text opacity-80" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-token-text truncate">Create</div>
        <div className="text-xs text-token-text opacity-70 truncate">Events, teams, places & more</div>
      </div>
    </button>
  );
}

function PanelSkeleton({ title }: { title: string }) {
  return (
    <div className="p-6">
      <div className="animate-pulse space-y-3">
        <div className="h-8 bg-muted/40 rounded-xl w-32"></div>
        <div className="h-4 bg-muted/40 rounded-xl w-full"></div>
        <div className="h-4 bg-muted/40 rounded-xl w-3/4"></div>
      </div>
    </div>
  );
}


function NotificationItem({ title, message, time }: { title: string; message: string; time: string }) {
  return (
    <div className="p-3 hover:bg-muted/40 rounded-xl transition-colors">
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-medium text-sm">{title}</h4>
        <span className="text-xs text-token-text opacity-70">{time}</span>
      </div>
      <p className="text-sm text-token-text opacity-80">{message}</p>
    </div>
  );
}