import React from "react";
import { View, TouchableOpacity, Image, Text, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "@/src/context/notifications.context";

interface UniversalHeaderProps {
  // Content
  title?: string;
  subtitle?: string;

  // Navigation
  showBackButton?: boolean;
  showLogo?: boolean;
  showNotificationButton?: boolean;
  onLogoPress?: () => void;
  onBackPress?: () => void;
  onNotificationPress?: () => void;

  // Style variants
  variant?: "default" | "compact";
}

const HEADER_THEME = {
  backgroundColor: "#17345c",
  textPrimary: "#bfdbfe",
  textSecondary: "#dbeafe",
  notificationBg: "rgba(191, 219, 254, 0.18)",
  badgeBg: "#ef4444",
} as const;

const UniversalHeader: React.FC<UniversalHeaderProps> = ({
  title = "",
  subtitle = "",
  showBackButton = false,
  showLogo = true,
  showNotificationButton = false,
  onLogoPress,
  onBackPress,
  onNotificationPress,
  variant = "default",
}) => {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();

  const handleLogoPress = () => {
    if (onLogoPress) {
      onLogoPress();
    } else {
      router.push("/(tabs)/home");
    }
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      router.push("/notifications" as any);
    }
  };

  const isCompact = variant === "compact";
  const headerHeight = isCompact ? 56 : 68;
  const titleSize = isCompact ? "text-xl" : "text-[22px]";
  const titleWeight = isCompact ? "font-bold" : "font-extrabold";
  const subtitleSize = isCompact ? "text-sm" : "text-base";
  const backIconSize = isCompact ? 24 : 28;
  const logoAspectRatio = 1152 / 768;
  const logoHeight = isCompact ? 40 : 48;
  const logoWidth = logoHeight * logoAspectRatio;
  const notificationIconSize = isCompact ? 20 : 21;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_THEME.backgroundColor} />
      <View
        style={{
          backgroundColor: HEADER_THEME.backgroundColor,
          paddingTop: insets.top,
          marginTop: -insets.top,
        }}
      >
        <View
          className="w-full flex-row items-center justify-between px-4"
          style={{ backgroundColor: HEADER_THEME.backgroundColor, height: headerHeight }}
        >
          <View className="flex-row items-center flex-1 min-w-0 pr-3">
            {showBackButton && (
              <TouchableOpacity onPress={handleBackPress} className="mr-3">
                <Ionicons
                  name="arrow-back"
                  size={backIconSize}
                  color={HEADER_THEME.textPrimary}
                />
              </TouchableOpacity>
            )}

            <View className="justify-center flex-1">
              {title ? (
                <Text
                  className={`${titleSize} ${titleWeight} leading-tight`}
                  style={{ color: HEADER_THEME.textPrimary }}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text
                  className={`${subtitleSize} mt-0.5 leading-tight`}
                  style={{ color: HEADER_THEME.textSecondary }}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="flex-row items-center">
            {showLogo && (
              <TouchableOpacity
                onPress={handleLogoPress}
                activeOpacity={0.7}
                className="items-center justify-center mr-2"
                style={{ width: logoWidth, height: logoHeight }}
              >
                <Image
                  source={require("../assets/images/logo.png")}
                  style={{ width: logoWidth, height: logoHeight }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}

            {showLogo && showNotificationButton && (
              <TouchableOpacity
                onPress={handleNotificationPress}
                activeOpacity={0.8}
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: HEADER_THEME.notificationBg }}
              >
                <View className="relative">
                  <Ionicons
                    name="notifications-outline"
                    size={notificationIconSize}
                    color={HEADER_THEME.textPrimary}
                  />
                  {unreadCount > 0 && (
                    <View
                      className="absolute -top-2 -right-3 min-w-[22px] h-[20px] rounded-full items-center justify-center px-1"
                      style={{ backgroundColor: HEADER_THEME.badgeBg }}
                    >
                      <Text
                        className="text-[10px] font-bold text-white"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        allowFontScaling={false}
                        style={{
                          includeFontPadding: false,
                          lineHeight: 11,
                          textAlign: "center",
                        }}
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
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

export default UniversalHeader;
