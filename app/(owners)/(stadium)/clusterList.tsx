import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clusterService } from "@/src/services/cluster.service";
import type { Cluster } from "@/src/types/cluster.types";

const formatTime = (value?: string) => {
  if (!value) return "--:--";
  return value.slice(0, 5);
};

const resolveUserId = (rawData: string | null, rawProfile: string | null) => {
  try {
    const userData = rawData ? JSON.parse(rawData) : null;
    const userProfile = rawProfile ? JSON.parse(rawProfile) : null;

    const candidate =
      userData?.id ??
      userData?._id ??
      userData?.user_id ??
      userProfile?.id ??
      userProfile?._id ??
      userProfile?.user_id;

    const numericId = Number(candidate);
    return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
  } catch {
    return null;
  }
};

export default function OwnerClusterListScreen() {
  const router = useRouter();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ownerId, setOwnerId] = useState<number | null>(null);

  const loadClusters = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      const [rawUserData, rawUserProfile] = await Promise.all([
        AsyncStorage.getItem("userData"),
        AsyncStorage.getItem("userProfile"),
      ]);

      const resolvedOwnerId = resolveUserId(rawUserData, rawUserProfile);
      setOwnerId(resolvedOwnerId);

      const response = await clusterService.getClusters({ offset: 0, limit: 100 });
      const allClusters = response?.clusters || [];

      if (!resolvedOwnerId) {
        setClusters([]);
        return;
      }

      setClusters(allClusters.filter((item) => item.owner_id === resolvedOwnerId));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadClusters();
  }, [loadClusters]);

  const subtitle = useMemo(() => {
    if (!ownerId) return "Không tìm thấy mã chủ sân";
    return `Chủ sân #${ownerId} • ${clusters.length} cụm sân`;
  }, [clusters.length, ownerId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#114F99" />
        <Text className="mt-3 text-gray-700">Đang tải danh sách cụm sân...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F6F8FC]">
      <View className="flex-row items-center px-4 pt-4 pb-2 bg-white">
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>

        <View className="flex-1 ml-3">
          <Text className="text-[22px] font-bold text-[#1E232C]">Danh sách cụm sân</Text>
          <Text className="text-gray-500 text-xs mt-1">{subtitle}</Text>
        </View>

        <TouchableOpacity
          className="bg-[#114F99] py-2 px-3 rounded-lg items-center flex-row"
          onPress={() => router.push("/(owners)/(stadium)/createCluster")}
        >
          <Ionicons name="business-outline" size={14} color="#FFFFFF" />
          <Text className="text-white text-xs font-semibold ml-1">Tạo cụm</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadClusters(true);
            }}
          />
        }
      >
        {clusters.length === 0 ? (
          <View className="bg-white rounded-2xl p-4 border border-gray-100">
            <Text className="text-gray-700 font-semibold">Chưa có cụm sân nào</Text>
            <Text className="text-gray-500 text-sm mt-1">
              Hệ thống chưa ghi nhận cụm sân thuộc owner hiện tại.
            </Text>
          </View>
        ) : (
          clusters.map((cluster) => (
            <TouchableOpacity
              key={cluster.id}
              className="bg-white rounded-2xl p-4 border border-gray-100 mb-3"
              activeOpacity={0.9}
              onPress={() =>
                router.push({
                  pathname: "/(owners)/(stadium)/clusterDetail",
                  params: { id: String(cluster.id) },
                })
              }
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-[#1E232C] font-bold text-base">{cluster.name}</Text>
                  <Text className="text-gray-500 text-xs mt-1">Mã cụm sân: #{cluster.id}</Text>
                </View>
                <View
                  className={`px-2 py-1 rounded-full ${
                    cluster.status === "active" ? "bg-emerald-100" : "bg-gray-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      cluster.status === "active" ? "text-emerald-700" : "text-gray-700"
                    }`}
                  >
                    {cluster.status === "active" ? "Đang hoạt động" : "Không hoạt động"}
                  </Text>
                </View>
              </View>

              <View
                className={`mt-3 self-start px-3 py-1 rounded-full border ${
                  cluster.is_accepted ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    cluster.is_accepted ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {cluster.is_accepted ? "Admin đã phê duyệt" : "Chờ admin phê duyệt"}
                </Text>
              </View>

              <Text className="text-gray-700 text-sm mt-2">
                {cluster.street}, {cluster.district}, {cluster.city}
              </Text>

              <Text className="text-gray-600 text-xs mt-2">
                Giờ hoạt động: {formatTime(cluster.open_time)} - {formatTime(cluster.close_time)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
