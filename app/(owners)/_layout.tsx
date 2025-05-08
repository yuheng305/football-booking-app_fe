import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function OwnerLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === "stadiumManagement") {
            iconName = focused ? "football" : "football-outline";
          } else if (route.name === "account") {
            iconName = focused ? "person" : "person-outline";
          } else if (route.name === "bookingManagement" || route.name === "serviceManagement") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "home") {
            iconName = focused ? "home" : "home-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#6366F1",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tabs.Screen name="stadiumManagement" options={{ title: "Danh sách sân" }} />
      <Tabs.Screen name="account" options={{ title: "Tài khoản" }} />
      <Tabs.Screen name="bookingManagement" options={{ title: "Quản lý" }} />
      <Tabs.Screen name="home" options={{ title: "Trang chủ" }} />
    </Tabs>
  );
}