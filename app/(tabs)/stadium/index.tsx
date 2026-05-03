import {
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeaderUser from "@/component/HeaderUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clusterService } from "@/src/services/cluster.service";
import { bookingDraftService } from "@/src/services/booking-draft.service";
import { imageService } from "@/src/services/image.service";
import { formatSportDisplay } from "@/src/utils/sport-type.util";

interface Cluster {
  id: number;
  name: string;
  sport_types?: {
    id: number;
    name: string;
    created_at?: string;
  }[];
  street: string;
  district: string;
  city: string;
  status: string;
  open_time: string;
  close_time: string;
  owner_id: number;
  is_accepted: boolean;
  accepted_by: number | null;
  created_at: string;
  updated_at: string;
  sport_type?: string;
  sport?: string;
  description?: string;
  sports_supported?: string[];
}

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

type SportFilter =
  | "all"
  | "football"
  | "badminton"
  | "tennis"
  | "pickleball"
  | "basketball";

const SPORT_FILTERS: Array<{ key: SportFilter; label: string; icon: string }> = [
  { key: "all", label: "Tất cả", icon: "apps-outline" },
  { key: "football", label: "Bóng đá", icon: "football-outline" },
  { key: "badminton", label: "Cầu lông", icon: "🏸" },
  { key: "tennis", label: "Quần vợt", icon: "tennisball-outline" },
  { key: "pickleball", label: "Pickleball", icon: "🏓" },
  { key: "basketball", label: "Bóng rổ", icon: "basketball-outline" },
];

const SPORT_TYPE_ID_MAP: Record<Exclude<SportFilter, "all">, number> = {
  football: 1,
  badminton: 2,
  pickleball: 3,
  tennis: 4,
  basketball: 5,
};

// Chỉ các tỉnh/thành phố lớn
const MAJOR_PROVINCES = [
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

const Location = () => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [clusterImageMap, setClusterImageMap] = useState<Record<number, string>>({});
  const [clusterPreviewVisible, setClusterPreviewVisible] = useState(false);
  const [clusterPreviewLoading, setClusterPreviewLoading] = useState(false);
  const [previewCluster, setPreviewCluster] = useState<Cluster | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [provinces, setProvinces] = useState<Province[]>(MAJOR_PROVINCES);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedProvinceName, setSelectedProvinceName] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>("");
  const [selectedWard, setSelectedWard] = useState<string>("");
  const [selectedWardName, setSelectedWardName] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [searchDraft, setSearchDraft] = useState<string>("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedSport, setSelectedSport] = useState<SportFilter>("all");
  
  // Pagination
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 30;
  
  // Filter visibility & Modal states
  const [showFilters, setShowFilters] = useState(false);
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [showWardModal, setShowWardModal] = useState(false);
  
  // Search within modal
  const [provinceSearch, setProvinceSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [wardSearch, setWardSearch] = useState("");

  // Fetch provinces from open API
  useEffect(() => {
    // Already have MAJOR_PROVINCES, no need to fetch
    setProvinces(MAJOR_PROVINCES);
  }, []);

  // Fetch districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      fetchDistricts(selectedProvince);
    } else {
      setDistricts([]);
      setSelectedDistrict("");
      setSelectedDistrictName("");
      setWards([]);
      setSelectedWard("");
      setSelectedWardName("");
    }
  }, [selectedProvince]);

  const fetchDistricts = async (provinceCode: string) => {
    try {
      const response = await fetch(
        `https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`
      );
      const data: Province = await response.json();
      setDistricts(data.districts || []);
      setSelectedDistrict("");
      setSelectedDistrictName("");
      setWards([]);
      setSelectedWard("");
      setSelectedWardName("");
    } catch (error) {
      console.error("Error fetching districts:", error);
    }
  };

  // Fetch wards when district changes
  useEffect(() => {
    if (selectedDistrict) {
      fetchWards(selectedDistrict);
    } else {
      setWards([]);
      setSelectedWard("");
      setSelectedWardName("");
    }
  }, [selectedDistrict]);

  const fetchWards = async (districtCode: string) => {
    try {
      const response = await fetch(
        `https://provinces.open-api.vn/api/d/${districtCode}?depth=2`
      );
      const data: District = await response.json();
      setWards(data.wards || []);
      setSelectedWard("");
      setSelectedWardName("");
    } catch (error) {
      console.error("Error fetching wards:", error);
    }
  };

  // Fetch clusters when filters change
  useEffect(() => {
    setOffset(0);
    setClusters([]);
    setHasMore(true);
    fetchClusters(0, true);
  }, [selectedProvince, selectedDistrict, selectedWard, searchText, selectedSport]);

  const fetchClusters = async (currentOffset: number = 0, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const result = await clusterService.searchClusters({
        offset: currentOffset,
        limit: LIMIT,
        search: searchText || undefined,
        sport_type_id:
          selectedSport === "all" ? undefined : SPORT_TYPE_ID_MAP[selectedSport],
      });

      // Apply filters
      let filteredClusters = result.clusters as Cluster[];
        
        // Filter by search text (name or address)
        if (searchText) {
          const searchLower = searchText.toLowerCase();
          filteredClusters = filteredClusters.filter(
            (cluster) =>
              cluster.name.toLowerCase().includes(searchLower) ||
              cluster.street.toLowerCase().includes(searchLower) ||
              cluster.district.toLowerCase().includes(searchLower) ||
              cluster.city.toLowerCase().includes(searchLower)
          );
        }

        // Filter by location
        if (selectedProvinceName) {
          filteredClusters = filteredClusters.filter((cluster) =>
            cluster.city.toLowerCase().includes(selectedProvinceName.toLowerCase())
          );
        }
        if (selectedDistrictName) {
          filteredClusters = filteredClusters.filter((cluster) =>
            cluster.district.toLowerCase().includes(selectedDistrictName.toLowerCase())
          );
        }
        if (selectedWardName) {
          filteredClusters = filteredClusters.filter((cluster) =>
            cluster.street.toLowerCase().includes(selectedWardName.toLowerCase())
          );
        }
        
      const nextClusters = isRefresh
        ? filteredClusters
        : [...clusters, ...filteredClusters];

      setClusters(nextClusters);

      const clusterIdsToLoad = nextClusters
        .map((cluster) => cluster.id)
        .filter((id) => !clusterImageMap[id]);

      if (clusterIdsToLoad.length > 0) {
        const imageEntries = await Promise.all(
          clusterIdsToLoad.map(async (clusterId) => {
            try {
              const imageUrl = await imageService.getFirstImageUrl("cluster", clusterId);
              return imageUrl ? [clusterId, imageUrl] as const : null;
            } catch {
              return null;
            }
          })
        );

        const nextImageMap = imageEntries.reduce<Record<number, string>>((acc, entry) => {
          if (entry) {
            const [id, url] = entry;
            acc[id] = url;
          }
          return acc;
        }, {});

        if (Object.keys(nextImageMap).length > 0) {
          setClusterImageMap((prev) => ({ ...prev, ...nextImageMap }));
        }
      }

      // Check if there are more items
      setHasMore(result.clusters.length === LIMIT);
      setOffset(currentOffset + LIMIT);
    } catch (error: unknown) {
      console.error("Lỗi khi lấy danh sách sân:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setError(`Không thể lấy danh sách sân: ${errorMsg}`);
    } finally {
      if (isRefresh) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchClusters(offset, false);
    }
  };

  const handleClearFilters = () => {
    setSelectedProvince("");
    setSelectedProvinceName("");
    setSelectedDistrict("");
    setSelectedDistrictName("");
    setSelectedWard("");
    setSelectedWardName("");
    setSearchText("");
    setSearchDraft("");
    setSelectedSport("all");
  };

  const hasActiveFilters =
    !!selectedProvince ||
    !!selectedDistrict ||
    !!selectedWard ||
    !!searchText ||
    selectedSport !== "all";

  const handleOpenSearch = () => {
    setSearchDraft(searchText);
    setShowSearchModal(true);
  };

  const handleApplySearch = () => {
    setSearchText(searchDraft.trim());
    setShowSearchModal(false);
  };

  const handleSelectProvince = (province: Province) => {
    setSelectedProvince(province.code.toString());
    setSelectedProvinceName(province.name);
    setShowProvinceModal(false);
    setProvinceSearch("");
  };

  const handleSelectDistrict = (district: District) => {
    setSelectedDistrict(district.code.toString());
    setSelectedDistrictName(district.name);
    setShowDistrictModal(false);
    setDistrictSearch("");
  };

  const handleSelectWard = (ward: Ward) => {
    setSelectedWard(ward.code.toString());
    setSelectedWardName(ward.name);
    setShowWardModal(false);
    setWardSearch("");
  };

  // Filter functions for modal search
  const getFilteredProvinces = () => {
    if (!provinceSearch) return provinces;
    return provinces.filter((p) =>
      p.name.toLowerCase().includes(provinceSearch.toLowerCase())
    );
  };

  const getFilteredDistricts = () => {
    if (!districtSearch) return districts;
    return districts.filter((d) =>
      d.name.toLowerCase().includes(districtSearch.toLowerCase())
    );
  };

  const getFilteredWards = () => {
    if (!wardSearch) return wards;
    return wards.filter((w) =>
      w.name.toLowerCase().includes(wardSearch.toLowerCase())
    );
  };

  const handleStartBooking = async (clusterId: number, clusterName: string) => {
    try {
      await bookingDraftService.resetDraft();
      await bookingDraftService.patchDraft({
        clusterId,
        clusterName,
      });

      // Backward-compatibility keys
      await AsyncStorage.setItem("clusterName", clusterName);
      await AsyncStorage.setItem("clusterId", clusterId.toString());
      console.log("[LOCATION] Start booking draft:", { clusterId, clusterName });
      
      // Chuyển đến màn hình chọn ngày
      router.push("/(tabs)/stadium/date-select");
    } catch (error) {
      console.error("Lỗi khi lưu cluster info:", error);
      alert("Đã xảy ra lỗi. Vui lòng thử lại.");
    }
  };

  const handleOpenClusterPreview = async (cluster: Cluster) => {
    setClusterPreviewVisible(true);
    setClusterPreviewLoading(true);
    setPreviewCluster(cluster);
    setPreviewImageIndex(0);

    try {
      const [clusterDetail, images] = await Promise.all([
        clusterService.getCluster(cluster.id).catch(() => cluster),
        imageService.getClusterImages(cluster.id).catch(() => []),
      ]);

      setPreviewCluster(clusterDetail as Cluster);

      const imageUrls = images.map((item) => item.url).filter(Boolean);
      const fallbackUrl = clusterImageMap[cluster.id];
      setPreviewImages(
        imageUrls.length > 0 ? imageUrls : fallbackUrl ? [fallbackUrl] : []
      );
    } finally {
      setClusterPreviewLoading(false);
    }
  };

  const getClusterPlayerVisual = (cluster: Cluster) => {
    if (cluster.sport_types && cluster.sport_types.length >= 2) {
      return {
        source: require("../../../assets/images/player_full.png"),
        scale: 1.04,
        translateY: 0,
        translateX: 0,
      };
    }

    const sportType = cluster.sport_types?.[0];
    const sportTypeId = sportType?.id;
    const sportTypeName = sportType?.name?.toLowerCase();

    if (sportTypeId === 1 || sportTypeName === "football") {
      return {
        source: require("../../../assets/images/player_football.png"),
        scale: 1.02,
        translateY: 2,
        translateX: 0,
      };
    }
    if (sportTypeId === 2 || sportTypeName === "badminton") {
      return {
        source: require("../../../assets/images/player_badminton.png"),
        scale: 0.95,
        translateY: 0,
        translateX: 0,
      };
    }
    if (sportTypeId === 3 || sportTypeName === "pickleball") {
      return {
        source: require("../../../assets/images/player_pickeball.png"),
        scale: 0.98,
        translateY: 1,
        translateX: -10,
      };
    }
    if (sportTypeId === 4 || sportTypeName === "tennis") {
      return {
        source: require("../../../assets/images/player_tennis.png"),
        scale: 0.96,
        translateY: 1,
        translateX: -10,
      };
    }
    if (sportTypeId === 5 || sportTypeName === "basketball") {
      return {
        source: require("../../../assets/images/player_basketball.png"),
        scale: 1,
        translateY: 0,
        translateX: 0,
      };
    }

    return {
      source: require("../../../assets/images/player_badminton.png"),
      scale: 0.95,
      translateY: 0,
      translateX: 0,
    };
  };

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ backgroundColor: "#ffffff" }} edges={['top']}>
      <HeaderUser title="Đặt sân" />

      <View
        style={{
          zIndex: 20,
          elevation: 20,
          backgroundColor: "#ffffff",
          paddingTop: 8,
          shadowColor: "#1e3a8a",
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          paddingBottom: 4,
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        }}
      >
      {/* Search + Filter */}
      <View className="px-4 mb-2 flex-row items-center">
        <TouchableOpacity
          className="flex-1 h-12 flex-row items-center bg-white rounded-lg px-3 border border-blue-500 mr-2"
          onPress={handleOpenSearch}
          activeOpacity={1}
        >
          <Ionicons name="search" size={20} color="#666" />
          <Text
            className={`ml-2 text-base ${searchText ? "text-gray-900" : "text-gray-400"}`}
            numberOfLines={1}
          >
            {searchText || "Tìm kiếm sân..."}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`h-12 w-12 rounded-lg items-center justify-center border ${
            showFilters ? "bg-blue-500 border-blue-500" : "bg-white border-blue-500"
          }`}
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={1}
        >
          <Ionicons
            name="filter"
            size={20}
            color={showFilters ? "white" : "#374151"}
          />
        </TouchableOpacity>
      </View>

      {/* Sport Filter Icons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        className="mb-2"
      >
        {SPORT_FILTERS.map((sport) => {
          const active = selectedSport === sport.key;
          return (
            <TouchableOpacity
              key={sport.key}
              className={`mr-2 px-3 h-10 rounded-lg border flex-row items-center ${
                active ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"
              }`}
              onPress={() => setSelectedSport(sport.key)}
              activeOpacity={1}
            >
              {sport.icon.includes("outline") ? (
                <Ionicons
                  name={sport.icon as any}
                  size={16}
                  color={active ? "white" : "#374151"}
                />
              ) : (
                <Text className="text-base">{sport.icon}</Text>
              )}
              <Text
                className={`ml-2 text-sm font-medium ${
                  active ? "text-white" : "text-gray-700"
                }`}
              >
                {sport.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {hasActiveFilters && (
        <View className="px-4 mb-2">
          <TouchableOpacity
            className="self-start flex-row items-center bg-gray-200 px-3 py-2 rounded-lg"
            onPress={handleClearFilters}
          >
            <Ionicons name="refresh" size={16} color="#666" />
            <Text className="text-gray-700 ml-2">Xóa lọc</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filters */}
      {showFilters && (
        <View className="px-4 mb-2 bg-white py-3 mx-4 rounded-lg border border-blue-200">
          <Text className="font-semibold text-base mb-2 text-blue-700">Lọc theo địa điểm</Text>
          
          {/* Province Selector */}
          <View className="mb-3">
            <Text className="text-sm text-gray-600 mb-1">Tỉnh/Thành phố</Text>
            <TouchableOpacity
              className="flex-row items-center justify-between bg-gray-50 border border-gray-300 rounded-lg px-4 py-3"
              onPress={() => setShowProvinceModal(true)}
            >
              <Text className={selectedProvinceName ? "text-gray-900" : "text-gray-400"}>
                {selectedProvinceName || "Chọn tỉnh/thành phố"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* District Selector */}
          {selectedProvince && (
            <View className="mb-3">
              <Text className="text-sm text-gray-600 mb-1">Quận/Huyện</Text>
              <TouchableOpacity
                className="flex-row items-center justify-between bg-gray-50 border border-gray-300 rounded-lg px-4 py-3"
                onPress={() => setShowDistrictModal(true)}
                disabled={districts.length === 0}
              >
                <Text className={selectedDistrictName ? "text-gray-900" : "text-gray-400"}>
                  {selectedDistrictName || "Chọn quận/huyện"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {/* Ward Selector */}
          {selectedDistrict && (
            <View className="mb-2">
              <Text className="text-sm text-gray-600 mb-1">Phường/Xã</Text>
              <TouchableOpacity
                className="flex-row items-center justify-between bg-gray-50 border border-gray-300 rounded-lg px-4 py-3"
                onPress={() => setShowWardModal(true)}
                disabled={wards.length === 0}
              >
                <Text className={selectedWardName ? "text-gray-900" : "text-gray-400"}>
                  {selectedWardName || "Chọn phường/xã"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      </View>

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-5">
          <View className="bg-white rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold">Tìm kiếm sân</Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View className="h-12 flex-row items-center bg-gray-100 rounded-lg px-3 border border-gray-300">
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                className="flex-1 ml-2 text-base"
                placeholder="Nhập tên sân, đường, quận..."
                value={searchDraft}
                onChangeText={setSearchDraft}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={handleApplySearch}
              />
              {searchDraft !== "" && (
                <TouchableOpacity onPress={() => setSearchDraft("")}>
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            <View className="flex-row mt-4">
              <TouchableOpacity
                className="flex-1 h-11 rounded-lg border border-gray-300 items-center justify-center mr-2"
                onPress={() => {
                  setSearchDraft("");
                  setSearchText("");
                  setShowSearchModal(false);
                }}
              >
                <Text className="text-gray-700 font-semibold">Xóa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 h-11 rounded-lg bg-blue-500 items-center justify-center"
                onPress={handleApplySearch}
                activeOpacity={1}
              >
                <Text className="text-white font-semibold">Tìm kiếm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Province Modal */}
      <Modal
        visible={showProvinceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProvinceModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold">Chọn Tỉnh/Thành phố</Text>
              <TouchableOpacity onPress={() => setShowProvinceModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View className="px-4 py-2">
              <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
                <Ionicons name="search" size={20} color="#666" />
                <TextInput
                  className="flex-1 ml-2 text-base"
                  placeholder="Tìm kiếm tỉnh/thành phố..."
                  value={provinceSearch}
                  onChangeText={setProvinceSearch}
                />
              </View>
            </View>

            <FlatList
              data={getFilteredProvinces()}
              keyExtractor={(item) => item.code.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="px-4 py-4 border-b border-gray-100"
                  onPress={() => handleSelectProvince(item)}
                >
                  <Text className="text-base">{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* District Modal */}
      <Modal
        visible={showDistrictModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDistrictModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold">Chọn Quận/Huyện</Text>
              <TouchableOpacity onPress={() => setShowDistrictModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View className="px-4 py-2">
              <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
                <Ionicons name="search" size={20} color="#666" />
                <TextInput
                  className="flex-1 ml-2 text-base"
                  placeholder="Tìm kiếm quận/huyện..."
                  value={districtSearch}
                  onChangeText={setDistrictSearch}
                />
              </View>
            </View>

            <FlatList
              data={getFilteredDistricts()}
              keyExtractor={(item) => item.code.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="px-4 py-4 border-b border-gray-100"
                  onPress={() => handleSelectDistrict(item)}
                >
                  <Text className="text-base">{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Ward Modal */}
      <Modal
        visible={showWardModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWardModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold">Chọn Phường/Xã</Text>
              <TouchableOpacity onPress={() => setShowWardModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View className="px-4 py-2">
              <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
                <Ionicons name="search" size={20} color="#666" />
                <TextInput
                  className="flex-1 ml-2 text-base"
                  placeholder="Tìm kiếm phường/xã..."
                  value={wardSearch}
                  onChangeText={setWardSearch}
                />
              </View>
            </View>

            <FlatList
              data={getFilteredWards()}
              keyExtractor={(item) => item.code.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="px-4 py-4 border-b border-gray-100"
                  onPress={() => handleSelectWard(item)}
                >
                  <Text className="text-base">{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {loading && <Text className="text-center text-lg mt-4">Đang tải...</Text>}

      {error && <Text className="text-center text-red-500 mt-4">{error}</Text>}

      {!loading && !error && clusters.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          style={{ zIndex: 0, elevation: 0, backgroundColor: "#ffffff" }}
          className="flex-col mt-4"
        >
          {clusters.map((cluster) => (
            (() => {
              const visual = getClusterPlayerVisual(cluster);
              const clusterImageUrl = clusterImageMap[cluster.id];

              return (
            <View
              key={cluster.id}
              className="flex-row w-full items-center px-3 py-4 border-b border-black bg-white"
            >
              <View className="items-center justify-center" style={{ width: 96, height: 96 }}>
                <Image
                  source={clusterImageUrl ? { uri: clusterImageUrl } : visual.source}
                  resizeMode={clusterImageUrl ? "cover" : "contain"}
                  className="w-full h-full"
                  style={{
                    borderRadius: clusterImageUrl ? 12 : 0,
                    transform: clusterImageUrl
                      ? []
                      : [
                          { scale: visual.scale * 1.08 },
                          { translateX: (visual.translateX ?? 0) - 8 },
                          { translateY: visual.translateY },
                        ],
                  }}
                />
              </View>
              <View className="flex-1 px-3 justify-center">
                <Text className="text-[#1f2937] text-sm" numberOfLines={2} ellipsizeMode="tail">
                  {cluster.street}, {cluster.district}, {cluster.city}
                </Text>
                <Text
                  className="text-[#060b28] font-bold text-2xl mt-1"
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {cluster.name}
                </Text>
                <Text className="text-gray-600 text-xs mt-1" numberOfLines={1}>
                  {cluster.open_time} - {cluster.close_time}
                </Text>
              </View>
              <TouchableOpacity
                className="bg-white rounded-2xl px-5 py-2 border-2 border-gray-500 self-center"
                onPress={() => handleOpenClusterPreview(cluster)}
              >
                <Text className="text-gray-500 font-semibold text-center text-lg">
                  Xem
                </Text>
              </TouchableOpacity>
            </View>
              );
            })()
          ))}
          
          {/* Load More Button */}
          {hasMore && (
            <TouchableOpacity
              className="bg-blue-500 py-3 rounded-lg my-4 items-center"
              onPress={handleLoadMore}
              disabled={loadingMore}
              activeOpacity={1}
            >
              {loadingMore ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">Tải thêm</Text>
              )}
            </TouchableOpacity>
          )}
          
          {!hasMore && clusters.length > 0 && (
            <Text className="text-center text-gray-500 my-4">
              Đã hiển thị tất cả sân
            </Text>
          )}
        </ScrollView>
      )}

      {!loading && !error && clusters.length === 0 && (
        <Text className="text-center text-lg mt-4">
          Không có sân nào phù hợp với bộ lọc.
        </Text>
      )}

      <Modal
        visible={clusterPreviewVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setClusterPreviewVisible(false)}
      >
        <View className="flex-1 bg-black/45 justify-end">
          <View className="bg-white rounded-t-3xl p-4 max-h-[88%]">
            {clusterPreviewLoading || !previewCluster ? (
              <View className="items-center py-10">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="text-blue-700 mt-3">Đang tải chi tiết cụm sân...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="rounded-2xl overflow-hidden bg-slate-100">
                  {previewImages.length > 0 ? (
                    <Image
                      source={{ uri: previewImages[previewImageIndex] }}
                      className="w-full h-52"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-52 items-center justify-center">
                      <Ionicons name="image-outline" size={52} color="#94a3b8" />
                      <Text className="text-slate-500 mt-2">Chưa có ảnh cụm sân</Text>
                    </View>
                  )}
                </View>

                {previewImages.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mt-3"
                    contentContainerStyle={{ paddingRight: 6 }}
                  >
                    {previewImages.map((url, index) => (
                      <TouchableOpacity
                        key={`${url}-${index}`}
                        onPress={() => setPreviewImageIndex(index)}
                        className={`mr-2 rounded-xl overflow-hidden border-2 ${
                          previewImageIndex === index
                            ? "border-blue-500"
                            : "border-transparent"
                        }`}
                      >
                        <Image
                          source={{ uri: url }}
                          style={{ width: 84, height: 64 }}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                <Text className="text-[#0f172a] font-extrabold text-3xl mt-4">
                  {previewCluster.name}
                </Text>
                <Text className="text-slate-600 mt-1 text-base">
                  {previewCluster.street}, {previewCluster.district}, {previewCluster.city}
                </Text>

                <View className="flex-row flex-wrap mt-3">
                  {(previewCluster.sport_types || []).map((sport) => (
                    <View
                      key={sport.id}
                      className="bg-blue-50 border border-blue-200 rounded-full px-3 py-1 mr-2 mb-2"
                    >
                      <Text className="text-blue-700 font-semibold">
                        {formatSportDisplay(sport.name, sport.id)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-2">
                  <Text className="text-slate-700 text-sm">
                    Giờ hoạt động: {previewCluster.open_time} - {previewCluster.close_time}
                  </Text>
                  <Text className="text-slate-700 text-sm mt-1">
                    Trạng thái: {previewCluster.status === "active" ? "Đang hoạt động" : "Tạm ngưng"}
                  </Text>
                </View>

                <Text className="text-slate-600 mt-3 leading-6">
                  Không gian thể thao năng động, phù hợp đặt sân nhanh cho đội bạn. Chọn ngày và sân ngay để giữ khung giờ đẹp.
                </Text>

                <View className="flex-row mt-5 mb-3">
                  <TouchableOpacity
                    className="flex-1 bg-blue-600 rounded-xl py-3 items-center mr-2"
                    onPress={async () => {
                      await handleStartBooking(previewCluster.id, previewCluster.name);
                      setClusterPreviewVisible(false);
                    }}
                  >
                    <Text className="text-white font-bold text-base">Đặt ngay</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 bg-white border border-slate-300 rounded-xl py-3 items-center ml-2"
                    onPress={() => setClusterPreviewVisible(false)}
                  >
                    <Text className="text-slate-700 font-semibold text-base">Đóng</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Location;
