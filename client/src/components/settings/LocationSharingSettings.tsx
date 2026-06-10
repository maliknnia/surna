import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LOCATION_AUDIENCE_LABELS,
  type LocationAudience,
} from "@shared/locationSharing";
import { EyeOff, Users, Heart, Globe, UserCheck, ChevronRight } from "lucide-react";
import { FamilyCircleSheet } from "./FamilyCircleSheet";
import type { AppPreferences } from "@/lib/userPreferences";

const AUDIENCE_OPTIONS: {
  id: LocationAudience;
  icon: typeof Users;
}[] = [
  { id: "ghost", icon: EyeOff },
  { id: "friends", icon: Users },
  { id: "family", icon: Heart },
  { id: "followers", icon: UserCheck },
  { id: "public", icon: Globe },
];

interface LocationSharingSettingsProps {
  prefs: AppPreferences;
  onPatch: (patch: Partial<AppPreferences>) => void | Promise<void>;
  familyCount?: number;
}

export function LocationSharingSettings({
  prefs,
  onPatch,
  familyCount = 0,
}: LocationSharingSettingsProps) {
  const [familyOpen, setFamilyOpen] = useState(false);
  const sharingOn = prefs.shareLocation;
  const activeAudience = sharingOn ? prefs.locationAudience : "ghost";

  const selectAudience = (audience: LocationAudience) => {
    if (audience === "ghost") {
      void onPatch({ shareLocation: false, locationAudience: "ghost" });
      return;
    }
    void onPatch({ shareLocation: true, locationAudience: audience });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Choose who can see your live location on the map — like Snapchat Map sharing.
      </p>

      <div className="space-y-2" role="radiogroup" aria-label="Who can see your location">
        {AUDIENCE_OPTIONS.map(({ id, icon: Icon }) => {
          const selected = activeAudience === id;
          const meta = LOCATION_AUDIENCE_LABELS[id];
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => selectAudience(id)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors",
                selected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border bg-card hover:bg-muted/30",
              )}
              data-testid={`location-audience-${id}`}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{meta.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{meta.description}</p>
              </div>
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 shrink-0 mt-0.5",
                  selected ? "border-primary bg-primary" : "border-muted-foreground/40",
                )}
              >
                {selected && (
                  <div className="w-full h-full rounded-full bg-primary-foreground scale-[0.45]" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {sharingOn && prefs.locationAudience === "family" && (
        <button
          type="button"
          onClick={() => setFamilyOpen(true)}
          className="w-full flex items-center justify-between gap-2 p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
          data-testid="button-manage-family"
        >
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Manage family list</p>
            <p className="text-xs text-muted-foreground">
              {familyCount === 0
                ? "Add parents, siblings, or anyone in your close circle"
                : `${familyCount} ${familyCount === 1 ? "person" : "people"} on your list`}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      )}

      <FamilyCircleSheet open={familyOpen} onOpenChange={setFamilyOpen} />
    </div>
  );
}
