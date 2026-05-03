import { router } from "expo-router";

/** Chỉ dùng canGoBack/goBack — tương thích Expo Router RootParamList (không ép NavigationProp<ParamListBase>). */
type MinimalNavigationBack = {
  canGoBack(): boolean;
  goBack(): void;
};

/**
 * Nút quay lại: ưu tiên `pop` — không còn màn trong stack thì `replace` tới `fallbackHref`.
 *
 * Luồng nhiều bước (đặt sân, tạo giải): **bước tiếp theo nên dùng `router.push`**, không dùng
 * `router.replace` giữa các bước. `replace` xóa bước trước khỏi stack → `goBack()` nhảy thẳng về
 * màn dưới (thường là tab / list), không quay về bước liền kề.
 */
export function goBackOrReplace(
  navigation: MinimalNavigationBack,
  fallbackHref: string
): void {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  router.replace(fallbackHref as never);
}
