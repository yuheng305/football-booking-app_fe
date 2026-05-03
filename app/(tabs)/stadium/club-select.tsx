import React, { useState, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import HeaderUser from "@/component/HeaderUser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import clubService from "@/src/services/club.service";
import { Club } from "@/src/types/club.types";

const ClubSelect = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserClubs = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);

      console.log("[CLUB SELECT] Starting fetch...");

      // Load from cache first for faster UX
      if (!isRefreshing) {
        const cachedClubs = await AsyncStorage.getItem("userClubsCache");
        if (cachedClubs) {
          console.log("[CLUB SELECT] Loading from cache");
          setClubs(JSON.parse(cachedClubs));
          setLoading(false);
        }
      }

      // Get token and set it for API client
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        router.replace("/login");
        return;
      }

      // Get user_id from userData (user_id chính là player_id khi role="player")
      const userDataStr = await AsyncStorage.getItem("userData");
      if (!userDataStr) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng");
        router.replace("/login");
        return;
      }

      const userData = JSON.parse(userDataStr);
      const playerId = userData.user_id;
      
      if (!playerId) {
        Alert.alert("Lỗi", "Không tìm thấy user_id");
        router.replace("/login");
        return;
      }

      console.log("[CLUB SELECT] Fetching from API, player_id:", playerId);
      const response = await clubService.getPlayerClubs(playerId);

      console.log("[CLUB SELECT] API returned:", response.clubs?.length || 0, "clubs");
      const fetchedClubs = response.clubs || [];
      setClubs(fetchedClubs);
      
      // Cache the data
      await AsyncStorage.setItem("userClubsCache", JSON.stringify(fetchedClubs));
    } catch (error: any) {
      console.error("[CLUB SELECT] Error fetching clubs:", error);
      setError(error.message || "Không thể tải danh sách câu lạc bộ");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch on screen focus
  useFocusEffect(
    useCallback(() => {
      console.log("[CLUB SELECT] Screen focused");
      fetchUserClubs(false);
    }, [fetchUserClubs])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserClubs(true);
  }, [fetchUserClubs]);

  const handleSelectClub = async (club: Club) => {
    try {
      // Save selected club info to AsyncStorage
      await AsyncStorage.setItem("selectedClubId", club.id.toString());
      await AsyncStorage.setItem("selectedClubName", club.name);

      console.log("[CLUB SELECT] Selected club:", club);

      // Navigate to location screen để chọn địa điểm
      router.push("/(tabs)/stadium");
    } catch (error) {
      console.error("[CLUB SELECT] Error saving club:", error);
      Alert.alert("Lỗi", "Không thể lưu thông tin câu lạc bộ");
    }
  };

  const handleCreateNewClub = () => {
    router.push("/(tabs)/(users)/create-club");
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      <HeaderUser />

      <View className="flex-1 p-4">
        {/* Header Section */}
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={handleGoBack}
            className="mr-3 p-2 bg-white rounded-full"
          >
            <Ionicons name="arrow-back" size={24} color="#1e40af" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-800">
            Chọn câu lạc bộ
          </Text>
        </View>

        <Text className="text-gray-600 mb-4">
          Chọn câu lạc bộ để đặt sân cho đội bóng của bạn
        </Text>

        {/* Loading State */}
        {loading && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#1e40af" />
            <Text className="text-gray-600 mt-2">Đang tải...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View className="bg-red-100 p-4 rounded-lg mb-4">
            <Text className="text-red-700 text-center">{error}</Text>
            <TouchableOpacity
              onPress={() => fetchUserClubs(true)}
              className="mt-2 bg-red-500 py-2 px-4 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">
                Thử lại
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Clubs List */}
        {!loading && !error && (
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {clubs.length === 0 ? (
              <View className="flex-1 items-center justify-center py-12">
                <Ionicons name="football-outline" size={64} color="#9ca3af" />
                <Text className="text-gray-600 text-center mt-4 text-lg">
                  Bạn chưa có câu lạc bộ nào
                </Text>
                <Text className="text-gray-500 text-center mt-2 px-6">
                  Tạo câu lạc bộ mới hoặc tham gia một câu lạc bộ để bắt đầu
                  đặt sân
                </Text>
                <TouchableOpacity
                  onPress={handleCreateNewClub}
                  className="mt-6 bg-blue-500 py-3 px-6 rounded-lg flex-row items-center"
                >
                  <Ionicons name="add-circle-outline" size={24} color="white" />
                  <Text className="text-white font-semibold ml-2 text-base">
                    Tạo câu lạc bộ mới
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {clubs.map((club) => (
                  <TouchableOpacity
                    key={club.id}
                    onPress={() => handleSelectClub(club)}
                    className="bg-white p-4 rounded-lg mb-3 shadow-sm border border-gray-200"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-800 mb-1">
                          {club.name}
                        </Text>
                        <View className="flex-row items-center mb-1">
                          <Ionicons
                            name="location-outline"
                            size={16}
                            color="#6b7280"
                          />
                          <Text className="text-gray-600 ml-1" numberOfLines={1}>
                            {club.address}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Ionicons name="star" size={16} color="#f59e0b" />
                          <Text className="text-gray-600 ml-1">
                            Điểm: {club.score}
                          </Text>
                          <View
                            className={`ml-3 px-2 py-1 rounded ${
                              club.status === "active"
                                ? "bg-green-100"
                                : "bg-gray-100"
                            }`}
                          >
                            <Text
                              className={`text-xs ${
                                club.status === "active"
                                  ? "text-green-700"
                                  : "text-gray-700"
                              }`}
                            >
                              {club.status === "active"
                                ? "Hoạt động"
                                : "Không hoạt động"}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={24}
                        color="#1e40af"
                      />
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Create New Club Button */}
                <TouchableOpacity
                  onPress={handleCreateNewClub}
                  className="bg-blue-500 py-3 px-4 rounded-lg flex-row items-center justify-center mt-2"
                >
                  <Ionicons name="add-circle-outline" size={24} color="white" />
                  <Text className="text-white font-semibold ml-2 text-base">
                    Tạo câu lạc bộ mới
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default ClubSelect;
