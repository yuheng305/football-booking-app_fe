import React from "react";
import { View, TouchableOpacity, Image, Text } from "react-native";
import { router } from "expo-router";

type HeaderProps = {
  location?: string;
  time?: string;
};

const Header: React.FC<HeaderProps> = ({ location, time }) => {
  const handleLogoPress = () => {
    router.push("/(tabs)/home");
  };

  return (
    <View className="h-20 w-full bg-black flex-row justify-end items-center px-4">
      <View className="items-start flex-1">
        {location && (
          <Text className="text-green-500 text-3xl font-bold">{location}</Text>
        )}
        {time && <Text className="text-green-500 text-2xl">{time}</Text>}
      </View>
      <TouchableOpacity onPress={handleLogoPress}>
        <Image
          source={require("../assets/images/logo.png")}
          className="w-32 h-20"
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
};

export default Header;
