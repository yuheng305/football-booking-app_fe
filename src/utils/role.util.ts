import AsyncStorage from "@react-native-async-storage/async-storage";

type AppRole = "player" | "owner";

const normalize = (v: unknown): string[] => {
  if (!v && v !== 0) return [];

  if (Array.isArray(v)) {
    return v.map((x) => String(x).toLowerCase().trim());
  }

  if (typeof v === "string") {
    return [v.toLowerCase().trim()];
  }

  try {
    const s = JSON.stringify(v);
    return [s.toLowerCase()];
  } catch {
    return [String(v).toLowerCase()];
  }
};

export const resolveUserRoleFromStorage = async (): Promise<AppRole> => {
  try {
    const [profileRaw, userDataRaw, legacyRole] = await Promise.all([
      AsyncStorage.getItem("userProfile"),
      AsyncStorage.getItem("userData"),
      AsyncStorage.getItem("userRole"),
    ]);

    const profileRole = profileRaw ? JSON.parse(profileRaw)?.role : null;
    const userRole = userDataRaw ? JSON.parse(userDataRaw)?.role : null;

    const candidates = [userRole, profileRole, legacyRole];

    for (const cand of candidates) {
      const tokens = normalize(cand);
      if (tokens.some((t) => t === "owner" || t === "organizer" || t === "organiser" || t === "admin")) {
        return "owner";
      }
    }
  } catch (e) {
    // ignore and fallback to player
  }

  return "player";
};

export default resolveUserRoleFromStorage;
