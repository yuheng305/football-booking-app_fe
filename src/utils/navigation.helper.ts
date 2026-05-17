import { router } from "expo-router";

/**
 * Nút quay lại: ưu tiên `router.back()` (Expo Router) — không còn màn trong stack thì
 * `replace` tới `fallbackHref`.
 *
 * Dùng `router.canGoBack()` thay cho `navigation.canGoBack()` vì trong kiến trúc
 * Stack-bên-trong-Tabs, `useNavigation()` trả về Tab navigator nên `canGoBack()` của nó
 * luôn `false` dù stack vẫn còn lịch sử → rơi vào fallback và nhảy về Home.
 */
export function goBackOrReplace(
  _navigation: unknown,
  fallbackHref: string
): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallbackHref as never);
}
