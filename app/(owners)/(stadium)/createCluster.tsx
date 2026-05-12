import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { SPORT_TYPE_PICKER_OPTIONS } from "@/src/utils/sport-type.util";

const SPORT_TYPE_OPTIONS = SPORT_TYPE_PICKER_OPTIONS;

interface Province {
  code: number;
  name: string;
  districts?: District[];
}

interface District {
  code: number;
  name: string;
  province_code: number;
  wards?: Ward[];
}

interface Ward {
  code: number;
  name: string;
  district_code: number;
}

const MAJOR_PROVINCES: Province[] = [
  { code: 79, name: "Thành phố Hồ Chí Minh" },
  { code: 1, name: "Thành phố Hà Nội" },
  { code: 48, name: "Thành phố Đà Nẵng" },
  { code: 92, name: "Thành phố Cần Thơ" },
  { code: 31, name: "Thành phố Hải Phòng" },
  { code: 46, name: "Tỉnh Thừa Thiên Huế" },
  { code: 56, name: "Tỉnh Khánh Hòa" },
  { code: 77, name: "Tỉnh Bà Rịa - Vũng Tàu" },
  { code: 74, name: "Tỉnh Bình Dương" },
  { code: 75, name: "Tỉnh Đồng Nai" },
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
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedAreaDistrictCode, setSelectedAreaDistrictCode] = useState("");
  const [selectedAreaDistrictName, setSelectedAreaDistrictName] = useState("");
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [showWardModal, setShowWardModal] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [wardSearch, setWardSearch] = useState("");
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

  useEffect(() => {
    if (!selectedProvinceCode) {
      setDistricts([]);
      setSelectedAreaDistrictCode("");
      setSelectedAreaDistrictName("");
      setWards([]);
      return;
    }

    const fetchDistricts = async () => {
      try {
        setLoadingDistricts(true);
        const response = await fetch(
          `https://provinces.open-api.vn/api/p/${selectedProvinceCode}?depth=2`
        );
        const data: Province = await response.json();
        setDistricts(data.districts || []);
      } catch {
        setDistricts([]);
        Alert.alert("Lỗi", "Không thể tải danh sách quận/huyện. Vui lòng thử lại.");
      } finally {
        setLoadingDistricts(false);
      }
    };

    fetchDistricts();
  }, [selectedProvinceCode]);

  useEffect(() => {
    if (!selectedAreaDistrictCode) {
      setWards([]);
      return;
    }

    const fetchWards = async () => {
      try {
        setLoadingWards(true);
        const response = await fetch(
          `https://provinces.open-api.vn/api/d/${selectedAreaDistrictCode}?depth=2`
        );
        const data: District = await response.json();
        setWards(data.wards || []);
      } catch {
        setWards([]);
        Alert.alert("Lỗi", "Không thể tải danh sách phường/xã. Vui lòng thử lại.");
      } finally {
        setLoadingWards(false);
      }
    };

    fetchWards();
  }, [selectedAreaDistrictCode]);

  const filteredProvinces = useMemo(() => {
    const keyword = provinceSearch.trim().toLowerCase();
    if (!keyword) return MAJOR_PROVINCES;
    return MAJOR_PROVINCES.filter((item) =>
      item.name.toLowerCase().includes(keyword)
    );
  }, [provinceSearch]);

  const filteredDistricts = useMemo(() => {
    const keyword = districtSearch.trim().toLowerCase();
    if (!keyword) return districts;
    return districts.filter((item) => item.name.toLowerCase().includes(keyword));
  }, [districtSearch, districts]);

  const filteredWards = useMemo(() => {
    const keyword = wardSearch.trim().toLowerCase();
    if (!keyword) return wards;
    return wards.filter((item) => item.name.toLowerCase().includes(keyword));
  }, [wardSearch, wards]);

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
    if (!city.trim()) return "Vui lòng chọn tỉnh/thành phố.";
    if (!selectedAreaDistrictCode) return "Vui lòng chọn quận/huyện để lấy danh sách phường/xã.";
    if (!district.trim()) return "Vui lòng chọn phường/xã.";
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
          onPress: () =>
            router.replace({
              pathname: "/(owners)/(stadium)/clusterDetail",
              params: { id: String(created.id) },
            }),
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

  const handleSelectProvince = (province: Province) => {
    setSelectedProvinceCode(province.code.toString());
    setCity(province.name);
    setSelectedAreaDistrictCode("");
    setSelectedAreaDistrictName("");
    setDistrict("");
    setDistrictSearch("");
    setWardSearch("");
    setWards([]);
    setProvinceSearch("");
    setShowProvinceModal(false);
  };

  const handleSelectDistrict = (selectedDistrict: District) => {
    setSelectedAreaDistrictCode(selectedDistrict.code.toString());
    setSelectedAreaDistrictName(selectedDistrict.name);
    setDistrict("");
    setDistrictSearch("");
    setWardSearch("");
    setShowDistrictModal(false);
  };

  const handleSelectWard = (ward: Ward) => {
    setDistrict(ward.name);
    setWardSearch("");
    setShowWardModal(false);
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
          <Text className="text-black text-[15px] font-medium mb-2">Tỉnh/Thành phố</Text>
          <TouchableOpacity
            className="bg-gray-100 border border-gray-300 rounded-lg p-4 flex-row items-center justify-between"
            onPress={() => setShowProvinceModal(true)}
            disabled={submitting}
          >
            <Text className={`text-[15px] ${city ? "text-black font-semibold" : "text-[#8391A1]"}`}>
              {city || "Chọn tỉnh/thành phố"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#667085" />
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <Text className="text-black text-[15px] font-medium mb-2">Quận/Huyện</Text>
          <TouchableOpacity
            className={`border rounded-lg p-4 flex-row items-center justify-between ${
              city ? "bg-gray-100 border-gray-300" : "bg-gray-50 border-gray-200"
            }`}
            onPress={() => setShowDistrictModal(true)}
            disabled={submitting || !city || loadingDistricts}
          >
            <View className="flex-1 pr-3">
              <Text
                className={`text-[15px] ${
                  selectedAreaDistrictName ? "text-black font-semibold" : city ? "text-[#8391A1]" : "text-gray-400"
                }`}
              >
                {selectedAreaDistrictName || (city ? "Chọn quận/huyện" : "Chọn tỉnh/thành phố trước")}
              </Text>
              {loadingDistricts ? (
                <Text className="text-xs text-gray-500 mt-1">Đang tải quận/huyện...</Text>
              ) : null}
            </View>
            {loadingDistricts ? (
              <ActivityIndicator size="small" color="#114F99" />
            ) : (
              <Ionicons name="chevron-down" size={20} color="#667085" />
            )}
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <Text className="text-black text-[15px] font-medium mb-2">Phường/Xã</Text>
          <TouchableOpacity
            className={`border rounded-lg p-4 flex-row items-center justify-between ${
              selectedAreaDistrictCode ? "bg-gray-100 border-gray-300" : "bg-gray-50 border-gray-200"
            }`}
            onPress={() => setShowWardModal(true)}
            disabled={submitting || !selectedAreaDistrictCode || loadingWards}
          >
            <View className="flex-1 pr-3">
              <Text
                className={`text-[15px] ${
                  district ? "text-black font-semibold" : selectedAreaDistrictCode ? "text-[#8391A1]" : "text-gray-400"
                }`}
              >
                {district || (selectedAreaDistrictCode ? "Chọn phường/xã" : "Chọn quận/huyện trước")}
              </Text>
              {loadingWards ? (
                <Text className="text-xs text-gray-500 mt-1">Đang tải phường/xã...</Text>
              ) : null}
            </View>
            {loadingWards ? (
              <ActivityIndicator size="small" color="#114F99" />
            ) : (
              <Ionicons name="chevron-down" size={20} color="#667085" />
            )}
          </TouchableOpacity>
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
        visible={showProvinceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProvinceModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-base font-semibold text-black">Chọn Tỉnh/Thành phố</Text>
              <TouchableOpacity onPress={() => setShowProvinceModal(false)}>
                <Ionicons name="close" size={22} color="#667085" />
              </TouchableOpacity>
            </View>

            <View className="px-4 py-3">
              <View className="h-11 flex-row items-center bg-gray-100 rounded-lg px-3">
                <Ionicons name="search" size={18} color="#667085" />
                <TextInput
                  className="flex-1 ml-2 text-[15px] text-black"
                  placeholder="Tìm tỉnh/thành phố..."
                  placeholderTextColor="#8391A1"
                  value={provinceSearch}
                  onChangeText={setProvinceSearch}
                  autoFocus
                />
                {provinceSearch ? (
                  <TouchableOpacity onPress={() => setProvinceSearch("")}>
                    <Ionicons name="close-circle" size={18} color="#98A2B3" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <FlatList
              data={filteredProvinces}
              keyExtractor={(item) => item.code.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.name === city;
                return (
                  <TouchableOpacity
                    className="px-4 py-4 border-b border-gray-100 flex-row items-center justify-between"
                    onPress={() => handleSelectProvince(item)}
                  >
                    <Text
                      className={`text-[15px] ${
                        active ? "text-[#114F99] font-semibold" : "text-gray-800"
                      }`}
                    >
                      {item.name}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={20} color="#114F99" />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text className="text-center text-gray-500 py-6">
                  Không tìm thấy tỉnh/thành phố phù hợp.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDistrictModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDistrictModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <View className="flex-1 pr-3">
                <Text className="text-base font-semibold text-black">Chọn Quận/Huyện</Text>
                <Text className="text-xs text-gray-500 mt-1">{city || "Chưa chọn tỉnh/thành phố"}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDistrictModal(false)}>
                <Ionicons name="close" size={22} color="#667085" />
              </TouchableOpacity>
            </View>

            <View className="px-4 py-3">
              <View className="h-11 flex-row items-center bg-gray-100 rounded-lg px-3">
                <Ionicons name="search" size={18} color="#667085" />
                <TextInput
                  className="flex-1 ml-2 text-[15px] text-black"
                  placeholder="Tìm quận/huyện..."
                  placeholderTextColor="#8391A1"
                  value={districtSearch}
                  onChangeText={setDistrictSearch}
                  autoFocus
                />
                {districtSearch ? (
                  <TouchableOpacity onPress={() => setDistrictSearch("")}>
                    <Ionicons name="close-circle" size={18} color="#98A2B3" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {loadingDistricts ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#114F99" />
                <Text className="text-gray-600 mt-3">Đang tải quận/huyện...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredDistricts}
                keyExtractor={(item) => item.code.toString()}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const active = item.name === selectedAreaDistrictName;
                  return (
                    <TouchableOpacity
                      className="px-4 py-4 border-b border-gray-100 flex-row items-center justify-between"
                      onPress={() => handleSelectDistrict(item)}
                    >
                      <Text
                        className={`text-[15px] ${
                          active ? "text-[#114F99] font-semibold" : "text-gray-800"
                        }`}
                      >
                        {item.name}
                      </Text>
                      {active ? (
                        <Ionicons name="checkmark-circle" size={20} color="#114F99" />
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text className="text-center text-gray-500 py-6">
                    Không tìm thấy quận/huyện phù hợp.
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showWardModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWardModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <View className="flex-1 pr-3">
                <Text className="text-base font-semibold text-black">Chọn Phường/Xã</Text>
                <Text className="text-xs text-gray-500 mt-1">{selectedAreaDistrictName || "Chưa chọn quận/huyện"}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowWardModal(false)}>
                <Ionicons name="close" size={22} color="#667085" />
              </TouchableOpacity>
            </View>

            <View className="px-4 py-3">
              <View className="h-11 flex-row items-center bg-gray-100 rounded-lg px-3">
                <Ionicons name="search" size={18} color="#667085" />
                <TextInput
                  className="flex-1 ml-2 text-[15px] text-black"
                  placeholder="Tìm phường/xã..."
                  placeholderTextColor="#8391A1"
                  value={wardSearch}
                  onChangeText={setWardSearch}
                  autoFocus
                />
                {wardSearch ? (
                  <TouchableOpacity onPress={() => setWardSearch("")}>
                    <Ionicons name="close-circle" size={18} color="#98A2B3" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {loadingWards ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#114F99" />
                <Text className="text-gray-600 mt-3">Đang tải phường/xã...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredWards}
                keyExtractor={(item) => item.code.toString()}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const active = item.name === district;
                  return (
                    <TouchableOpacity
                      className="px-4 py-4 border-b border-gray-100 flex-row items-center justify-between"
                      onPress={() => handleSelectWard(item)}
                    >
                      <Text
                        className={`text-[15px] ${
                          active ? "text-[#114F99] font-semibold" : "text-gray-800"
                        }`}
                      >
                        {item.name}
                      </Text>
                      {active ? (
                        <Ionicons name="checkmark-circle" size={20} color="#114F99" />
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text className="text-center text-gray-500 py-6">
                    Không tìm thấy phường/xã phù hợp.
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

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
