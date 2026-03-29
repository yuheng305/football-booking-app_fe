import React from "react";
import { View, TouchableOpacity, Image, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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

// Theme constants - Single Source of Truth (DRY principle)
const HEADER_THEME = {
  backgroundColor: "#1e3a5f", // Xanh đậm thay vì đen
  textPrimary: "#93c5fd",    // Xanh nhạt
  textSecondary: "#bfdbfe",  // Xanh rất nhạt
} as const;

const UniversalHeader: React.FC<UniversalHeaderProps> = ({
  title = "",
  subtitle = "",
  showBackButton = false,
  showLogo = true,
  showNotificationButton = true,
  onLogoPress,
  onBackPress,
  onNotificationPress,
  variant = "default",
}) => {
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

  // Consistent sizing based on variant (SOLID - Open/Closed Principle)
  const isCompact = variant === "compact";
  const headerHeight = isCompact ? 44 : 52;
  const titleSize = isCompact ? "text-2xl" : "text-3xl";   
  const subtitleSize = isCompact ? "text-sm" : "text-base";
  const backIconSize = isCompact ? 24 : 28;
  const logoAspectRatio = 1152 / 768;
  const logoHeight = isCompact ? 36 : 44;
  const logoWidth = logoHeight * logoAspectRatio;
  const notificationIconSize = isCompact ? 20 : 22;

  return (
    <SafeAreaView 
      style={{ backgroundColor: HEADER_THEME.backgroundColor }}
      edges={['top']}
    >
      <View
        className="w-full flex-row items-center justify-between px-4"
        style={{ backgroundColor: HEADER_THEME.backgroundColor, height: headerHeight }}
      >
        {/* Left side: Back Button + Title - Có max width để không đè lên logo */}
        <View className="flex-row items-center flex-1 mr-3">
          {showBackButton && (
            <TouchableOpacity onPress={handleBackPress} className="mr-3">
              <Ionicons
                name="arrow-back"
                size={backIconSize}
                color={HEADER_THEME.textPrimary}
              />
            </TouchableOpacity>
          )}

          {/* Title & Subtitle */}
          <View className="justify-center flex-1">
            {title && (
              <Text
                className={`${titleSize} font-semibold leading-tight`}
                style={{ color: HEADER_THEME.textPrimary, margin: 0.5 }}
                numberOfLines={1}
              >
                {title}
              </Text>
            )}
            {subtitle && (
              <Text
                className={`${subtitleSize} mt-0.5 leading-tight`}
                style={{ color: HEADER_THEME.textSecondary }}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {/* Right side: Logo + Notification */}
        <View className="flex-row items-center">
          {showLogo && (
            <TouchableOpacity 
              onPress={handleLogoPress} 
              activeOpacity={0.7}
              style={{ width: logoWidth, height: logoHeight }}
              className="items-center justify-center"
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
              activeOpacity={0.7}
              className="ml-1"
            >
              <View className="relative">
                <Ionicons
                  name="notifications-outline"
                  size={notificationIconSize}
                  color={HEADER_THEME.textPrimary}
                />
                {unreadCount > 0 && (
                  <View
                    className="absolute -top-2 -right-3 min-w-5 h-5 rounded-full items-center justify-center px-1"
                    style={{ backgroundColor: HEADER_THEME.textPrimary }}
                  >
                    <Text
                      className="text-[10px] font-bold"
                      style={{ color: HEADER_THEME.backgroundColor }}
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
    </SafeAreaView>
  );
};

export default UniversalHeader;
