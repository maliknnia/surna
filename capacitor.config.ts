import type { CapacitorConfig } from '@capacitor/cli';

/** Optional: point native app at dev/tunnel URL — e.g. CAPACITOR_SERVER_URL=https://xxx.trycloudflare.com */
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.surna.app',
  appName: 'SURNA',
  webDir: 'dist/public',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith('http://'),
        },
      }
    : {}),
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      permissions: ['camera', 'photos'],
    },
    Geolocation: {
      permissions: ['location'],
    },
  },
};

export default config;
