import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { clusterService } from "@/src/services/cluster.service";
import type { CreateClusterRequest } from "@/src/types/cluster.types";

const SPORT_TYPE_OPTIONS = [
  { id: 1, label: "Bóng đá" },
  { id: 2, label: "Cầu lông" },
  { id: 3, label: "Pickleball" },
  { id: 4, label: "Tennis" },
  { id: 5, label: "Bóng rổ" },
];

const TIME_OPTIONS: string[] = Array.from({ length: 48 }).map((_, index) => {
  const totalMinutes = index * 30;
  const hour = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minute = String(totalMinutes % 60).padStart(2, "0");
  return `${hour}:${minute}:00`;
});

const parseTimeToMinutes = (value: string): number => {
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    return -1;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3]);

  if (hour > 23 || minute > 59 || second > 59) {
    return -1;
  }

  return hour * 60 + minute;
};

const formatDisplayTime = (value: string) => value.slice(0, 5);

export default function CreateClusterScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedSportTypeIds, setSelectedSportTypeIds] = useState<number[]>([1]);
  const [street, setStreet] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [openTime, setOpenTime] = useState("06:00:00");
  const [closeTime, setCloseTime] = useState("22:00:00");
  const [timePickerTarget, setTimePickerTarget] = useState<"open" | "close" | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  const selectedSportNames = useMemo(
    () =>
      SPORT_TYPE_OPTIONS.filter((item) => selectedSportTypeIds.includes(item.id)).map(
        (item) => item.label
      ),
    [selectedSportTypeIds]
  );

  const toggleSportType = (id: number) => {
    setSelectedSportTypeIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((value) => value !== id);
      }

      return [...prev, id].sort((a, b) => a - b);
    });
  };

  const validate = (): string | null => {
    if (!name.trim()) return "Vui lòng nhập tên cụm sân.";
    if (!street.trim()) return "Vui lòng nhập số nhà, đường.";
    if (!district.trim()) return "Vui lòng nhập quận/huyện.";
    if (!city.trim()) return "Vui lòng nhập tỉnh/thành phố.";
    if (selectedSportTypeIds.length === 0) {
      return "Vui lòng chọn ít nhất 1 môn thể thao.";
    }

    const parsedOpenTime = parseTimeToMinutes(openTime);
    const parsedCloseTime = parseTimeToMinutes(closeTime);

    if (parsedOpenTime < 0 || parsedCloseTime < 0) {
      return "Thời gian không hợp lệ. Vui lòng chọn giờ từ danh sách.";
    }

    if (parsedOpenTime >= parsedCloseTime) {
      return "Giờ mở cửa phải nhỏ hơn giờ đóng cửa.";
    }

    return null;
  };

  const onSubmit = async () => {
    const message = validate();
    if (message) {
      Alert.alert("Dữ liệu chưa hợp lệ", message);
      return;
    }

    const payload: CreateClusterRequest = {
      name: name.trim(),
      sport_type_ids: selectedSportTypeIds,
      street: street.trim(),
      district: district.trim(),
      city: city.trim(),
      open_time: openTime,
      close_time: closeTime,
    };

    try {
      setSubmitting(true);
      const created = await clusterService.createCluster(payload);

      Alert.alert("Thành công", `Đã tạo cụm sân #${created.id}: ${created.name}`, [
        {
          text: "Xem chi tiết",
          onPress: () => router.push("/(owners)/(stadium)/clusterDetail"),
        },
        {
          text: "Ở lại",
          style: "cancel",
        },
      ]);
    } catch (error: any) {
      Alert.alert("Tạo cụm sân thất bại", error?.message || "Đã có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() => router.back()}
          disabled={submitting}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>

        <Text className="flex-1 font-bold text-[24px] text-[#1E232C] text-center mr-10">
          Tạo cụm sân mới
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="mb-4">
          <Text className="text-black text-[15px] font-medium mb-2">Tên cụm sân</Text>
          <TextInput
            className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-black text-[15px]"
            value={name}
            onChangeText={setName}
            placeholder="Ví dụ: Cụm sân Bình Thạnh"
            placeholderTextColor="#8391A1"
            editable={!submitting}
          />
        </View>

        <View className="mb-4">
          <Text className="text-black text-[15px] font-medium mb-2">Môn thể thao</Text>
          <View className="flex-row flex-wrap">
            {SPORT_TYPE_OPTIONS.map((option) => {
              const active = selectedSportTypeIds.includes(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                    active
                      ? "bg-[#114F99] border-[#114F99]"
                      : "bg-white border-gray-300"
                  }`}
                  onPress={() => toggleSportType(option.id)}
                  disabled={submitting}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      active ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text className="text-xs text-gray-500 mt-1">
            Đã chọn: {selectedSportNames.length > 0 ? selectedSportNames.join(", ") : "(chưa chọn)"}
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-black text-[15px] font-medium mb-2">Số nhà, đường</Text>
          <TextInput
            className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-black text-[15px]"
            value={street}
            onChangeText={setStreet}
            placeholder="Ví dụ: 123 Điện Biên Phủ"
            placeholderTextColor="#8391A1"
            editable={!submitting}
          />
        </View>

        <View className="mb-4">
          <Text className="text-black text-[15px] font-medium mb-2">Quận/Huyện</Text>
          <TextInput
            className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-black text-[15px]"
            value={district}
            onChangeText={setDistrict}
            placeholder="Ví dụ: Bình Thạnh"
            placeholderTextColor="#8391A1"
            editable={!submitting}
          />
        </View>

        <View className="mb-4">
          <Text className="text-black text-[15px] font-medium mb-2">Tỉnh/Thành phố</Text>
          <TextInput
            className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-black text-[15px]"
            value={city}
            onChangeText={setCity}
            placeholder="Ví dụ: TP.HCM"
            placeholderTextColor="#8391A1"
            editable={!submitting}
          />
        </View>

        <View className="mb-4">
          <Text className="text-black text-[15px] font-medium mb-2">Giờ mở cửa</Text>
          <TouchableOpacity
            className="bg-gray-100 border border-gray-300 rounded-lg p-4"
            onPress={() => setTimePickerTarget("open")}
            disabled={submitting}
          >
            <Text className="text-black text-[15px] font-semibold">
              {formatDisplayTime(openTime)}
            </Text>
            <Text className="text-xs text-gray-500 mt-1">Nhấn để chọn giờ mở cửa</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-8">
          <Text className="text-black text-[15px] font-medium mb-2">Giờ đóng cửa</Text>
          <TouchableOpacity
            className="bg-gray-100 border border-gray-300 rounded-lg p-4"
            onPress={() => setTimePickerTarget("close")}
            disabled={submitting}
          >
            <Text className="text-black text-[15px] font-semibold">
              {formatDisplayTime(closeTime)}
            </Text>
            <Text className="text-xs text-gray-500 mt-1">Nhấn để chọn giờ đóng cửa</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className={`rounded-xl py-4 items-center ${submitting ? "bg-gray-400" : "bg-[#114F99]"}`}
          onPress={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#ffffff" />
              <Text className="text-white font-semibold ml-2">Đang tạo...</Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-base">Tạo cụm sân</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={!!timePickerTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setTimePickerTarget(null)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-4 max-h-[70%]">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-semibold text-black">
                {timePickerTarget === "open" ? "Chọn giờ mở cửa" : "Chọn giờ đóng cửa"}
              </Text>
              <TouchableOpacity onPress={() => setTimePickerTarget(null)}>
                <Text className="text-[#114F99] font-semibold">Đóng</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {TIME_OPTIONS.map((timeValue) => {
                const isActive =
                  (timePickerTarget === "open" && openTime === timeValue) ||
                  (timePickerTarget === "close" && closeTime === timeValue);

                return (
                  <TouchableOpacity
                    key={timeValue}
                    className={`border rounded-xl p-3 mb-2 ${
                      isActive
                        ? "border-[#114F99] bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                    onPress={() => {
                      if (timePickerTarget === "open") {
                        setOpenTime(timeValue);
                      }
                      if (timePickerTarget === "close") {
                        setCloseTime(timeValue);
                      }
                      setTimePickerTarget(null);
                    }}
                  >
                    <Text
                      className={`font-semibold ${
                        isActive ? "text-[#114F99]" : "text-gray-800"
                      }`}
                    >
                      {formatDisplayTime(timeValue)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
