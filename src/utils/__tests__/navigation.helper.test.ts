import { goBackOrReplace } from "@/src/utils/navigation.helper";
import { router } from "expo-router";

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
  },
}));

/**
 * Luồng wizard trong app: giữa các bước dùng `router.push` (xem time-select → booking-confirm,
 * tournament-create → venue → schedule → review). Unit test này chỉ kiểm tra helper;
 * hành vi stack thật thuộc expo-router.
 */
describe("goBackOrReplace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gọi navigation.goBack khi canGoBack() là true", () => {
    const goBack = jest.fn();
    const navigation = {
      canGoBack: () => true,
      goBack,
    };

    goBackOrReplace(navigation as never, "/(tabs)/tournament");

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("gọi router.replace(fallback) khi không thể goBack", () => {
    const goBack = jest.fn();
    const navigation = {
      canGoBack: () => false,
      goBack,
    };

    goBackOrReplace(navigation as never, "/(tabs)/tournament");

    expect(goBack).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/tournament");
  });
});
