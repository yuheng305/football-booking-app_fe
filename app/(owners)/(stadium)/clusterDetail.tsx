import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { clusterService } from "@/src/services/cluster.service";
import { imageService } from "@/src/services/image.service";
import type { Cluster, UpdateClusterRequest } from "@/src/types/cluster.types";
import type { ImageItem } from "@/src/types/image.types";
import {
  ownerStadiumManagementTarget,
  resolveOwnerClusterDetailBackTarget,
} from "@/src/utils/owner-stadium-navigation.util";
import { formatSportDisplay, SPORT_TYPE_PICKER_OPTIONS } from "@/src/utils/sport-type.util";

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

const getApprovalBadge = (isAccepted: boolean | null) => {
  if (isAccepted === true) {
    return {
      label: "Admin đã phê duyệt",
      containerClass: "bg-emerald-50 border-emerald-200",
      textClass: "text-emerald-700",
    };
  }

  if (isAccepted === false) {
    return {
      label: "Admin đã từ chối",
      containerClass: "bg-red-50 border-red-200",
      textClass: "text-red-700",
    };
  }

  return {
    label: "Chưa được duyệt",
    containerClass: "bg-amber-50 border-amber-200",
    textClass: "text-amber-700",
  };
};

export default function OwnerClusterDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const selectedClusterId = Number(params.id);
  const routeClusterId = Number.isFinite(selectedClusterId) && selectedClusterId > 0
    ? selectedClusterId
    : null;
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clusterImages, setClusterImages] = useState<ImageItem[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<"open" | "close" | null>(null);
  const [editProvinceCode, setEditProvinceCode] = useState("");
  const [editAreaDistrictCode, setEditAreaDistrictCode] = useState("");
  const [editAreaDistrictName, setEditAreaDistrictName] = useState("");
  const [editDistricts, setEditDistricts] = useState<District[]>([]);
  const [editWards, setEditWards] = useState<Ward[]>([]);
  const [loadingEditDistricts, setLoadingEditDistricts] = useState(false);
  const [loadingEditWards, setLoadingEditWards] = useState(false);
  const [showEditProvinceModal, setShowEditProvinceModal] = useState(false);
  const [showEditDistrictModal, setShowEditDistrictModal] = useState(false);
  const [showEditWardModal, setShowEditWardModal] = useState(false);
  const [editProvinceSearch, setEditProvinceSearch] = useState("");
  const [editDistrictSearch, setEditDistrictSearch] = useState("");
  const [editWardSearch, setEditWardSearch] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    street: "",
    district: "",
    city: "",
    open_time: "06:00:00",
    close_time: "22:00:00",
    status: "active" as "active" | "inactive",
    sport_type_ids: [] as number[],
  });

  const formatTime = (time: string) => {
    if (!time) return "--:--";
    return time.slice(0, 5);
  };

  const formatDate = (iso: string) => {
    if (!iso) return "Không có";
    return new Date(iso).toLocaleString("vi-VN");
  };

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

  const selectedSportNames = useMemo(
    () =>
      SPORT_TYPE_OPTIONS.filter((item) => editForm.sport_type_ids.includes(item.id)).map(
        (item) => item.label
      ),
    [editForm.sport_type_ids]
  );

  useEffect(() => {
    if (!editProvinceCode) {
      setEditDistricts([]);
      setEditAreaDistrictCode("");
      setEditAreaDistrictName("");
      setEditWards([]);
      return;
    }

    const fetchDistricts = async () => {
      try {
        setLoadingEditDistricts(true);
        const response = await fetch(
          `https://provinces.open-api.vn/api/p/${editProvinceCode}?depth=2`
        );
        const data: Province = await response.json();
        setEditDistricts(data.districts || []);
      } catch {
        setEditDistricts([]);
        Alert.alert("Lỗi", "Không thể tải danh sách khu vực. Vui lòng thử lại.");
      } finally {
        setLoadingEditDistricts(false);
      }
    };

    fetchDistricts();
  }, [editProvinceCode]);

  useEffect(() => {
    if (!editAreaDistrictCode) {
      setEditWards([]);
      return;
    }

    const fetchWards = async () => {
      try {
        setLoadingEditWards(true);
        const response = await fetch(
          `https://provinces.open-api.vn/api/d/${editAreaDistrictCode}?depth=2`
        );
        const data: District = await response.json();
        setEditWards(data.wards || []);
      } catch {
        setEditWards([]);
        Alert.alert("Lỗi", "Không thể tải danh sách phường/xã. Vui lòng thử lại.");
      } finally {
        setLoadingEditWards(false);
      }
    };

    fetchWards();
  }, [editAreaDistrictCode]);

  const filteredEditProvinces = useMemo(() => {
    const keyword = editProvinceSearch.trim().toLowerCase();
    if (!keyword) return MAJOR_PROVINCES;
    return MAJOR_PROVINCES.filter((item) =>
      item.name.toLowerCase().includes(keyword)
    );
  }, [editProvinceSearch]);

  const filteredEditDistricts = useMemo(() => {
    const keyword = editDistrictSearch.trim().toLowerCase();
    if (!keyword) return editDistricts;
    return editDistricts.filter((item) =>
      item.name.toLowerCase().includes(keyword)
    );
  }, [editDistrictSearch, editDistricts]);

  const filteredEditWards = useMemo(() => {
    const keyword = editWardSearch.trim().toLowerCase();
    if (!keyword) return editWards;
    return editWards.filter((item) =>
      item.name.toLowerCase().includes(keyword)
    );
  }, [editWardSearch, editWards]);

  const loadCluster = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      if (!routeClusterId) {
        setCluster(null);
        setClusterImages([]);
        setError("Không tìm thấy mã cụm sân.");
        return;
      }

      const data = await clusterService.getCluster(routeClusterId);
      setCluster(data);

      try {
        const images = await imageService.getClusterImages(routeClusterId);
        setClusterImages(images);
      } catch {
        setClusterImages([]);
      }
    } catch (err: any) {
      setError(err?.message || "Không thể tải thông tin cụm sân");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [routeClusterId]);

  useEffect(() => {
    loadCluster();
  }, [loadCluster]);

  const handleBackToClusterList = () => {
    router.replace(resolveOwnerClusterDetailBackTarget() as never);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCluster(true);
  };

  const openEditModal = () => {
    if (!cluster) return;
    const matchedProvince = MAJOR_PROVINCES.find(
      (province) => province.name.toLowerCase() === (cluster.city ?? "").toLowerCase()
    );

    setEditForm({
      name: cluster.name ?? "",
      street: cluster.street ?? "",
      district: cluster.district ?? "",
      city: cluster.city ?? "",
      open_time: cluster.open_time ?? "06:00:00",
      close_time: cluster.close_time ?? "22:00:00",
      status: cluster.status ?? "active",
      sport_type_ids: cluster.sport_types?.map((sport) => sport.id) ?? [],
    });
    setEditProvinceCode(matchedProvince ? String(matchedProvince.code) : "");
    setEditAreaDistrictCode("");
    setEditAreaDistrictName("");
    setEditWards([]);
    setEditProvinceSearch("");
    setEditDistrictSearch("");
    setEditWardSearch("");
    setEditModalVisible(true);
  };

  const toggleSportType = (id: number) => {
    setEditForm((prev) => {
      const exists = prev.sport_type_ids.includes(id);
      return {
        ...prev,
        sport_type_ids: exists
          ? prev.sport_type_ids.filter((value) => value !== id)
          : [...prev.sport_type_ids, id].sort((a, b) => a - b),
      };
    });
  };

  const handleSelectEditProvince = (province: Province) => {
    setEditProvinceCode(String(province.code));
    setEditAreaDistrictCode("");
    setEditAreaDistrictName("");
    setEditWards([]);
    setEditForm((prev) => ({
      ...prev,
      city: province.name,
      district: "",
    }));
    setEditProvinceSearch("");
    setEditDistrictSearch("");
    setEditWardSearch("");
    setShowEditProvinceModal(false);
  };

  const handleSelectEditDistrict = (district: District) => {
    setEditAreaDistrictCode(String(district.code));
    setEditAreaDistrictName(district.name);
    setEditForm((prev) => ({
      ...prev,
      district: "",
    }));
    setEditDistrictSearch("");
    setEditWardSearch("");
    setShowEditDistrictModal(false);
  };

  const handleSelectEditWard = (ward: Ward) => {
    setEditForm((prev) => ({
      ...prev,
      district: ward.name,
    }));
    setEditWardSearch("");
    setShowEditWardModal(false);
  };

  const validateUpdate = (): string | null => {
    if (!editForm.name.trim()) return "Vui lòng nhập tên cụm sân.";
    if (!editForm.street.trim()) return "Vui lòng nhập số nhà, đường.";
    if (!editForm.district.trim()) return "Vui lòng chọn phường/xã.";
    if (!editForm.city.trim()) return "Vui lòng nhập tỉnh/thành phố.";
    if (editForm.sport_type_ids.length === 0) return "Vui lòng chọn ít nhất 1 môn thể thao.";
    const openMinutes = parseTimeToMinutes(editForm.open_time);
    const closeMinutes = parseTimeToMinutes(editForm.close_time);
    if (openMinutes < 0 || closeMinutes < 0) return "Thời gian không hợp lệ.";
    if (openMinutes >= closeMinutes) return "Giờ mở cửa phải nhỏ hơn giờ đóng cửa.";
    return null;
  };

  const handleUpdateCluster = async () => {
    if (!cluster?.id) return;
    const validationError = validateUpdate();
    if (validationError) {
      Alert.alert("Dữ liệu chưa hợp lệ", validationError);
      return;
    }
    const payload: UpdateClusterRequest = {
      name: editForm.name.trim(),
      street: editForm.street.trim(),
      district: editForm.district.trim(),
      city: editForm.city.trim(),
      open_time: editForm.open_time,
      close_time: editForm.close_time,
      status: editForm.status,
      sport_type_ids: editForm.sport_type_ids,
    };
    try {
      setSavingUpdate(true);
      const updatedCluster = await clusterService.updateCluster(cluster.id, payload);
      setCluster(updatedCluster);
      setEditModalVisible(false);
      await loadCluster(true);
      Alert.alert("Thành công", "Đã cập nhật thông tin cụm sân.");
    } catch (updateError: any) {
      Alert.alert("Lỗi", updateError?.message || "Không thể cập nhật cụm sân");
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleUploadClusterImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    try {
      setUploadingImage(true);
      const asset = result.assets[0];
      const targetClusterId = cluster?.id ?? routeClusterId;
      if (!targetClusterId) {
        Alert.alert("Lỗi", "Không tìm thấy mã cụm sân để tải ảnh.");
        return;
      }
      const uploaded = await imageService.uploadImage(
        "cluster",
        asset.uri,
        asset.fileName || undefined,
        asset.mimeType || undefined,
        targetClusterId,
        asset.fileSize || undefined
      );

      if (uploaded.url) {
        setClusterImages((prev) => {
          const withoutCurrent = prev.filter((item) => item.id !== uploaded.id);
          return [uploaded, ...withoutCurrent];
        });
        Alert.alert("Thành công", "Đã tải ảnh cụm sân lên");
      }
    } catch (uploadError: any) {
      Alert.alert("Lỗi", uploadError?.message || "Không thể tải ảnh lên");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteClusterImage = (image: ImageItem) => {
    if (!image?.id) {
      Alert.alert("Lỗi", "Không tìm thấy image_id để xóa");
      return;
    }

    Alert.alert("Xóa ảnh", "Bạn có chắc muốn xóa ảnh này?", [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            const targetClusterId = cluster?.id ?? routeClusterId;
            if (!targetClusterId) {
              Alert.alert("Lỗi", "Không tìm thấy mã cụm sân để xóa ảnh.");
              return;
            }
            setDeletingImageId(image.id as number);
            await imageService.deleteImage("cluster", image.id as number, targetClusterId);

            setClusterImages((prev) => prev.filter((item) => item.id !== image.id));
            Alert.alert("Thành công", "Đã xóa ảnh cụm sân");
          } catch (deleteError: any) {
            Alert.alert("Lỗi", deleteError?.message || "Không thể xóa ảnh");
          } finally {
            setDeletingImageId(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#114F99" />
        <Text className="mt-3 text-gray-700">Đang tải thông tin cụm sân...</Text>
      </SafeAreaView>
    );
  }

  if (error || !cluster) {
    return (
      <SafeAreaView className="flex-1 bg-white px-4 items-center justify-center">
        <Ionicons name="alert-circle-outline" size={56} color="#ef4444" />
        <Text className="text-red-500 text-center mt-3">{error || "Không có dữ liệu cụm sân"}</Text>
        <TouchableOpacity
          className="mt-4 bg-[#114F99] px-5 py-3 rounded-lg"
          onPress={() => loadCluster()}
        >
          <Text className="text-white font-semibold">Thử lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const approvalBadge = getApprovalBadge(cluster.is_accepted);
  const isRejectedCluster = cluster.is_accepted === false;

  return (
    <SafeAreaView className="flex-1 bg-[#F6F8FC]">
      <View className="flex-row items-center px-4 pt-4 pb-2 bg-white">
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={handleBackToClusterList}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>

        <Text className="flex-1 text-center text-[24px] font-bold text-[#1E232C] mr-10">
          Chi tiết cụm sân
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-[#1E232C]">{cluster.name}</Text>
            <View className={`px-3 py-1 rounded-full ${cluster.status === "active" ? "bg-green-100" : "bg-gray-200"}`}>
              <Text className={`font-semibold ${cluster.status === "active" ? "text-green-700" : "text-gray-700"}`}>
                {cluster.status === "active" ? "Đang hoạt động" : "Không hoạt động"}
              </Text>
            </View>
          </View>
          <Text className="text-gray-500 mt-1">Mã cụm sân: #{cluster.id}</Text>
          <View
            className={`mt-3 self-start px-3 py-1 rounded-full border ${approvalBadge.containerClass}`}
          >
            <Text className={`text-xs font-semibold ${approvalBadge.textClass}`}>
              {approvalBadge.label}
            </Text>
          </View>

          {isRejectedCluster ? (
            <View className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
              <Text className="text-red-700 font-semibold">Cụm sân đã bị từ chối</Text>
              <Text className="text-red-600 text-xs mt-1">
                Bạn không thể cập nhật thông tin, tải ảnh hoặc quản lý sân con cho cụm sân này.
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            className={`mt-4 py-2 rounded-lg items-center ${
              isRejectedCluster ? "bg-gray-300" : "bg-[#114F99]"
            }`}
            onPress={openEditModal}
            disabled={isRejectedCluster}
          >
            <Text className={`font-semibold ${isRejectedCluster ? "text-gray-600" : "text-white"}`}>
              Cập nhật thông tin cụm sân
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`mt-3 bg-white border py-2 rounded-lg items-center ${
              isRejectedCluster ? "border-gray-300" : "border-[#114F99]"
            }`}
            onPress={() => router.push(ownerStadiumManagementTarget(cluster.id) as never)}
            disabled={isRejectedCluster}
          >
            <Text className={`font-semibold ${isRejectedCluster ? "text-gray-500" : "text-[#114F99]"}`}>
              Xem danh sách sân con
            </Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-[#1E232C]">Ảnh cụm sân</Text>
            <TouchableOpacity
              className={`px-3 py-2 rounded-lg ${
                uploadingImage || isRejectedCluster ? "bg-gray-300" : "bg-[#114F99]"
              }`}
              onPress={handleUploadClusterImage}
              disabled={uploadingImage || isRejectedCluster}
            >
              <Text className={`font-semibold ${isRejectedCluster ? "text-gray-600" : "text-white"}`}>
                {uploadingImage ? "Đang tải..." : "Tải lên/Cập nhật"}
              </Text>
            </TouchableOpacity>
          </View>
          {clusterImages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {clusterImages.map((image) => (
                <View key={`${image.id ?? image.url}`} className="mr-3 relative">
                  <Image
                    source={{ uri: image.url }}
                    className="w-36 h-24 rounded-xl"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    className={`absolute top-1 right-1 w-7 h-7 rounded-full items-center justify-center ${
                      deletingImageId === image.id || isRejectedCluster ? "bg-gray-400" : "bg-red-500"
                    }`}
                    onPress={() => handleDeleteClusterImage(image)}
                    disabled={deletingImageId === image.id || !image.id || isRejectedCluster}
                  >
                    {deletingImageId === image.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="trash-outline" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text className="text-gray-500">Chưa có ảnh cụm sân</Text>
          )}
        </View>

        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <Text className="text-lg font-bold text-[#1E232C] mb-3">Địa chỉ</Text>
          <View className="flex-row items-start">
            <Ionicons name="location-outline" size={20} color="#6b7280" />
            <Text className="text-gray-800 ml-2 flex-1">
              {cluster.street}, {cluster.district}, {cluster.city}
            </Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <Text className="text-lg font-bold text-[#1E232C] mb-3">Thời gian hoạt động</Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={20} color="#6b7280" />
              <Text className="ml-2 text-gray-700">Mở cửa</Text>
            </View>
            <Text className="font-semibold text-[#114F99]">{formatTime(cluster.open_time)}</Text>
          </View>
          <View className="flex-row items-center justify-between mt-2">
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={20} color="#6b7280" />
              <Text className="ml-2 text-gray-700">Đóng cửa</Text>
            </View>
            <Text className="font-semibold text-[#114F99]">{formatTime(cluster.close_time)}</Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <Text className="text-lg font-bold text-[#1E232C] mb-3">Môn thể thao hỗ trợ</Text>
          <View className="flex-row flex-wrap">
            {cluster.sport_types && cluster.sport_types.length > 0 ? (
              cluster.sport_types.map((sport) => (
                <View key={sport.id} className="bg-blue-50 border border-blue-200 px-3 py-2 rounded-full mr-2 mb-2">
                  <Text className="text-blue-700 font-medium">
                    {formatSportDisplay(sport.name, sport.id)}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-gray-500">Chưa có dữ liệu môn thể thao</Text>
            )}
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-100">
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Cập nhật lần cuối</Text>
            <Text className="font-semibold text-gray-800">{formatDate(cluster.updated_at)}</Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          className="flex-1 bg-black/40 justify-end"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View className="bg-white rounded-t-3xl p-4 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-semibold text-black">Cập nhật cụm sân</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} disabled={savingUpdate}>
                <Text className="text-[#114F99] font-semibold">Đóng</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="text-black text-[15px] font-medium mb-2">Tên cụm sân</Text>
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded-lg p-3 text-black text-[15px] mb-3"
                value={editForm.name}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, name: value }))}
                editable={!savingUpdate}
              />

              <Text className="text-black text-[15px] font-medium mb-2">Số nhà, đường</Text>
              <TextInput
                className="bg-gray-100 border border-gray-300 rounded-lg p-3 text-black text-[15px] mb-3"
                value={editForm.street}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, street: value }))}
                editable={!savingUpdate}
              />

              <Text className="text-black text-[15px] font-medium mb-2">Tỉnh/Thành phố</Text>
              <TouchableOpacity
                className="bg-gray-100 border border-gray-300 rounded-lg p-3 mb-3 flex-row items-center justify-between"
                onPress={() => setShowEditProvinceModal(true)}
                disabled={savingUpdate}
              >
                <Text
                  className={`text-[15px] ${
                    editForm.city ? "text-black font-semibold" : "text-gray-400"
                  }`}
                >
                  {editForm.city || "Chọn tỉnh/thành phố"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#667085" />
              </TouchableOpacity>

              <Text className="text-black text-[15px] font-medium mb-2">Khu vực</Text>
              <TouchableOpacity
                className={`border rounded-lg p-3 mb-3 flex-row items-center justify-between ${
                  editProvinceCode ? "bg-gray-100 border-gray-300" : "bg-gray-50 border-gray-200"
                }`}
                onPress={() => setShowEditDistrictModal(true)}
                disabled={savingUpdate || !editProvinceCode || loadingEditDistricts}
              >
                <View className="flex-1 pr-3">
                  <Text
                    className={`text-[15px] ${
                      editAreaDistrictName
                        ? "text-black font-semibold"
                        : editProvinceCode
                          ? "text-gray-400"
                          : "text-gray-400"
                    }`}
                  >
                    {editAreaDistrictName ||
                      (editProvinceCode
                        ? "Chọn khu vực"
                        : "Chọn tỉnh/thành phố trước")}
                  </Text>
                  {loadingEditDistricts ? (
                    <Text className="text-xs text-gray-500 mt-1">Đang tải khu vực...</Text>
                  ) : null}
                </View>
                {loadingEditDistricts ? (
                  <ActivityIndicator size="small" color="#114F99" />
                ) : (
                  <Ionicons name="chevron-down" size={20} color="#667085" />
                )}
              </TouchableOpacity>

              <Text className="text-black text-[15px] font-medium mb-2">Phường/Xã</Text>
              <TouchableOpacity
                className={`border rounded-lg p-3 mb-3 flex-row items-center justify-between ${
                  editAreaDistrictCode ? "bg-gray-100 border-gray-300" : "bg-gray-50 border-gray-200"
                }`}
                onPress={() => setShowEditWardModal(true)}
                disabled={savingUpdate || !editAreaDistrictCode || loadingEditWards}
              >
                <View className="flex-1 pr-3">
                  <Text
                    className={`text-[15px] ${
                      editForm.district
                        ? "text-black font-semibold"
                        : editAreaDistrictCode
                          ? "text-gray-400"
                          : "text-gray-400"
                    }`}
                  >
                    {editForm.district ||
                      (editAreaDistrictCode
                        ? "Chọn phường/xã"
                        : "Chọn khu vực trước")}
                  </Text>
                  {loadingEditWards ? (
                    <Text className="text-xs text-gray-500 mt-1">Đang tải phường/xã...</Text>
                  ) : null}
                </View>
                {loadingEditWards ? (
                  <ActivityIndicator size="small" color="#114F99" />
                ) : (
                  <Ionicons name="chevron-down" size={20} color="#667085" />
                )}
              </TouchableOpacity>

              <Text className="text-black text-[15px] font-medium mb-2">Trạng thái</Text>
              <View className="flex-row mb-3">
                <TouchableOpacity
                  className={`mr-2 px-3 py-2 rounded-full border ${editForm.status === "active" ? "bg-[#114F99] border-[#114F99]" : "bg-white border-gray-300"}`}
                  onPress={() => setEditForm((prev) => ({ ...prev, status: "active" }))}
                  disabled={savingUpdate}
                >
                  <Text className={`${editForm.status === "active" ? "text-white" : "text-gray-700"} font-semibold`}>
                    Đang hoạt động
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`px-3 py-2 rounded-full border ${editForm.status === "inactive" ? "bg-[#114F99] border-[#114F99]" : "bg-white border-gray-300"}`}
                  onPress={() => setEditForm((prev) => ({ ...prev, status: "inactive" }))}
                  disabled={savingUpdate}
                >
                  <Text className={`${editForm.status === "inactive" ? "text-white" : "text-gray-700"} font-semibold`}>
                    Không hoạt động
                  </Text>
                </TouchableOpacity>
              </View>

              <Text className="text-black text-[15px] font-medium mb-2">Giờ mở cửa</Text>
              <TouchableOpacity
                className="bg-gray-100 border border-gray-300 rounded-lg p-3 mb-3"
                onPress={() => setTimePickerTarget("open")}
                disabled={savingUpdate}
              >
                <Text className="text-black text-[15px] font-semibold">{formatTime(editForm.open_time)}</Text>
              </TouchableOpacity>

              <Text className="text-black text-[15px] font-medium mb-2">Giờ đóng cửa</Text>
              <TouchableOpacity
                className="bg-gray-100 border border-gray-300 rounded-lg p-3 mb-3"
                onPress={() => setTimePickerTarget("close")}
                disabled={savingUpdate}
              >
                <Text className="text-black text-[15px] font-semibold">{formatTime(editForm.close_time)}</Text>
              </TouchableOpacity>

              <Text className="text-black text-[15px] font-medium mb-2">Môn thể thao</Text>
              <View className="flex-row flex-wrap mb-2">
                {SPORT_TYPE_OPTIONS.map((option) => {
                  const active = editForm.sport_type_ids.includes(option.id);
                  return (
                    <TouchableOpacity
                      key={option.id}
                      className={`mr-2 mb-2 px-3 py-2 rounded-full border ${active ? "bg-[#114F99] border-[#114F99]" : "bg-white border-gray-300"}`}
                      onPress={() => toggleSportType(option.id)}
                      disabled={savingUpdate}
                    >
                      <Text className={`font-semibold ${active ? "text-white" : "text-gray-700"}`}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text className="text-xs text-gray-500 mb-4">
                Đã chọn: {selectedSportNames.length > 0 ? selectedSportNames.join(", ") : "(chưa chọn)"}
              </Text>

              <TouchableOpacity
                className={`rounded-xl py-3 items-center mb-4 ${savingUpdate ? "bg-gray-400" : "bg-[#114F99]"}`}
                onPress={handleUpdateCluster}
                disabled={savingUpdate}
              >
                {savingUpdate ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text className="text-white font-semibold ml-2">Đang cập nhật...</Text>
                  </View>
                ) : (
                  <Text className="text-white font-semibold text-base">Lưu cập nhật</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showEditProvinceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditProvinceModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-base font-semibold text-black">Chọn Tỉnh/Thành phố</Text>
              <TouchableOpacity onPress={() => setShowEditProvinceModal(false)}>
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
                  value={editProvinceSearch}
                  onChangeText={setEditProvinceSearch}
                  autoFocus
                />
                {editProvinceSearch ? (
                  <TouchableOpacity onPress={() => setEditProvinceSearch("")}>
                    <Ionicons name="close-circle" size={18} color="#98A2B3" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <FlatList
              data={filteredEditProvinces}
              keyExtractor={(item) => item.code.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.name === editForm.city;
                return (
                  <TouchableOpacity
                    className="px-4 py-4 border-b border-gray-100 flex-row items-center justify-between"
                    onPress={() => handleSelectEditProvince(item)}
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
        visible={showEditDistrictModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditDistrictModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <View className="flex-1 pr-3">
                <Text className="text-base font-semibold text-black">Chọn khu vực</Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {editForm.city || "Chưa chọn tỉnh/thành phố"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditDistrictModal(false)}>
                <Ionicons name="close" size={22} color="#667085" />
              </TouchableOpacity>
            </View>

            <View className="px-4 py-3">
              <View className="h-11 flex-row items-center bg-gray-100 rounded-lg px-3">
                <Ionicons name="search" size={18} color="#667085" />
                <TextInput
                  className="flex-1 ml-2 text-[15px] text-black"
                  placeholder="Tìm khu vực..."
                  placeholderTextColor="#8391A1"
                  value={editDistrictSearch}
                  onChangeText={setEditDistrictSearch}
                  autoFocus
                />
                {editDistrictSearch ? (
                  <TouchableOpacity onPress={() => setEditDistrictSearch("")}>
                    <Ionicons name="close-circle" size={18} color="#98A2B3" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {loadingEditDistricts ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#114F99" />
                <Text className="text-gray-600 mt-3">Đang tải khu vực...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredEditDistricts}
                keyExtractor={(item) => item.code.toString()}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const active = item.name === editAreaDistrictName;
                  return (
                    <TouchableOpacity
                      className="px-4 py-4 border-b border-gray-100 flex-row items-center justify-between"
                      onPress={() => handleSelectEditDistrict(item)}
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
                    Không tìm thấy khu vực phù hợp.
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditWardModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditWardModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <View className="flex-1 pr-3">
                <Text className="text-base font-semibold text-black">Chọn Phường/Xã</Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {editAreaDistrictName || "Chưa chọn khu vực"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditWardModal(false)}>
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
                  value={editWardSearch}
                  onChangeText={setEditWardSearch}
                  autoFocus
                />
                {editWardSearch ? (
                  <TouchableOpacity onPress={() => setEditWardSearch("")}>
                    <Ionicons name="close-circle" size={18} color="#98A2B3" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {loadingEditWards ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#114F99" />
                <Text className="text-gray-600 mt-3">Đang tải phường/xã...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredEditWards}
                keyExtractor={(item) => item.code.toString()}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const active = item.name === editForm.district;
                  return (
                    <TouchableOpacity
                      className="px-4 py-4 border-b border-gray-100 flex-row items-center justify-between"
                      onPress={() => handleSelectEditWard(item)}
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

            <ScrollView keyboardShouldPersistTaps="handled">
              {TIME_OPTIONS.map((timeValue) => {
                const isActive =
                  (timePickerTarget === "open" && editForm.open_time === timeValue) ||
                  (timePickerTarget === "close" && editForm.close_time === timeValue);
                return (
                  <TouchableOpacity
                    key={timeValue}
                    className={`border rounded-xl p-3 mb-2 ${isActive ? "border-[#114F99] bg-blue-50" : "border-gray-200 bg-white"}`}
                    onPress={() => {
                      if (timePickerTarget === "open") {
                        setEditForm((prev) => ({ ...prev, open_time: timeValue }));
                      } else {
                        setEditForm((prev) => ({ ...prev, close_time: timeValue }));
                      }
                      setTimePickerTarget(null);
                    }}
                  >
                    <Text className={`font-semibold ${isActive ? "text-[#114F99]" : "text-gray-800"}`}>
                      {formatTime(timeValue)}
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
