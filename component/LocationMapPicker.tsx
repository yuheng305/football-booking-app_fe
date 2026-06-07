import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import {
  Camera,
  Map,
  Marker,
  type PressEvent,
} from "@maplibre/maplibre-react-native";
import {
  DEFAULT_CENTER,
  MAP_STYLE_URL,
  ZOOM_DEFAULT,
  ZOOM_WITH_COORDS,
} from "./maps/mapConstants";

export type PickedCoords = { latitude: number; longitude: number };

interface Props {
  latitude?: number | null;
  longitude?: number | null;
  onChange: (coords: PickedCoords) => void;
  /** Địa chỉ owner đã nhập — dùng để geocode tự động khi mở map. */
  addressHint?: string;
  disabled?: boolean;
}

/**
 * Nút mở fullscreen modal bản đồ để chủ sân chọn vị trí cụm sân.
 * Map hiển thị trong Modal độc lập — không xung đột với ScrollView cha.
 */
export default function LocationMapPicker({
  latitude,
  longitude,
  onChange,
  addressHint,
  disabled = false,
}: Props) {
  const hasCoords =
    typeof latitude === "number" && typeof longitude === "number";

  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<PickedCoords | null>(
    hasCoords ? { latitude: latitude as number, longitude: longitude as number } : null
  );
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [cameraCenter, setCameraCenter] = useState<[number, number]>(
    hasCoords ? [longitude as number, latitude as number] : DEFAULT_CENTER
  );
  const [busy, setBusy] = useState(false);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length) {
        const r = results[0];
        const parts = [r.streetNumber, r.street, r.subregion ?? r.district, r.city].filter(Boolean);
        setResolvedAddress(parts.join(", ") || null);
      }
    } catch {
      setResolvedAddress(null);
    }
  };

  const openModal = async () => {
    // Nếu chưa có tọa độ và có địa chỉ → geocode để center bản đồ
    if (!hasCoords && addressHint?.trim()) {
      try {
        setBusy(true);
        const results = await Location.geocodeAsync(addressHint.trim());
        if (results.length) {
          const { latitude: lat, longitude: lng } = results[0];
          setCameraCenter([lng, lat]);
        }
      } catch {
        // fallback về TP.HCM
      } finally {
        setBusy(false);
      }
    }
    setModalVisible(true);
  };

  const handleMapPress = (
    event: NativeSyntheticEvent<PressEvent> | NativeSyntheticEvent<any>
  ) => {
    const lngLat = event?.nativeEvent?.lngLat;
    if (!Array.isArray(lngLat) || lngLat.length < 2) return;
    const [lng, lat] = lngLat;
    setPendingCoords({ latitude: lat, longitude: lng });
    setCameraCenter([lng, lat]);
    void reverseGeocode(lat, lng);
  };

  const useMyLocation = async () => {
    try {
      setBusy(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Không có quyền vị trí",
          "Hãy cấp quyền vị trí hoặc chạm trực tiếp lên bản đồ."
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = pos.coords;
      setPendingCoords({ latitude: lat, longitude: lng });
      setCameraCenter([lng, lat]);
      void reverseGeocode(lat, lng);
    } catch {
      Alert.alert("Lỗi", "Không lấy được vị trí hiện tại.");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = () => {
    if (!pendingCoords) return;
    onChange(pendingCoords);
    setModalVisible(false);
  };

  const handleCancel = () => {
    // Khôi phục pendingCoords về coords đã lưu trước đó
    setPendingCoords(
      hasCoords ? { latitude: latitude as number, longitude: longitude as number } : null
    );
    setResolvedAddress(null);
    setModalVisible(false);
  };

  const displayAddress = resolvedAddress
    ?? (hasCoords ? `${(latitude as number).toFixed(5)}, ${(longitude as number).toFixed(5)}` : null);

  return (
    <>
      {/* Preview + nút mở modal */}
      <View className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        {displayAddress ? (
          <View className="flex-row items-start mb-3">
            <Ionicons name="location" size={16} color="#DC2626" style={{ marginTop: 2 }} />
            <Text className="text-gray-800 text-sm ml-2 flex-1">{displayAddress}</Text>
          </View>
        ) : (
          <Text className="text-gray-400 text-sm mb-3">Chưa chọn vị trí trên bản đồ.</Text>
        )}
        <TouchableOpacity
          className={`flex-row items-center justify-center rounded-xl py-2.5 ${
            disabled ? "bg-gray-200" : "bg-[#114F99]"
          }`}
          onPress={openModal}
          disabled={disabled || busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="map-outline" size={16} color="#fff" />
              <Text className="text-white font-semibold text-sm ml-1.5">
                {hasCoords ? "Đổi vị trí trên bản đồ" : "Chọn vị trí trên bản đồ"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Fullscreen modal bản đồ — không nằm trong ScrollView */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }} edges={["top"]}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: "#fff",
            }}
          >
            <TouchableOpacity onPress={handleCancel} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#1E232C" />
            </TouchableOpacity>
            <Text
              style={{ flex: 1, textAlign: "center", fontWeight: "700", fontSize: 16, color: "#1E232C" }}
            >
              Chọn vị trí cụm sân
            </Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Map fullscreen */}
          <View style={{ flex: 1 }}>
            <Map
              mapStyle={MAP_STYLE_URL}
              style={{ flex: 1 }}
              onPress={handleMapPress}
              logo={false}
            >
              <Camera
                center={cameraCenter}
                zoom={pendingCoords ? ZOOM_WITH_COORDS : ZOOM_DEFAULT}
                duration={400}
              />
              {pendingCoords ? (
                <Marker
                  lngLat={[pendingCoords.longitude, pendingCoords.latitude]}
                  anchor="bottom"
                >
                  <Ionicons name="location" size={42} color="#DC2626" />
                </Marker>
              ) : null}
            </Map>

            {/* Hint overlay */}
            <View
              style={{
                position: "absolute",
                top: 12,
                left: 16,
                right: 16,
                backgroundColor: "rgba(255,255,255,0.92)",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
              pointerEvents="none"
            >
              <Text style={{ fontSize: 13, color: "#374151", textAlign: "center" }}>
                {pendingCoords
                  ? resolvedAddress ?? "Chạm để di chuyển điểm"
                  : "Chạm vào bản đồ để đặt vị trí"}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View
            style={{
              backgroundColor: "#fff",
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 12),
              flexDirection: "row",
              gap: 12,
            }}
          >
            <TouchableOpacity
              onPress={useMyLocation}
              disabled={busy}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#4338ca",
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
              }}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#4338ca" />
              ) : (
                <>
                  <Ionicons name="navigate-outline" size={18} color="#4338ca" />
                  <Text style={{ color: "#4338ca", fontWeight: "600", marginLeft: 6 }}>
                    Vị trí của tôi
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!pendingCoords}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                paddingVertical: 12,
                backgroundColor: pendingCoords ? "#114F99" : "#d1d5db",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                Xác nhận vị trí
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
