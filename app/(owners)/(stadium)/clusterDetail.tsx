import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { clusterService } from "@/src/services/cluster.service";
import type { Cluster } from "@/src/types/cluster.types";

const TEMP_OWNER_CLUSTER_ID = 3;

export default function OwnerClusterDetail() {
  const router = useRouter();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatTime = (time: string) => {
    if (!time) return "--:--";
    return time.slice(0, 5);
  };

  const formatDate = (iso: string) => {
    if (!iso) return "Không có";
    return new Date(iso).toLocaleString("vi-VN");
  };

  const loadCluster = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const data = await clusterService.getCluster(TEMP_OWNER_CLUSTER_ID);
      setCluster(data);
    } catch (err: any) {
      setError(err?.message || "Không thể tải thông tin cụm sân");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCluster();
  }, [loadCluster]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCluster(true);
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

  return (
    <SafeAreaView className="flex-1 bg-[#F6F8FC]">
      <View className="flex-row items-center px-4 pt-4 pb-2 bg-white">
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>

        <Text className="flex-1 text-center text-[24px] font-bold text-[#1E232C] mr-10">
          Chi tiết cụm sân
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
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
                  <Text className="text-blue-700 font-medium">{sport.name}</Text>
                </View>
              ))
            ) : (
              <Text className="text-gray-500">Chưa có dữ liệu môn thể thao</Text>
            )}
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-100">
          <Text className="text-lg font-bold text-[#1E232C] mb-3">Thông tin duyệt cụm sân</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Trạng thái duyệt</Text>
            <Text className={`font-semibold ${cluster.is_accepted ? "text-green-700" : "text-amber-600"}`}>
              {cluster.is_accepted ? "Đã duyệt" : "Chưa duyệt"}
            </Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Owner ID</Text>
            <Text className="font-semibold text-gray-800">{cluster.owner_id}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Accepted by</Text>
            <Text className="font-semibold text-gray-800">{cluster.accepted_by ?? "--"}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Cập nhật lần cuối</Text>
            <Text className="font-semibold text-gray-800">{formatDate(cluster.updated_at)}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
