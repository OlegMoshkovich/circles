import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "./supabase";

// Show notifications even when the app is foregrounded (otherwise iOS suppresses
// them while the app is open). Set once at module load.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Resolve the EAS project id required by getExpoPushTokenAsync in SDK 49+. */
function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId
  );
}

/**
 * Ask for permission and return this device's Expo push token, or null when the
 * device can't receive push (simulator, web, or permission denied). Safe to call
 * repeatedly. Also creates the Android notification channel.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Remote push only works on physical devices (not simulators / Expo Go SDK 53+).
  if (!Device.isDevice) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#37412C",
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return null;

  try {
    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenResponse.data;
  } catch {
    return null;
  }
}

/**
 * Register the current device for push and persist the token against the signed-in
 * user so the send-push edge function can target it. Idempotent — upserts on the
 * token, so re-registering just re-points it at the current user.
 */
export async function syncPushToken(userId: string): Promise<void> {
  const token = await registerForPushNotificationsAsync();
  if (!token) return;
  await supabase.from("device_tokens").upsert(
    {
      user_id: userId,
      expo_push_token: token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "expo_push_token" }
  );
}
