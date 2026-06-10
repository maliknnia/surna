import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useSmartBack } from "@/lib/navigation";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { logout } from "@/lib/auth";
import { flags } from "@/config/flags";
import {
  loadAppPreferences,
  saveAppPreferences,
  searchRadiusLabel,
  type AppPreferences,
  type DistanceUnit,
} from "@/lib/userPreferences";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { LocationSharingSettings } from "@/components/settings/LocationSharingSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Moon,
  Sun,
  MapPin,
  ChevronRight,
  LogOut,
  Eye,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function SettingsCard({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: typeof User;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </section>
  );
}

function NavRow({ href, label, description }: { href: string; label: string; description?: string }) {
  return (
    <Link href={href}>
      <button
        type="button"
        className="w-full flex items-center gap-3 py-3 text-left rounded-xl hover:bg-muted/40 px-2 -mx-2 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
    </Link>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  testId,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} data-testid={testId} />
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function Settings() {
  const { user } = useAuth();
  const goBack = useSmartBack({ fallback: "/" });
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadAppPreferences());
  const { presenceMe, updatePreferences } = useLocationSharing(null, !!user);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setBio(user.bio || "");
  }, [user]);

  const patchPrefs = (patch: Partial<AppPreferences>) => {
    void updatePreferences(patch).then((next) => setPrefs(next));
  };

  const profileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/user/profile", {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile saved", description: "Your changes are live." });
    },
    onError: (err: Error) => {
      toast({ title: "Could not save profile", description: err.message, variant: "destructive" });
    },
  });

  const handlePushToggle = async (enabled: boolean) => {
    if (!enabled) {
      setPushEnabled(false);
      toast({ title: "Push notifications off" });
      return;
    }

    setPushBusy(true);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast({
          title: "Not supported",
          description: "Push notifications are not available in this browser.",
          variant: "destructive",
        });
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({
          title: "Permission denied",
          description: "Allow notifications in your browser settings.",
          variant: "destructive",
        });
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey =
        import.meta.env.VITE_VAPID_PUBLIC_KEY ||
        "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subscriptionJson = subscription.toJSON();
      await apiRequest("POST", "/api/push/subscribe", {
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys?.p256dh,
        auth: subscriptionJson.keys?.auth,
        deviceType: /mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
        userId: user?.id,
        isActive: true,
      });

      setPushEnabled(true);
      toast({ title: "Push notifications on", description: "You will get alerts for messages and events." });
    } catch {
      toast({
        title: "Subscription failed",
        description: "Could not enable push notifications.",
        variant: "destructive",
      });
    } finally {
      setPushBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      window.location.href = "/api/logout";
    }
  };

  const radiusOptions = [
    { km: 2, label: "2 km" },
    { km: 5, label: "5 km" },
    { km: 10, label: "10 km" },
    { km: 25, label: "25 km" },
    { km: 50, label: "50 km" },
  ];

  return (
    <div className="min-h-screen bg-background pb-10" data-testid="settings-page">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/60">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack} aria-label="Back" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Settings</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <SettingsCard
          title="Profile"
          icon={User}
          action={
            <Link href="/profile/edit">
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                Full editor
              </Button>
            </Link>
          }
        >
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.profileImageUrl || undefined} alt="" />
              <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Your profile"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || "No email on file"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">First name</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} data-testid="input-first-name" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Last name</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} data-testid="input-last-name" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio</label>
            <Input
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about your sports journey"
              data-testid="input-bio"
            />
          </div>

          <Button
            className="w-full"
            onClick={() => profileMutation.mutate()}
            disabled={profileMutation.isPending}
            data-testid="button-save-profile"
          >
            {profileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save profile"}
          </Button>
        </SettingsCard>

        <SettingsCard title="Appearance" icon={theme === "dark" ? Moon : Sun}>
          <ToggleRow
            label="Dark mode"
            description={theme === "dark" ? "Dark theme active" : "Light theme active"}
            checked={theme === "dark"}
            onCheckedChange={toggleTheme}
            testId="switch-theme-toggle"
          />
        </SettingsCard>

        <SettingsCard title="Map & location sharing" icon={MapPin}>
          <LocationSharingSettings
            prefs={prefs}
            onPatch={patchPrefs}
            familyCount={presenceMe?.familyCount ?? 0}
          />

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Search radius</label>
            <Select
              value={String(prefs.searchRadiusKm)}
              onValueChange={(v) => patchPrefs({ searchRadiusKm: Number(v) })}
            >
              <SelectTrigger data-testid="select-search-radius">
                <SelectValue>{searchRadiusLabel(prefs.searchRadiusKm, prefs.distanceUnit)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {radiusOptions.map((o) => (
                  <SelectItem key={o.km} value={String(o.km)}>
                    {searchRadiusLabel(o.km, prefs.distanceUnit)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Distance unit</label>
            <Select
              value={prefs.distanceUnit}
              onValueChange={(v) => patchPrefs({ distanceUnit: v as DistanceUnit })}
            >
              <SelectTrigger data-testid="select-distance-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="km">Kilometers</SelectItem>
                <SelectItem value="miles">Miles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ToggleRow
            label="Suggest pick-up games"
            description="Surface instant games that match your sports"
            checked={prefs.autoJoinGames}
            onCheckedChange={(v) => patchPrefs({ autoJoinGames: v })}
            testId="switch-auto-join"
          />
        </SettingsCard>

        {flags.pushNotifications && (
          <SettingsCard title="Notifications" icon={Bell}>
            <ToggleRow
              label="Push notifications"
              description="Alerts when the app is closed"
              checked={pushEnabled}
              onCheckedChange={handlePushToggle}
              disabled={pushBusy}
              testId="switch-push-notifications"
            />

            {pushEnabled && (
              <div className="space-y-1 pt-1 border-t border-border/60">
                <ToggleRow
                  label="Messages"
                  checked={prefs.notifyMessages}
                  onCheckedChange={(v) => patchPrefs({ notifyMessages: v })}
                  testId="switch-notify-messages"
                />
                <ToggleRow
                  label="Likes"
                  checked={prefs.notifyLikes}
                  onCheckedChange={(v) => patchPrefs({ notifyLikes: v })}
                  testId="switch-notify-likes"
                />
                <ToggleRow
                  label="Events"
                  checked={prefs.notifyEvents}
                  onCheckedChange={(v) => patchPrefs({ notifyEvents: v })}
                  testId="switch-notify-events"
                />
                <ToggleRow
                  label="Team updates"
                  checked={prefs.notifyTeamUpdates}
                  onCheckedChange={(v) => patchPrefs({ notifyTeamUpdates: v })}
                  testId="switch-notify-team-updates"
                />
              </div>
            )}
          </SettingsCard>
        )}

        <SettingsCard title="Privacy & security" icon={Shield}>
          <NavRow href="/privacy-settings" label="Privacy" description="Location, profile, social, and activity visibility" />
          <NavRow href="/security" label="Security & privacy" description="Password, 2FA, visibility, data export" />
        </SettingsCard>

        <SettingsCard title="More" icon={Eye}>
          <NavRow href="/billing" label="Billing & subscription" description="Plans and payment history" />
          <NavRow href="/accessibility-demo" label="Accessibility" description="Contrast, motion, font size" />
          <NavRow href="/profile/edit" label="Edit full profile" description="Sports, photo, username" />
        </SettingsCard>

        <Button
          variant="outline"
          className={cn("w-full justify-start gap-2 text-destructive border-destructive/30 hover:bg-destructive/5")}
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>

        <p className="text-center text-[11px] text-muted-foreground pb-4">
          App preferences save on this device · Profile changes sync to your account
        </p>
      </div>
    </div>
  );
}
