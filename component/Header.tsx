import React from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { router } from "expo-router";

type HeaderProps = {
  location?: string;
  time?: string;
};

const HeaderUser: React.FC<HeaderProps> = ({ location, time }) => {
  const handleLogoPress = () => {
    router.push("/(tabs)/home");
  };

  return (
    <SafeAreaView
      style={{
        backgroundColor: "black",
      }}
    >
      <View className="h-24 w-full bg-black flex-row justify-end items-center px-4">
        <View className="items-start flex-1">
          <Text className="text-blue-300 text-3xl font-bold">{location}</Text>
          <Text className="text-blue-300 text-2xl">{time}</Text>
        </View>
        <TouchableOpacity onPress={handleLogoPress}>
          <Image
            source={require("../assets/images/logo.png")}
            className="w-32 h-20"
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default HeaderUser;
