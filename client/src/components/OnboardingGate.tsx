import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { parseUserProfile } from "@shared/userProfile";
import { prefetchCsrfToken } from "@/lib/csrf";
import FirstTimeUserSetup from "@/components/FirstTimeUserSetup";
import SignupPathChooser from "@/components/SignupPathChooser";
import ProfessionalProfileSetup from "@/components/ProfessionalProfileSetup";
import type { User } from "@shared/schema";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [pathChosen, setPathChosen] = useState(false);
  const [chosenType, setChosenType] = useState<"normal" | "professional" | null>(null);

  useEffect(() => {
    if (user) prefetchCsrfToken();
  }, [user]);

  if (isLoading || !user || dismissed) {
    return <>{children}</>;
  }

  const u = user as User & { profileType?: string; profileJson?: unknown };
  const profile = parseUserProfile(u.profileJson, u);
  const profileType = chosenType ?? u.profileType ?? "normal";
  const pathComplete =
    Boolean(profile.profilePathChosenAt) ||
    pathChosen ||
    Boolean(u.profileType && (profile.onboardingSkipped || profile.profileSetupCompletedAt));

  if (!pathComplete) {
    return (
      <SignupPathChooser
        onComplete={(type) => {
          setPathChosen(true);
          setChosenType(type);
          if (type === "normal") setDismissed(true);
        }}
      />
    );
  }

  if (profileType === "professional" && !profile.profileSetupCompletedAt) {
    return (
      <ProfessionalProfileSetup
        user={{ ...u, profileType: "professional" }}
        onComplete={() => setDismissed(true)}
      />
    );
  }

  const needsSetup = !profile.profileSetupCompletedAt && !profile.onboardingSkipped;

  if (!needsSetup || (pathChosen && chosenType === "normal")) {
    return <>{children}</>;
  }

  return (
    <FirstTimeUserSetup
      user={u}
      onComplete={() => setDismissed(true)}
    />
  );
}
