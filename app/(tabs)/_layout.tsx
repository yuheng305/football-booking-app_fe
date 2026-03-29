import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";

export default function TabLayout() {
  const hiddenScreens = [
    "(users)/change-password",
    "(users)/historyDetails",
    "(users)/history",
    "(users)/club-management",
    "(users)/create-club",
    "(users)/join-club",
    "(users)/club-details",
    "(stadiums)/location",
    "(stadiums)/locationTime",
    "(stadiums)/time-select",
    "(stadiums)/service",
    "(stadiums)/club-select",
    "(stadiums)/field-select",
    "(stadiums)/date-select",
    "(stadiums)/booking-confirm",
    "(stadiums)/booking-detail",
    "(stadiums)/booking-payment",
    "(stadiums)/booking-success",
  ];

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === "home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "stadium") {
            iconName = focused ? "football" : "football-outline";
          } else if (route.name === "account") {
            iconName = focused ? "person" : "person-outline";
          } else if (route.name === "payment") {
            iconName = focused ? "card" : "card-outline";
          } else if (route.name === "tournament") {
            iconName = focused ? "trophy" : "trophy-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#6366F1",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Trang chủ",
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 12, fontWeight: focused ? "700" : "500" }}>
              Trang chủ
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="stadium"
        options={{
          title: "Đặt sân",
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 12, fontWeight: focused ? "700" : "500" }}>
              Đặt sân
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="tournament"
        options={{
          title: "Giải đấu",
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 12, fontWeight: focused ? "700" : "500" }}>
              Giải đấu
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Tài khoản",
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 12, fontWeight: focused ? "700" : "500" }}>
              Tài khoản
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="payment"
        options={{
          title: "Thanh toán",
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 12, fontWeight: focused ? "700" : "500" }}>
              Thanh toán
            </Text>
          ),
        }}
      />

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
