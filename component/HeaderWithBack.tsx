import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface HeaderWithBackProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showClose?: boolean;
}

const HeaderWithBack: React.FC<HeaderWithBackProps> = ({
  title,
  subtitle,
  onBack,
  showClose = false,
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="bg-blue-600">
      <View className="px-6 py-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={handleBack} className="mr-3">
            <Ionicons
              name={showClose ? "close" : "arrow-back"}
              size={28}
              color="white"
            />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">{title}</Text>
            {subtitle && (
              <Text className="text-blue-100 text-sm mt-1">{subtitle}</Text>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default HeaderWithBack;
