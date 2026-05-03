import { Stack } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { NotificationsProvider } from "@/src/context/notifications.context";
import GlobalFloatingActionGroup from "@/component/GlobalFloatingActionGroup";
import "./global.css";

(TouchableOpacity as any).defaultProps = {
  ...(TouchableOpacity as any).defaultProps,
  activeOpacity: 1,
};

export default function RootLayout() {
  return (
    <NotificationsProvider>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="chats" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(owners)" options={{ headerShown: false }} />
        </Stack>
        <GlobalFloatingActionGroup />
      </View>
    </NotificationsProvider>
  );
}
