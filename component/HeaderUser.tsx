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
      <StatusBar barStyle="light-content" backgroundColor="#17345c" />
      <View
        style={{
          backgroundColor: "#17345c",
          paddingTop: insets.top,
          marginTop: -insets.top,
        }}
      >
        <View
          className="w-full h-[68px] flex-row items-center justify-between px-4"
          style={{ backgroundColor: "#17345c" }}
        >
          <View className="flex-row items-center flex-1 min-w-0 pr-3">
            {showBackButton && (
              <TouchableOpacity onPress={handleBackPress} className="mr-3">
                <Ionicons name="arrow-back" size={24} color="#bfdbfe" />
              </TouchableOpacity>
            )}

            <View className="flex-1 justify-center">
              {displayTitle ? (
                <Text
                  className="text-[22px] font-extrabold leading-tight"
                  style={{ color: "#bfdbfe" }}
                  numberOfLines={1}
                >
                  {displayTitle}
                </Text>
              ) : null}

              {displaySubtitle ? (
                <Text
                  className="text-base mt-0.5 leading-tight"
                  style={{ color: "#dbeafe" }}
                  numberOfLines={1}
                >
                  {displaySubtitle}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="flex-row items-center">
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

            {showNotificationButton && (
              <TouchableOpacity
                onPress={handleNotificationPress}
                activeOpacity={0.8}
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: "rgba(191, 219, 254, 0.18)" }}
              >
                <View className="relative">
                  <Ionicons name="notifications-outline" size={21} color="#bfdbfe" />
                  {unreadCount > 0 && (
                    <View
                      className="absolute -top-2 -right-3 min-w-[22px] h-[20px] rounded-full items-center justify-center px-1"
                      style={{ backgroundColor: "#ef4444" }}
                    >
                      <Text
                        className="text-[10px] font-bold text-white"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
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

export default HeaderUser;
