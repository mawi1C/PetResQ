import { Platform, Alert } from "react-native"
import * as Notifications from "expo-notifications"

// Configure how notifications behave
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/**
 * Send a local notification.
 * In Expo Go -> fallback to Alert (since notifications don’t work there).
 * In standalone build (APK/AAB) -> show real local notification.
 */
export async function sendLocalNotification(title, body) {
  try {
    if (Platform.OS === "android" || Platform.OS === "ios") {
      // 🚀 Schedule notification immediately
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default", // ✅ ensures notification sound
          priority: "high", // ✅ heads-up banner on Android
        },
        trigger: null, // send immediately
      })
    } else {
      // 🧪 Fallback if running in Expo Go or unsupported platform
      Alert.alert(title, body)
      console.log("Expo Go fallback notification:", title, body)
    }
  } catch (error) {
    // Fallback if notifications fail
    Alert.alert(title, body)
    console.log("Expo Go fallback notification:", title, body, error)
  }
}

// ❌ Push notifications commented out for now
// export async function sendPushNotification(userId, title, body) {
//   // Logic for push notifications will go here later
// }
