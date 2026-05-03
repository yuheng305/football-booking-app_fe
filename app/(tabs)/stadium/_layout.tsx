import { Stack } from "expo-router";

/**
 * Toàn bộ luồng đặt sân nằm trong một Stack dưới tab "Đặt sân".
 * Trước đây tab `stadium.tsx` và các màn `(stadiums)/*` là anh em trong Tabs → không có stack,
 * goBack/push dễ nhảy sai (về home / tab khác).
 */
export default function StadiumTabStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
