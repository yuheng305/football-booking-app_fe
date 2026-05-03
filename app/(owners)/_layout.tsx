import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function OwnerLayout() {
  const hiddenScreens = [
    "(account)/changePassword",
    "(stadium)/addField",
    "(stadium)/createCluster",
    "(stadium)/editField",
    "(stadium)/clusterDetail",
    "(booking)/bookingDetail",
    "(booking)/tournament-detail",
    "(stadium)/stadiumManagement",
  ];

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          switch (route.name) {
            case "home":
              iconName = focused ? "home" : "home-outline";
              break;
            case "(stadium)/clusterList":
              iconName = focused ? "football" : "football-outline";
              break;
            case "(booking)/ownerBookingManagement":
              iconName = focused ? "calendar" : "calendar-outline";
              break;
            case "(account)/account":
              iconName = focused ? "person" : "person-outline";
              break;
            default:
              iconName = "ellipse-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#6366F1",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tabs.Screen name="home" options={{ title: "Trang chủ" }} />
      <Tabs.Screen
        name="(stadium)/clusterList"
        options={{ title: "Cụm sân" }}
      />
      <Tabs.Screen
        name="(booking)/ownerBookingManagement"
        options={{ title: "Quản lý" }}
      />
      <Tabs.Screen name="(account)/account" options={{ title: "Tài khoản" }} />

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
