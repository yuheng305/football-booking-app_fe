import { Stack } from "expo-router";
import { TouchableOpacity } from "react-native";
import { NotificationsProvider } from "@/src/context/notifications.context";
import "./global.css";

(TouchableOpacity as any).defaultProps = {
  ...(TouchableOpacity as any).defaultProps,
  activeOpacity: 1,
};

export default function RootLayout() {
  return (
    <NotificationsProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(owners)" options={{ headerShown: false }} />
      </Stack>
    </NotificationsProvider>
  );
}
