import React from "react";
import { View, TouchableOpacity, Image, Text, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "@/src/context/notifications.context";

type HeaderUserProps = {
  title?: string;
  subtitle?: string;
  location?: string;
  time?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  onLogoPress?: () => void;
  showNotificationButton?: boolean;
  onNotificationPress?: () => void;
};

/**
 * Header for User screens
 * @param title - Main title (e.g., page name)
 * @param subtitle - Subtitle (e.g., user name or additional info)
 * @param showBackButton - Show back button instead of logo
 */
const HeaderUser: React.FC<HeaderUserProps> = ({
  title = "",
  subtitle = "",
  location = "",
  time = "",
  showBackButton = false,
  onBackPress,
  onLogoPress,
  showNotificationButton = true,
  onNotificationPress,
}) => {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  const displayTitle = title || location;
  const displaySubtitle = subtitle || time;
  const logoAspectRatio = 1152 / 768;
  const logoHeight = 48;
  const logoWidth = logoHeight * logoAspectRatio;

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    router.back();
  };

  const handleLogoPress = () => {
    if (onLogoPress) {
      onLogoPress();
      return;
    }
    router.push("/(tabs)/home");
  };

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
      return;
    }
    router.push("/notifications" as any);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a5f" />
      <View
        style={{
          backgroundColor: "#1e3a5f",
          paddingTop: insets.top,
          marginTop: -insets.top,
        }}
      >
        <View
          className="w-full h-16 flex-row items-center justify-between px-4"
          style={{ backgroundColor: "#1e3a5f" }}
        >
        <View className="flex-row items-center flex-1 min-w-0" style={{ paddingRight: 142 }}>
          {showBackButton && (
            <TouchableOpacity onPress={handleBackPress} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#93c5fd" />
            </TouchableOpacity>
          )}

          <View className="flex-1 justify-center pr-2">
            {displayTitle ? (
              <Text
                className="text-xl font-semibold leading-tight"
                style={{ color: "#93c5fd" }}
                numberOfLines={1}
              >
                {displayTitle}
              </Text>
            ) : null}

            {displaySubtitle ? (
              <Text
                className="text-sm mt-0.5 leading-tight"
                style={{ color: "#bfdbfe" }}
                numberOfLines={1}
              >
                {displaySubtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View
          className="flex-row items-center"
          style={{ position: "absolute", right: 8, top: 10 }}
        >
          <TouchableOpacity
            onPress={handleLogoPress}
            activeOpacity={0.7}
            className="items-center justify-center"
            style={{ width: logoWidth, height: logoHeight }}
          >
            <Image
              source={require("../assets/images/logo.png")}
              style={{ width: logoWidth, height: logoHeight }}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {showNotificationButton && (
            <TouchableOpacity
              onPress={handleNotificationPress}
              activeOpacity={0.7}
              className="ml-1"
            >
              <View className="relative">
                <Ionicons name="notifications-outline" size={22} color="#93c5fd" />
                {unreadCount > 0 && (
                  <View
                    className="absolute -top-2 -right-3 min-w-5 h-5 rounded-full items-center justify-center px-1"
                    style={{ backgroundColor: "#93c5fd" }}
                  >
                    <Text
                      className="text-[10px] font-bold"
                      style={{ color: "#1e3a5f" }}
                    >
                      {unreadCount > 99
                        ? "99+"
                        : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
          </View>
      </View>
    </>
  );
};

export default HeaderUser;
