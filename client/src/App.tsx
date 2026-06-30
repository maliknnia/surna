import { Suspense, lazy, useEffect } from "react";
import { Switch, Route, useLocation, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AccessibilityProvider } from "@/components/accessibility/AccessibilityProvider";
import { useAuth } from "@/hooks/useAuth";
import { prefetchCsrfToken } from "@/lib/csrf";
import { apiRequest } from "@/lib/queryClient";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ConnectivityIndicator, ConnectivityToast } from "@/components/ui/connectivity-indicator";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { registerSW, initializePWAInstall, initializeOfflineStorage } from "@/lib/serviceWorkerRegistration";
import FirstTimeThemeSelector from "@/components/FirstTimeThemeSelector";
import CookieConsent from "@/components/CookieConsent";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { OnboardingGate } from "@/components/OnboardingGate";
import PushNotificationInit from "@/components/PushNotificationInit";
import { SurnaCameraProvider, SurnaCamera } from "@/features/camera";

// Previously pre-loaded — now lazy so they don't block first paint of MobileHome.
const Coaches = lazy(() => import("@/pages/Coaches"));
const Teams = lazy(() => import("@/pages/Teams"));
const EventsPage = lazy(() => import("@/components/events/EventsPage"));

// Package #4: Team Profiles
const TeamPage = lazy(() => import("@/pages/team/TeamPage"));
const TeamPlayerPage = lazy(() => import("@/pages/team/TeamPlayerPage"));

// Package #5: legacy person profile — redirects to ProfilePage via /person/:id

// Keep heavy pages lazy loaded
const Feed = lazy(() => import("@/pages/Feed"));
const Messages = lazy(() => import("@/pages/Messages"));
const Marketplace = lazy(() => import("@/pages/Marketplace"));
const Search = lazy(() => import("@/pages/Search"));
const MediaManager = lazy(() => import("@/pages/MediaManager"));
const Realtime = lazy(() => import("@/pages/Realtime"));
const AnalyticsHub = lazy(() => import("@/pages/AnalyticsHub"));

// Event pages
const EventDetailsPage = lazy(() => import("@/pages/events/EventDetailsPage"));
const EventRoutePage = lazy(() => import("@/pages/events/EventRoutePage"));

