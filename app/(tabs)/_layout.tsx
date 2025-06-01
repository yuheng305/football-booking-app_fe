import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  const hiddenScreens = [
    "(users)/change-password",
    "(users)/historyDetails",
    "(users)/history",
    "(stadiums)/location",
    "(stadiums)/locationTime",
    "(stadiums)/service",
  ];

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === "stadium") {
            iconName = focused ? "football" : "football-outline";
          } else if (route.name === "account") {
            iconName = focused ? "person" : "person-outline";
          } else if (route.name === "payment") {
            iconName = focused ? "card" : "card-outline";
          } else if (route.name === "home") {
            iconName = focused ? "home" : "home-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#6366F1",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tabs.Screen name="stadium" options={{ title: "Đặt sân" }} />
      <Tabs.Screen name="account" options={{ title: "Tài khoản" }} />
      <Tabs.Screen name="payment" options={{ title: "Thanh toán" }} />
      <Tabs.Screen name="home" options={{ title: "Trang chủ" }} />

      {hiddenScreens.map((screenName) => (
        <Tabs.Screen
          key={screenName}
          name={screenName}
          options={{ href: null }}
        />
      ))}
    </Tabs>
  );
}
