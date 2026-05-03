import { Stack } from "expo-router";

/**
 * Luồng giải đấu (level 1 + level 2 + chi tiết) nằm trong một Stack dưới tab "Giải đấu".
 * Trước đây các màn `tournament-*` là anh em trong Tabs → không có stack history,
 * goBack / hardware back dễ nhảy về tab khác (thường là Trang chủ).
 */
export default function TournamentTabStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