// Sports Hub pages - Consolidated into DiscoveryHub
// (All sports functionality now available in /discover)
const Settings = lazy(() => import("@/pages/Settings"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const ProfileEditor = lazy(() => import("@/pages/ProfileEditor"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const Subscribe = lazy(() => import("@/pages/Subscribe"));
const Billing = lazy(() => import("@/pages/Billing"));
const SellerDashboard = lazy(() => import("@/pages/SellerDashboard"));
const ComplianceDashboard = lazy(() => import("@/pages/ComplianceDashboard"));
const AccessibilityDemo = lazy(() => import("@/pages/AccessibilityDemo"));
const Gamification = lazy(() => import("@/pages/Gamification"));
const Recommendations = lazy(() => import("@/pages/Recommendations"));
// Performance consolidated into PerformanceHub (line 77)
const ReferralPage = lazy(() => import("@/pages/ReferralPage"));
const GrowthPage = lazy(() => import("@/pages/GrowthPage"));
const NotificationsPage = lazy(() => import("@/pages/Notifications"));
const DiscoverPeople = lazy(() => import("@/pages/DiscoverPeople"));
// Package #13: Admin Control System
const AdminDashboard13 = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminContentPage = lazy(() => import("@/pages/admin/AdminContentPage"));
const AdminHealthPage = lazy(() => import("@/pages/admin/AdminHealthPage"));

// AdminAnalyticsDashboard consolidated into AnalyticsHub
const PaymentCancel = lazy(() => import("@/pages/PaymentCancel"));
const SecuritySettings = lazy(() => import("@/pages/SecuritySettings"));
const PrivacySettingsPage = lazy(() => import("@/pages/PrivacySettings"));
const TeamManagement = lazy(() => import("@/pages/TeamManagement"));
const EventCreation = lazy(() => import("@/pages/EventCreation"));
const CreateHub = lazy(() => import("@/pages/CreateHub"));
const CreateEventWizardPage = lazy(() => import("@/pages/create/CreateEventWizardPage"));
const CreateTeamPage = lazy(() => import("@/pages/create/CreateTeamPage"));

// Discovery Hub pages
const DiscoveryHub = lazy(() => import("@/pages/hub/DiscoveryHub"));

// Places pages
const PlacesDiscovery = lazy(() => import("@/pages/PlacesDiscovery"));
const CreatePlace = lazy(() => import("@/pages/CreatePlace"));
const PlaceProfile = lazy(() => import("@/pages/PlaceProfile"));
const ManagePlaceProfile = lazy(() => import("@/pages/ManagePlaceProfile"));
const MainMapPage = lazy(() => import("@/pages/Map"));

// Marketplace pages
const ShopProfile = lazy(() => import("@/pages/ShopProfile"));
const Cart = lazy(() => import("@/pages/Cart"));

// Challenges pages
const ChallengesHome = lazy(() => import("@/pages/challenges/ChallengesHome"));
const CreateChallenge = lazy(() => import("@/pages/challenges/CreateChallenge"));
const ChallengePage = lazy(() => import("@/pages/challenges/ChallengePage"));

// Sports discovery page
const Sports = lazy(() => import("@/pages/Sports"));

// Instant Teams pages
const InstantJoinHub = lazy(() => import("@/pages/InstantJoinHub"));
const CreateInstantTeam = lazy(() => import("@/pages/CreateInstantTeam"));
const InstantTeamProfile = lazy(() => import("@/pages/InstantTeamProfile"));

// Coach profile page
const CoachProfile = lazy(() => import("@/pages/CoachProfile"));

// SURNA Pro standalone app
const ProApp = lazy(() => import("@/pages/pro/ProApp"));
const TournamentPublicPage = lazy(() =>
  import("@/pages/pro/ProTournament").then((m) => ({ default: m.TournamentPublicPage })),
);

// My Hub - light mobile management center (Task #36)
const MyHubHome = lazy(() => import("@/pages/my-hub/MyHubHome"));
const MyHubEventsPage = lazy(() => import("@/pages/my-hub/MyHubEventsPage"));
const MyHubTeamsPage = lazy(() => import("@/pages/my-hub/MyHubTeamsPage"));
const MyHubPlacesPage = lazy(() => import("@/pages/my-hub/MyHubPlacesPage"));
const MyHubShopsPage = lazy(() => import("@/pages/my-hub/MyHubShopsPage"));
const MyHubRequestsPage = lazy(() => import("@/pages/my-hub/MyHubRequestsPage"));
const MyHubSectionPlaceholder = lazy(() => import("@/pages/my-hub/MyHubSectionPlaceholder"));

// Keep light pages as regular imports
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Help from "@/pages/Help";
import WorkWithUs from "@/pages/WorkWithUs";
import JoinUs from "@/pages/JoinUs";
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
import CoachSignup from "@/pages/monetization/CoachSignup";
import CoachScheduleSettings from "@/pages/CoachScheduleSettings";
import CoachProfileEditor from "@/pages/CoachProfileEditor";
import TeamRegistration from "@/pages/monetization/TeamRegistration";
import GymListing from "@/pages/monetization/GymListing";
import AffiliateProgram from "@/pages/monetization/AffiliateProgram";
import MonetizationComingSoon from "@/pages/monetization/MonetizationComingSoon";
import AppStructure from "@/pages/AppStructure";
import PaymentSuccess from "@/pages/PaymentSuccess";
import NotFound from "@/pages/not-found";
import MobileHome from "@/pages/MobileHome";
const PerformanceHub = lazy(() => import("@/pages/PerformanceHub"));
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";

function PersonProfileRedirect() {
  const [, params] = useRoute("/person/:id");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const id = params?.id;
    if (id) setLocation(`/profile/${id}`);
  }, [params?.id, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surna-void)" }}>
      <div className="w-8 h-8 border-2 border-border border-t-white rounded-full animate-spin" />
    </div>
  );
}

function UserProfileRedirect() {
  const [, params] = useRoute("/user/:id");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const id = params?.id;
    if (id) setLocation(`/profile/${id}`);
  }, [params?.id, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surna-void)" }}>
      <div className="w-8 h-8 border-2 border-border border-t-white rounded-full animate-spin" />
    </div>
  );
}

function JoinPathRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      localStorage.setItem("pending_referrer_id", ref);
    }
    setLocation("/login");
  }, [setLocation]);
  return null;
}

