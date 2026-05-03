import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";

const resolveUserRole = async (): Promise<string | null> => {
  try {
    const [profileRaw, userDataRaw, legacyRole] = await Promise.all([
      AsyncStorage.getItem("userProfile"),
      AsyncStorage.getItem("userData"),
      AsyncStorage.getItem("userRole"),
    ]);

    const profileRole = profileRaw ? JSON.parse(profileRaw)?.role : null;
    const userRole = userDataRaw ? JSON.parse(userDataRaw)?.role : null;

    const rawRole = (userRole || profileRole || legacyRole || "")
      .toString()
      .trim()
      .toLowerCase();

    if (rawRole === "user") {
      return "player";
    }

    if (rawRole === "organizer") {
      return "owner";
    }

    if (rawRole === "player" || rawRole === "owner") {
      return rawRole;
    }

    return "player";
  } catch {
    return "player";
  }
};

export default function TabLayout() {
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadRole = async () => {
      const role = await resolveUserRole();
      if (mounted) {
        setUserRole(role);
      }
    };

    loadRole();

    return () => {
      mounted = false;
    };
  }, []);

  const isPlayer = useMemo(() => userRole === "player", [userRole]);
  const isOrganizer = useMemo(() => userRole === "owner", [userRole]);

  const hiddenScreens = [
    "tournament/create",
    "tournament/venue",
    "tournament/schedule",
    "tournament/review",
    "tournament/detail",
    "tournament/level2-create",
    "tournament/level2-round-config",
    "tournament/level2-bracket",
    "tournament/level2-rounds",
    "tournament/level2-slots",
    "(users)/change-password",
    "(users)/historyDetails",
    "(users)/history",
    "(users)/club-management",
    "(users)/create-club",
    "(users)/join-club",
    "(users)/club-details",
    "stadium/locationTime",
    "stadium/time-select",
    "stadium/service",
    "stadium/club-select",
    "stadium/field-select",
    "stadium/date-select",
    "stadium/booking-confirm",
    "stadium/booking-detail",
    "stadium/booking-payment",
    "stadium/booking-success",
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
          href: isPlayer ? undefined : null,
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
          href: isOrganizer ? undefined : null,
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
