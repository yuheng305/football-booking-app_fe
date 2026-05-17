import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import authService from "../src/services/auth.service";
import { resolveUserRoleFromStorage } from "../src/utils/role.util";
import { ROLE_ROUTES } from "../src/constants/roles";

export default function Index() {
  useEffect(() => {
    const bootstrap = async () => {
      const [token, hasOnboarded] = await Promise.all([
        authService.getStoredToken(),
        authService.hasCompletedOnboarding(),
      ]);

      if (token) {
        const role = await resolveUserRoleFromStorage();
        router.replace(ROLE_ROUTES[role] ?? "/(tabs)/home");
      } else if (hasOnboarded) {
        router.replace("/login");
      } else {
        router.replace("/onboarding");
      }
    };

    bootstrap();
  }, []);

  return <View className="flex-1 bg-[#060b28]" />;
}
