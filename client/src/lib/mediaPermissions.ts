import { Camera } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { getPlatform, isNativePlatform } from "@/lib/capacitor/platform";

const APP_ID = "com.surna.app";

export type MediaPermissionKind = "camera" | "microphone";

export function describeMediaError(error: unknown): {
  message: string;
  denied: boolean;
  canOpenSettings: boolean;
} {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return {
      message: "Camera access is blocked. Open Settings and allow Camera & Microphone for SURNA.",
      denied: true,
      canOpenSettings: true,
    };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      message: "No camera was found on this device.",
      denied: false,
      canOpenSettings: false,
    };
  }
  return {
    message: "Could not start the camera. Check permissions and try again.",
    denied: true,
    canOpenSettings: true,
  };
}

/** Request native Capacitor camera permissions before getUserMedia (Android/iOS shell). */
export async function ensureNativeCameraPermissions(): Promise<boolean> {
  if (!isNativePlatform()) return true;
  try {
    const result = await Camera.requestPermissions({
      permissions: ["camera", "photos"],
    });
    return result.camera === "granted" || result.camera === "limited";
  } catch {
    return false;
  }
}

/** Open the OS screen where the user can grant camera / mic access. */
export async function openAppSettings(): Promise<void> {
  if (!isNativePlatform()) {
    const platform = getPlatform();
    if (platform === "web") {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      if (isIos) {
        window.alert(
          "To allow camera access:\n1. Open Settings\n2. Safari → Camera\n3. Set to Allow\n\nOr tap the aA icon in the address bar → Website Settings → Camera.",
        );
      } else if (isAndroid) {
        window.alert(
          "To allow camera access:\n1. Tap the lock icon in the browser bar\n2. Permissions → Camera → Allow",
        );
      } else {
        window.alert(
          "To allow camera access, click the lock or camera icon in your browser address bar and set Camera to Allow.",
        );
      }
    }
    return;
  }

  const platform = Capacitor.getPlatform();
  if (platform === "android") {
    const intentUrl = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${APP_ID};end`;
    try {
      window.location.href = intentUrl;
    } catch {
      window.open(`https://play.google.com/store/apps/details?id=${APP_ID}`, "_system");
    }
    return;
  }
  if (platform === "ios") {
    window.location.href = "app-settings:";
  }
}
