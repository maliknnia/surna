import { PushNotifications } from "@capacitor/push-notifications";
import { isNativePlatform, getPlatform } from "./platform";

let initialized = false;

export async function initPushNotifications(userId?: string | null): Promise<void> {
  if (!isNativePlatform() || initialized) return;
  initialized = true;

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") {
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener("registration", async (token) => {
    if (!userId) return;
    try {
      await fetch("/api/push/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: token.value, platform: getPlatform() }),
      });
    } catch (e) {
      console.warn("[Phase9-3] Failed to register push token", e);
    }
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.warn("[Phase9-3] Push registration error:", err);
  });

  PushNotifications.addListener("pushNotificationReceived", () => {
    /* Handled by in-app notification UI when foregrounded */
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const data = action.notification.data;
    if (data?.url && typeof data.url === "string") {
      window.location.href = data.url;
    }
  });
}
