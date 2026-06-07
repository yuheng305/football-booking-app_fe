import { Stack } from "expo-router";
import { Alert, TouchableOpacity, View } from "react-native";
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import { NotificationsProvider } from "@/src/context/notifications.context";
import GlobalFloatingActionGroup from "@/component/GlobalFloatingActionGroup";
import apiClient from "@/src/utils/api.client";
import { DEV_API_OVERRIDE_KEY } from "@/src/config/api.config";
import "./global.css";

(TouchableOpacity as any).defaultProps = {
  ...(TouchableOpacity as any).defaultProps,
  activeOpacity: 1,
};

export default function RootLayout() {
  useEffect(() => {
    // Restore API URL override
    AsyncStorage.getItem(DEV_API_OVERRIDE_KEY).then((stored) => {
      if (stored) apiClient.setBaseUrl(stored);
    });

    // OTA update check — chỉ chạy trong production bundle (không phải dev metro)
    if (!__DEV__) {
      (async () => {
        try {
          const check = await Updates.checkForUpdateAsync();
          if (!check.isAvailable) return;

          Alert.alert(
            "Có bản cập nhật mới",
            "Tải và áp dụng ngay?",
            [
              { text: "Để sau", style: "cancel" },
              {
                text: "Cập nhật",
                onPress: async () => {
                  try {
                    await Updates.fetchUpdateAsync();
                    await Updates.reloadAsync();
                  } catch {
                    Alert.alert("Lỗi", "Không tải được bản cập nhật.");
                  }
                },
              },
            ]
          );
        } catch {
          // Không có mạng hoặc server update lỗi — bỏ qua
        }
      })();
    }
  }, []);

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