function Router() {
  const { isLoading, user } = useAuth();

  useEffect(() => {
    if (user) prefetchCsrfToken();
  }, [user]);

  useEffect(() => {
    const pendingReferrerId = localStorage.getItem("pending_referrer_id");
    const currentUserId = (user as any)?.id;
    if (!pendingReferrerId || !currentUserId || pendingReferrerId === currentUserId) return;
    apiRequest("POST", "/api/referrals/process-signup", {
      referralCode: pendingReferrerId,
      userId: currentUserId,
    })
      .catch(() => {})
      .finally(() => {
        localStorage.removeItem("pending_referrer_id");
      });
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-muted border-t-surna-red rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="p-6 flex items-center justify-center min-h-screen bg-background">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-muted border-t-surna-red rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <Switch>
        <Route path="/" component={() => <ProtectedRoute component={MobileHome} />} />
        <Route path="/landing" component={Landing} />
        <Route path="/mobile" component={MobileHome} />
        <Route path="/login" component={Login} />
        <Route path="/signin" component={Login} />
        <Route path="/auth/login" component={Login} />
        <Route path="/join" component={JoinPathRedirect} />
        
        {/* Sports Discovery */}
        <Route path="/sports" component={() => <ProtectedRoute component={Sports} />} />
        
        {/* Discovery Hub - Single Sliding Interface */}
        <Route path="/discover" component={() => <ProtectedRoute component={DiscoveryHub} />} />
        
        <Route path="/create" component={() => <ProtectedRoute component={CreateHub} />} />

        <Route path="/teams" component={() => <ProtectedRoute component={Teams} />} />
        <Route path="/teams/create" component={() => <ProtectedRoute component={CreateTeamPage} />} />
        <Route path="/teams/:teamId/player/:userId" component={() => <ProtectedRoute component={TeamPlayerPage} />} />
        <Route path="/teams/:id" component={() => <ProtectedRoute component={TeamPage} />} />
        <Route path="/team/:id" component={() => <ProtectedRoute component={TeamPage} />} />
        <Route path="/teams/manage" component={() => <ProtectedRoute component={MyHubTeamsPage} />} />
        <Route path="/events" component={() => <ProtectedRoute component={EventsPage} />} />
        <Route path="/events/create" component={() => <ProtectedRoute component={CreateEventWizardPage} />} />
        <Route path="/events/:id/route" component={() => <ProtectedRoute component={EventRoutePage} />} />
        <Route path="/events/:id" component={() => <ProtectedRoute component={EventDetailsPage} />} />
        <Route path="/event/:id" component={() => <ProtectedRoute component={EventDetailsPage} />} />
        
        {/* Challenges Routes (Package #10) */}
        <Route path="/challenges" component={() => <ProtectedRoute component={ChallengesHome} />} />
        <Route path="/challenges/create" component={() => <ProtectedRoute component={CreateChallenge} />} />
        <Route path="/challenges/:id" component={() => <ProtectedRoute component={ChallengePage} />} />
        <Route path="/challenge/:id" component={() => <ProtectedRoute component={ChallengePage} />} />

        {/* My Hub - light mobile management center */}
        <Route path="/my-hub" component={() => <ProtectedRoute component={MyHubHome} />} />
        <Route path="/my-hub/events" component={() => <ProtectedRoute component={MyHubEventsPage} />} />
        <Route path="/my-hub/teams" component={() => <ProtectedRoute component={MyHubTeamsPage} />} />
        <Route path="/my-hub/places" component={() => <ProtectedRoute component={MyHubPlacesPage} />} />
        <Route path="/my-hub/shops" component={() => <ProtectedRoute component={MyHubShopsPage} />} />
        <Route path="/my-hub/requests" component={() => <ProtectedRoute component={MyHubRequestsPage} />} />
        <Route path="/my-hub/:section" component={() => <ProtectedRoute component={MyHubSectionPlaceholder} />} />

        {/* SURNA Pro standalone app */}
        <Route path="/pro/:rest*" component={() => <ProtectedRoute component={ProApp} />} />
        <Route path="/pro" component={() => <ProtectedRoute component={ProApp} />} />

        <Route path="/tournament/:id" component={() => <ProtectedRoute component={TournamentPublicPage} />} />

        {/* Instant Teams */}
        <Route path="/instant-join" component={() => <ProtectedRoute component={InstantJoinHub} />} />
        <Route path="/instant-teams/create" component={() => <ProtectedRoute component={CreateInstantTeam} />} />
        <Route path="/instant-teams/:id" component={() => <ProtectedRoute component={InstantTeamProfile} />} />
        
        {/* Places Routes */}
        <Route path="/places" component={() => <ProtectedRoute component={PlacesDiscovery} />} />
        <Route path="/places/create" component={() => <ProtectedRoute component={CreatePlace} />} />
        <Route path="/places/:id/manage" component={() => <ProtectedRoute component={ManagePlaceProfile} />} />
        <Route path="/places/:id" component={() => <ProtectedRoute component={PlaceProfile} />} />
        <Route path="/place/:id" component={() => <ProtectedRoute component={PlaceProfile} />} />
        <Route path="/map" component={() => <ProtectedRoute component={MainMapPage} />} />
        <Route path="/notifications" component={() => <ProtectedRoute component={NotificationsPage} />} />
        <Route path="/discover/people" component={() => <ProtectedRoute component={DiscoverPeople} />} />
        
        <Route path="/messages" component={() => <ProtectedRoute component={Messages} />} />
        <Route path="/search" component={() => <ProtectedRoute component={Search} />} />
        <Route path="/coaches" component={() => <ProtectedRoute component={Coaches} />} />
        <Route path="/coaches/:id" component={() => <ProtectedRoute component={CoachProfile} />} />
        <Route path="/coach/schedule" component={() => <ProtectedRoute component={CoachScheduleSettings} />} />
        <Route path="/coach/profile" component={() => <ProtectedRoute component={CoachProfileEditor} />} />
        <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
        <Route path="/security" component={() => <ProtectedRoute component={SecuritySettings} />} />
        <Route path="/privacy-settings" component={() => <ProtectedRoute component={PrivacySettingsPage} />} />
        <Route path="/payment-history" component={() => <ProtectedRoute component={lazy(() => import("@/pages/PaymentHistory"))} />} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/help" component={Help} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/work-with-us" component={WorkWithUs} />
        <Route path="/join-us" component={JoinUs} />
        <Route path="/monetization/coach-signup" component={CoachSignup} />
        <Route path="/monetization/team-registration" component={TeamRegistration} />
        <Route path="/monetization/gym-listing" component={GymListing} />
        <Route path="/monetization/affiliate-program" component={AffiliateProgram} />
        <Route path="/monetization/:program" component={MonetizationComingSoon} />
        <Route path="/feed" component={() => <ProtectedRoute component={Feed} />} />
        <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
        <Route path="/profile/edit" component={() => <ProtectedRoute component={ProfileEditor} />} />
        <Route path="/profile/:userId" component={() => <ProtectedRoute component={ProfilePage} />} />
        <Route path="/person/:id" component={PersonProfileRedirect} />
        <Route path="/user/:id" component={UserProfileRedirect} />
        <Route path="/structure" component={AppStructure} />
        <Route path="/checkout" component={() => <ProtectedRoute component={Checkout} />} />
        <Route path="/payment-success" component={() => <ProtectedRoute component={PaymentSuccess} />} />
        <Route path="/subscribe" component={() => <ProtectedRoute component={Subscribe} />} />
        <Route path="/subscription-success" component={() => <ProtectedRoute component={PaymentSuccess} />} />
        <Route path="/billing" component={() => <ProtectedRoute component={Billing} />} />
        <Route path="/seller/dashboard" component={() => <ProtectedRoute component={SellerDashboard} />} />
        <Route path="/marketplace" component={() => <ProtectedRoute component={Marketplace} />} />
        <Route path="/marketplace/shops/:shopId" component={() => <ProtectedRoute component={ShopProfile} />} />
        <Route path="/marketplace/product/:id" component={() => <ProtectedRoute component={lazy(() => import("@/pages/product-detail"))} />} />
        <Route path="/marketplace/cart" component={() => <ProtectedRoute component={Cart} />} />
        <Route path="/marketplace/checkout" component={() => <ProtectedRoute component={lazy(() => import("@/pages/marketplace-checkout"))} />} />
        <Route path="/wishlist" component={() => <ProtectedRoute component={lazy(() => import("@/pages/wishlist"))} />} />
        <Route path="/saved" component={() => <ProtectedRoute component={lazy(() => import("@/pages/SavedPosts"))} />} />
        <Route path="/media" component={() => <ProtectedRoute component={MediaManager} />} />
        <Route path="/realtime" component={() => <ProtectedRoute component={Realtime} />} />
        <Route path="/analytics" component={() => <ProtectedRoute component={AnalyticsHub} />} />
        <Route path="/analytics/user/:id" component={() => <ProtectedRoute component={lazy(() => import("@/pages/UserAnalytics"))} />} />
        <Route path="/analytics/team/:id" component={() => <ProtectedRoute component={lazy(() => import("@/pages/TeamAnalytics"))} />} />
        <Route path="/analytics/gym/:id" component={() => <ProtectedRoute component={lazy(() => import("@/pages/GymAnalytics"))} />} />
        <Route path="/analytics/event/:id" component={() => <ProtectedRoute component={lazy(() => import("@/pages/EventAnalytics"))} />} />
        <Route path="/analytics/marketplace" component={() => <ProtectedRoute component={lazy(() => import("@/pages/MarketplaceAnalytics"))} />} />
        <Route path="/analytics/admin" component={() => <ProtectedRoute component={lazy(() => import("@/pages/AdminAnalytics"))} />} />
        <Route path="/compliance" component={() => <ProtectedRoute component={ComplianceDashboard} />} />
        <Route path="/accessibility-demo" component={AccessibilityDemo} />
        <Route path="/gamification" component={() => <ProtectedRoute component={Gamification} />} />
        <Route path="/challenge" component={() => <ProtectedRoute component={ChallengesHome} />} />
        <Route path="/calendar" component={() => <ProtectedRoute component={CalendarPage} />} />
        <Route path="/recommendations" component={() => <ProtectedRoute component={Recommendations} />} />
        <Route path="/performance" component={PerformanceHub} />
        <Route path="/performance-hub" component={PerformanceHub} />
        <Route path="/activity/track" component={() => <ProtectedRoute component={lazy(() => import("@/pages/ActivityTrackPage"))} />} />
        <Route path="/referrals" component={() => <ProtectedRoute component={ReferralPage} />} />
        <Route path="/growth" component={() => <ProtectedRoute component={GrowthPage} />} />
        
        {/* Package #13: Admin Control System */}
        <Route path="/admin" component={() => <ProtectedRoute component={AdminDashboard13} />} />
        <Route path="/admin/users" component={() => <ProtectedRoute component={AdminUsersPage} />} />
        <Route path="/admin/content" component={() => <ProtectedRoute component={AdminContentPage} />} />
        <Route path="/admin/health" component={() => <ProtectedRoute component={AdminHealthPage} />} />
        <Route path="/admin/analytics" component={() => <ProtectedRoute component={AnalyticsHub} />} />
        
        <Route path="/payment-cancel" component={PaymentCancel} />

        {/* Aliases for legacy/short paths referenced across the app */}
        <Route path="/product/:id" component={() => <ProtectedRoute component={lazy(() => import("@/pages/product-detail"))} />} />
        <Route path="/rewards"      component={() => <ProtectedRoute component={Gamification} />} />
        <Route path="/goals"        component={() => <ProtectedRoute component={PerformanceHub} />} />
        <Route path="/schedule"     component={() => <ProtectedRoute component={CalendarPage} />} />
        <Route path="/leaderboards" component={() => <ProtectedRoute component={ChallengesHome} />} />
        <Route path="/marketplace/shop/:shopId" component={() => <ProtectedRoute component={ShopProfile} />} />
        <Route path="/cart"         component={() => <ProtectedRoute component={Cart} />} />
        <Route path="/wallet"       component={() => <ProtectedRoute component={Billing} />} />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      registerSW();
    }

    // Service worker disabled in production until cache strategy is stable (was causing stuck "Loading…").

    // Initialize PWA install prompt
    initializePWAInstall();

    // Initialize offline storage
    initializeOfflineStorage();

    // Add PWA manifest to head if not already present
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);
    }

  }, []);

  return (
    <AccessibilityProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SurnaCameraProvider>
          <TooltipProvider>
            <div className="relative min-h-screen bg-background">
              <EmailVerificationBanner />
              {/* First-time theme selector modal */}
              <FirstTimeThemeSelector />
              <OnboardingGate>
                <PushNotificationInit />
                <Router />
              </OnboardingGate>
              
              {/* PWA Install Prompt */}
              <InstallPrompt />
              
              {/* Global connectivity notifications */}
              <ConnectivityToast />
              <CookieConsent />
              <Toaster />
              <SurnaCamera />
            </div>
          </TooltipProvider>
          </SurnaCameraProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AccessibilityProvider>
  );
}

export default App;
