import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";

const FooterUser: React.FC = () => {
  const pathname = usePathname();

  const tabs = [
    {
      name: "stadium",
      title: "Đặt sân",
      icon: "football",
      iconOutline: "football-outline",
      route: "/(tabs)/stadium",
    },
    {
      name: "account",
      title: "Tài khoản",
      icon: "person",
      iconOutline: "person-outline",
      route: "/(tabs)/account",
    },
    {
      name: "payment",
      title: "Thanh toán",
      icon: "card",
      iconOutline: "card-outline",
      route: "/(tabs)/payment",
    },
    {
      name: "home",
      title: "Trang chủ",
      icon: "home",
      iconOutline: "home-outline",
      route: "/(tabs)/home",
    },
  ];

  return (
    <View className="flex-row justify-around items-center bg-white h-16 border-t border-gray-200 pt-2">
      {tabs.map((tab) => {
        const isFocused =
          tab.name === "account" ? true : pathname === tab.route;
        const iconName = isFocused ? tab.icon : tab.iconOutline;
        const color = isFocused ? "#6366F1" : "gray";

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => router.push(tab.route)}
            className="flex-1 items-center justify-center"
          >
            <Ionicons name={iconName} size={25} color={color} />
            <Text
              style={{
                fontSize: 10,
                color: isFocused ? "#6366F1" : "gray",
                fontWeight: "500",
              }}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default FooterUser;
