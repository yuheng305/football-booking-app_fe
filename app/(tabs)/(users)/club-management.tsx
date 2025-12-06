import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import clubService from "@/src/services/club.service";
import authService from "@/src/services/auth.service";
import { Club } from "@/src/types/club.types";

const ClubManagement = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    loadUserAndClubs();
  }, []);

  const loadUserAndClubs = async () => {
    try {
      const user = await authService.getStoredUser();
      if (user?.user_id) {
        setUserId(user.user_id);
        await loadClubs(user.user_id);
      } else {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại!");
        router.replace("/login");
      }
    } catch (error) {
      console.error("Error loading user:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin người dùng!");
    } finally {
      setIsLoading(false);
    }
  };

  const loadClubs = async (playerId: number) => {
    try {
      const { clubs: clubList } = await clubService.getPlayerClubs(playerId);
      setClubs(clubList);
    } catch (error) {
      console.error("Error loading clubs:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách câu lạc bộ!");
    }
  };

  const handleRefresh = async () => {
    if (!userId) return;
    setIsRefreshing(true);
    await loadClubs(userId);
    setIsRefreshing(false);
  };

  const handleCreateClub = () => {
    router.push("/(tabs)/(users)/create-club");
  };

  const handleJoinClub = () => {
    router.push("/(tabs)/(users)/join-club");
  };

  const handleClubDetails = (club: Club) => {
    router.push({
      pathname: "/(tabs)/(users)/club-details",
      params: { clubId: club.id },
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-gray-600">Đang tải...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView edges={["top"]} className="bg-blue-600">
        <View className="px-6 py-4">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={28} color="white" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-white text-2xl font-bold">Câu lạc bộ</Text>
              <Text className="text-blue-100 text-sm mt-1">
                {clubs.length} câu lạc bộ
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Empty State */}
        {clubs.length === 0 && (
          <View className="items-center justify-center py-20">
            <Ionicons name="people-outline" size={80} color="#9ca3af" />
            <Text className="text-gray-500 text-lg mt-4">
              Chưa tham gia câu lạc bộ nào
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center px-6">
              Tạo hoặc tham gia câu lạc bộ để đặt sân cùng đội bóng
            </Text>
          </View>
        )}

        {/* Club List */}
        <View className="px-4 py-4">
          {clubs.map((club) => (
            <TouchableOpacity
              key={club.id}
              onPress={() => handleClubDetails(club)}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="shield" size={24} color="#3b82f6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-gray-900">
                        {club.name}
                      </Text>
                      <Text className="text-sm text-gray-500 mt-1">
                        {club.address}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center mt-3">
                    <View className="flex-row items-center mr-4">
                      <Ionicons name="star" size={16} color="#fbbf24" />
                      <Text className="text-sm text-gray-600 ml-1">
                        {club.score} điểm
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons
                        name={
                          club.status === "active"
                            ? "checkmark-circle"
                            : "close-circle"
                        }
                        size={16}
                        color={club.status === "active" ? "#10b981" : "#ef4444"}
                      />
                      <Text className="text-sm text-gray-600 ml-1">
                        {club.status === "active"
                          ? "Hoạt động"
                          : "Không hoạt động"}
                      </Text>
                    </View>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="bg-white px-4 py-3 border-t border-gray-200">
        <View className="flex-row">
          <TouchableOpacity
            onPress={handleCreateClub}
            className="flex-1 bg-blue-600 py-4 rounded-xl flex-row items-center justify-center mr-3"
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text className="text-white font-semibold text-base ml-2">
              Tạo CLB
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleJoinClub}
            className="flex-1 bg-white py-4 rounded-xl flex-row items-center justify-center border-2 border-blue-600"
          >
            <Ionicons name="person-add-outline" size={20} color="#3b82f6" />
            <Text className="text-blue-600 font-semibold text-base ml-2">
              Tham gia
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ClubManagement;
