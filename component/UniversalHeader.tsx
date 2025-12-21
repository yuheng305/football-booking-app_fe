import React from "react";
import { View, TouchableOpacity, Image, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface UniversalHeaderProps {
  // Content
  title?: string;
  subtitle?: string;

  // Navigation
  showBackButton?: boolean;
  showLogo?: boolean;
  onLogoPress?: () => void;
  onBackPress?: () => void;

  // Style variants
  variant?: "default" | "compact";
}

const UniversalHeader: React.FC<UniversalHeaderProps> = ({
  title = "",
  subtitle = "",
  showBackButton = false,
  showLogo = true,
  onLogoPress,
  onBackPress,
  variant = "default",
}) => {
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

  const isCompact = variant === "compact";
  const headerHeight = isCompact ? "h-16" : "h-18";
  const titleSize = isCompact ? "text-xl" : "text-2xl";
  const subtitleSize = isCompact ? "text-xs" : "text-sm";
  const logoSize = isCompact ? "w-24 h-14" : "w-28 h-16";
  const backIconSize = isCompact ? 24 : 26;

  return (
    <SafeAreaView style={{ backgroundColor: "black" }}>
      <View
        className={`${headerHeight} w-full bg-black flex-row items-center px-4`}
      >
        {/* Back Button */}
        {showBackButton && (
          <TouchableOpacity onPress={handleBackPress} className="mr-3">
            <Ionicons name="arrow-back" size={backIconSize} color="#93c5fd" />
          </TouchableOpacity>
        )}

        {/* Title & Subtitle */}
        <View className="justify-center flex-1">
          {title && (
            <Text className={`text-blue-300 ${titleSize} font-bold`}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text className={`text-blue-200 ${subtitleSize} mt-0.5`}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Logo */}
        {showLogo && (
          <TouchableOpacity onPress={handleLogoPress}>
            <Image
              source={require("../assets/images/logo.png")}
              className={logoSize}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default UniversalHeader;
