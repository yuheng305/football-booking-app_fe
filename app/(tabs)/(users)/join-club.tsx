import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import HeaderClub from "@/component/HeaderClub";
import clubService from "@/src/services/club.service";
import authService from "@/src/services/auth.service";
import { Club } from "@/src/types/club.types";

const JoinClub = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await authService.getStoredUser();
      if (user?.user_id) {
        setUserId(user.user_id);
      } else {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại!");
        router.replace("/login");
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập tên câu lạc bộ để tìm kiếm!");
      return;
    }

    // Filter clubs by name (case-insensitive)
    const filtered = allClubs.filter((club) =>
      club.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredClubs(filtered);
  };

  const handleJoinClub = async (club: Club) => {
    if (!userId) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng!");
      return;
    }

    Alert.alert("Xác nhận", `Bạn có chắc muốn tham gia "${club.name}"?`, [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Tham gia",
        onPress: async () => {
          setIsLoading(true);
          try {
            await clubService.joinClub(club.id, userId);
            Alert.alert("Thành công", "Đã gửi yêu cầu tham gia câu lạc bộ!", [
              {
                text: "Đồng ý",
                onPress: () => router.back(),
              },
            ]);
          } catch (error: any) {
            console.error("Join club error:", error);
            Alert.alert(
              "Lỗi",
              error.response?.data?.message ||
                "Không thể tham gia câu lạc bộ. Vui lòng thử lại!"
            );
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-white">
      <HeaderClub title="Tham gia câu lạc bộ" />

      <ScrollView className="flex-1 px-6 py-6">
        {/* Search Bar */}
        <View className="mb-6">
          <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <Ionicons name="search" size={20} color="#6b7280" />
            <TextInput
              className="flex-1 ml-3 text-base text-gray-900"
              placeholder="Tìm kiếm câu lạc bộ..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            onPress={handleSearch}
            className="bg-blue-600 py-3 rounded-xl mt-3"
          >
            <Text className="text-white font-semibold text-center">
              Tìm kiếm
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View className="bg-yellow-50 rounded-xl p-4 mb-6">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#f59e0b" />
            <View className="flex-1 ml-3">
              <Text className="text-yellow-900 font-medium mb-1">
                Tính năng đang phát triển
              </Text>
              <Text className="text-yellow-700 text-sm">
                Hiện tại bạn cần biết chính xác tên câu lạc bộ để tham gia. Chức
                năng tìm kiếm nâng cao sẽ được cập nhật sớm.
              </Text>
            </View>
          </View>
        </View>

        {/* Search Results */}
        {filteredClubs.length > 0 && (
          <View>
            <Text className="text-gray-700 font-semibold mb-3">
              Kết quả tìm kiếm ({filteredClubs.length})
            </Text>
            <View>
              {filteredClubs.map((club) => (
                <View
                  key={club.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-3"
                >
                  <View className="flex-row items-start">
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
                      <View className="flex-row items-center mt-2">
                        <Ionicons name="star" size={16} color="#fbbf24" />
                        <Text className="text-sm text-gray-600 ml-1">
                          {club.score} điểm
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleJoinClub(club)}
                    disabled={isLoading || club.status !== "active"}
                    className={`mt-3 py-3 rounded-xl ${
                      club.status !== "active" ? "bg-gray-300" : "bg-blue-600"
                    }`}
                  >
                    <Text className="text-white font-semibold text-center">
                      {club.status !== "active"
                        ? "Không hoạt động"
                        : "Tham gia"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* No Results */}
        {searchQuery && filteredClubs.length === 0 && (
          <View className="items-center py-12">
            <Ionicons name="search-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 text-base mt-4">
              Không tìm thấy câu lạc bộ
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center">
              Thử tìm kiếm với từ khóa khác hoặc tạo câu lạc bộ mới
            </Text>
          </View>
        )}

        {/* Empty State */}
        {!searchQuery && (
          <View className="items-center py-12">
            <Ionicons name="people-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 text-base mt-4">
              Tìm kiếm câu lạc bộ
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center px-6">
              Nhập tên câu lạc bộ để tìm kiếm và tham gia
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default JoinClub;
