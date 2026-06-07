import { Linking, Platform, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Camera, Map, Marker } from "@maplibre/maplibre-react-native";
import { MAP_STYLE_URL } from "./maps/mapConstants";

interface Props {
  latitude?: number | null;
  longitude?: number | null;
  name?: string | null;
  height?: number;
  /** Cho phép kéo/zoom bản đồ (mặc định bật). Xoay/nghiêng luôn tắt. */
  interactive?: boolean;
}

/**
 * Bản đồ chỉ-đọc hiển thị vị trí cụm sân cho người chơi, kèm nút "Chỉ đường".
 * Tự ẩn (báo chưa có vị trí) khi BE chưa lưu tọa độ.
 */
export default function LocationMapView({
  latitude,
  longitude,
  name,
  height = 220,
  interactive = true,
}: Props) {
  const hasCoords =
    typeof latitude === "number" && typeof longitude === "number";

  if (!hasCoords) {
    return (
      <View className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-5 items-center">
        <Ionicons name="map-outline" size={22} color="#9ca3af" />
        <Text className="text-gray-500 text-sm mt-2 text-center">
          Chủ sân chưa cập nhật vị trí cụm sân trên bản đồ.
        </Text>
      </View>
    );
  }

  const lat = latitude as number;
  const lng = longitude as number;

  const openDirections = () => {
    const label = encodeURIComponent(name || "Cụm sân");
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const nativeUrl =
      Platform.select({
        ios: `maps://?q=${label}&ll=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
      }) || webUrl;

    Linking.openURL(nativeUrl).catch(() => {
      Linking.openURL(webUrl).catch(() => {});
    });
  };

  return (
    <View>
      <View
        style={{ height, borderRadius: 16, overflow: "hidden" }}
        className="border border-gray-200"
      >
        <Map
          mapStyle={MAP_STYLE_URL}
          style={{ flex: 1 }}
          logo={false}
          touchRotate={false}
          touchPitch={false}
          dragPan={interactive}
          touchZoom={interactive}
        >
          <Camera center={[lng, lat]} zoom={15} />
          <Marker lngLat={[lng, lat]} anchor="bottom">
            <Ionicons name="location" size={38} color="#DC2626" />
          </Marker>
        </Map>
      </View>

      <TouchableOpacity
        className="mt-3 flex-row items-center justify-center rounded-xl bg-indigo-600 py-3"
        onPress={openDirections}
        activeOpacity={0.85}
      >
        <Ionicons name="navigate" size={18} color="#fff" />
        <Text className="text-white font-semibold text-sm ml-2">Chỉ đường</Text>
      </TouchableOpacity>
    </View>
  );
}
