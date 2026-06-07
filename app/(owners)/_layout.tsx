import { Tabs, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { resolveTabPressResetHref } from "@/src/utils/tab-navigation.util";

export default function OwnerLayout() {
  const pathname = usePathname();
  const router = useRouter();

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

  const buildTabResetListeners = (routeName: string) => ({
    tabPress: (event: { preventDefault: () => void }) => {
      const href = resolveTabPressResetHref({
        layout: "owner",
        routeName,
        pathname,
      });

      if (!href) return;

      event.preventDefault();
      router.replace(href as never);
    },
  });

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
      <Tabs.Screen
        name="home"
        listeners={buildTabResetListeners("home")}
        options={{ title: "Trang chủ" }}
      />
      <Tabs.Screen
        name="(stadium)/clusterList"
        listeners={buildTabResetListeners("(stadium)/clusterList")}
        options={{ title: "Cụm sân" }}
      />
      <Tabs.Screen
        name="(booking)/ownerBookingManagement"
        listeners={buildTabResetListeners("(booking)/ownerBookingManagement")}
        options={{ title: "Quản lý" }}
      />
      <Tabs.Screen
        name="(account)/account"
        listeners={buildTabResetListeners("(account)/account")}
        options={{ title: "Tài khoản" }}
      />

      {hiddenScreens.map((screenName) => (
        <Tabs.Screen
          key={screenName}
          name={screenName}
          options={{ href: null, tabBarStyle: { display: 'none' } }}
        />
      ))}
    </Tabs>
  );
}
