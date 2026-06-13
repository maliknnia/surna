import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { initPushNotifications } from "@/lib/capacitor/push";

export default function PushNotificationInit() {
  const { user } = useAuth();

  useEffect(() => {
    void initPushNotifications(user?.id ?? null);
  }, [user?.id]);

  return null;
}
