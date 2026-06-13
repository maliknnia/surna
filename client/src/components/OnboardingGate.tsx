import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { parseUserProfile } from "@shared/userProfile";
import FirstTimeUserSetup from "@/components/FirstTimeUserSetup";
import SignupPathChooser from "@/components/SignupPathChooser";
import ProfessionalProfileSetup from "@/components/ProfessionalProfileSetup";
import type { User } from "@shared/schema";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [pathChosen, setPathChosen] = useState(false);

  if (isLoading || !user || dismissed) {
    return <>{children}</>;
  }

  const u = user as User & { profileType?: string; profileJson?: unknown };
  const profile = parseUserProfile(u.profileJson, u);
  const profileType = u.profileType ?? "normal";

  if (!profile.profilePathChosenAt && !pathChosen) {
    return (
      <SignupPathChooser
        onComplete={(type) => {
          setPathChosen(true);
          if (type === "normal") setDismissed(true);
        }}
      />
    );
  }

  if (profileType === "professional" && !profile.profileSetupCompletedAt) {
    return (
      <ProfessionalProfileSetup
        user={u}
        onComplete={() => setDismissed(true)}
      />
    );
  }

  const needsSetup = !profile.profileSetupCompletedAt && !profile.onboardingSkipped;

  if (!needsSetup) {
    return <>{children}</>;
  }

  return (
    <FirstTimeUserSetup
      user={u}
      onComplete={() => setDismissed(true)}
    />
  );
}
