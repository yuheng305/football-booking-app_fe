import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import authService from "../src/services/auth.service";
import { resolveUserRoleFromStorage, getRawUserRoleFromStorage } from "../src/utils/role.util";
import { ROLE_ROUTES } from "../src/constants/roles";

export default function Index() {
  useEffect(() => {
    const bootstrap = async () => {
      const [token, hasOnboarded] = await Promise.all([
        authService.getStoredToken(),
        authService.hasCompletedOnboarding(),
      ]);

      if (token) {
        const [rawRole, resolvedRole] = await Promise.all([
          getRawUserRoleFromStorage(),
          resolveUserRoleFromStorage(),
        ]);
        router.replace(ROLE_ROUTES[rawRole ?? ""] ?? ROLE_ROUTES[resolvedRole] ?? "/(tabs)/home");
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
