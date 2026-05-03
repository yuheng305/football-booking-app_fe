import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import HeaderClub from "@/component/HeaderClub";
import clubService from "@/src/services/club.service";
import authService from "@/src/services/auth.service";
import { ClubMember } from "@/src/types/club.types";

const ClubDetails = () => {
  const { clubId } = useLocalSearchParams();
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [clubName, setClubName] = useState("Chi tiết câu lạc bộ");
  const [clubAddress, setClubAddress] = useState("");
  const [clubScore, setClubScore] = useState(0);
  const [isCaptain, setIsCaptain] = useState(false);
  
  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUserAndMembers();
  }, []);

  const loadUserAndMembers = async () => {
    try {
      const user = await authService.getStoredUser();
      if (user?.user_id) {
        setUserId(user.user_id);
      }

      if (clubId) {
        await loadMembers(Number(clubId));
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin câu lạc bộ!");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async (id: number) => {
    try {
      const { members: memberList } = await clubService.getClubMembers(id);
      setMembers(memberList);

      // Get club info from first member if available
      if (memberList.length > 0 && memberList[0].club) {
        setClubName(memberList[0].club.name);
        setClubAddress(memberList[0].club.address);
        setClubScore(memberList[0].club.score);
      }
      
      // Check if current user is captain
      if (userId) {
        const currentMember = memberList.find((m) => m.player_id === userId);
        setIsCaptain(currentMember?.role === "captain");
      }
    } catch (error) {
      console.error("Error loading members:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách thành viên!");
    }
  };

  const handleRefresh = async () => {
    if (!clubId) return;
    setIsRefreshing(true);
    await loadMembers(Number(clubId));
    setIsRefreshing(false);
  };

  const handleLeaveClub = () => {
    if (!userId || !clubId) return;

    Alert.alert("Xác nhận", "Bạn có chắc muốn rời khỏi câu lạc bộ này?", [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Rời khỏi",
        style: "destructive",
        onPress: async () => {
          try {
            await clubService.leaveClub(Number(clubId), userId);
            Alert.alert("Thành công", "Đã rời khỏi câu lạc bộ!", [
              {
                text: "Đồng ý",
                onPress: () => router.back(),
              },
            ]);
          } catch (error: any) {
            console.error("Leave club error:", error);
            Alert.alert(
              "Lỗi",
              error.response?.data?.message ||
                "Không thể rời khỏi câu lạc bộ. Vui lòng thử lại!"
            );
          }
        },
      },
    ]);
  };

  const handleEditClub = () => {
    setEditName(clubName);
    setEditAddress(clubAddress);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên câu lạc bộ!");
      return;
    }

    if (!editAddress.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập địa chỉ!");
      return;
    }

    try {
      setIsSaving(true);
      await clubService.updateClub(Number(clubId), {
        name: editName,
        address: editAddress,
      });

      setClubName(editName);
      setClubAddress(editAddress);
      setShowEditModal(false);
      Alert.alert("Thành công", "Đã cập nhật thông tin câu lạc bộ!");
      
      // Refresh members to get updated club info
      if (clubId) {
        await loadMembers(Number(clubId));
      }
    } catch (error: any) {
      console.error("Update club error:", error);
      Alert.alert(
        "Lỗi",
        error.response?.data?.message ||
          "Không thể cập nhật câu lạc bộ. Vui lòng thử lại!"
      );
    } finally {
      setIsSaving(false);
    }
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
    <View className="flex-1 bg-white">
      <HeaderClub title={clubName} />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Club Info */}
        <View className="bg-blue-600 px-6 py-8">
          <View className="items-center">
            <View className="w-20 h-20 bg-white rounded-full items-center justify-center mb-4">
              <Ionicons name="shield" size={40} color="#3b82f6" />
            </View>
            <Text className="text-white text-2xl font-bold mb-2">
              {clubName}
            </Text>
            <Text className="text-blue-100 text-base mb-1">
              {clubAddress}
            </Text>
            <Text className="text-blue-100 text-base">
              {members.length} thành viên • {clubScore} điểm
            </Text>
          </View>
        </View>

        {/* Edit Button for Captain */}
        {isCaptain && (
          <View className="px-6 pt-4">
            <TouchableOpacity
              onPress={handleEditClub}
              className="bg-blue-600 py-3 rounded-xl flex-row items-center justify-center"
            >
              <Ionicons name="pencil" size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">
                Chỉnh sửa thông tin
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Members List */}
        <View className="px-6 py-6">
          <Text className="text-gray-900 text-lg font-bold mb-4">
            Danh sách thành viên
          </Text>

          {members.length === 0 ? (
            <View className="items-center py-12">
              <Ionicons name="people-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 text-base mt-4">
                Chưa có thành viên
              </Text>
            </View>
          ) : (
            <View>
              {members.map((member) => (
                <View
                  key={member.id}
                  className="bg-gray-50 rounded-xl p-4 flex-row items-center mb-3"
                >
                  <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="person" size={24} color="#3b82f6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold text-base">
                      {member.player?.first_name} {member.player?.last_name}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="mail-outline" size={14} color="#6b7280" />
                      <Text className="text-gray-600 text-sm ml-1">
                        {member.player?.email}
                      </Text>
                    </View>
                    {member.player?.phone && (
                      <View className="flex-row items-center mt-1">
                        <Ionicons
                          name="call-outline"
                          size={14}
                          color="#6b7280"
                        />
                        <Text className="text-gray-600 text-sm ml-1">
                          {member.player?.phone}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View
                    className={`px-3 py-1 rounded-full ${
                      member.role === "captain" ? "bg-amber-100" : "bg-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        member.role === "captain"
                          ? "text-amber-700"
                          : "text-gray-700"
                      }`}
                    >
                      {member.role === "captain" ? "Đội trưởng" : "Thành viên"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Leave Club Button */}
      <View className="bg-white px-6 py-3 border-t border-gray-200">
        <TouchableOpacity
          onPress={handleLeaveClub}
          className="bg-red-600 py-4 rounded-xl flex-row items-center justify-center"
        >
          <Ionicons name="exit-outline" size={20} color="white" />
          <Text className="text-white font-semibold text-base ml-2">
            Rời khỏi câu lạc bộ
          </Text>
        </TouchableOpacity>
      </View>

      {/* Edit Club Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl px-6 py-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Chỉnh sửa câu lạc bộ
              </Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                disabled={isSaving}
              >
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">
                Tên câu lạc bộ *
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base"
                placeholder="Nhập tên câu lạc bộ"
                value={editName}
                onChangeText={setEditName}
                editable={!isSaving}
              />
            </View>

            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">
                Địa chỉ *
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base"
                placeholder="Nhập địa chỉ"
                value={editAddress}
                onChangeText={setEditAddress}
                editable={!isSaving}
                multiline
                numberOfLines={2}
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={isSaving}
              className={`py-4 rounded-xl flex-row items-center justify-center ${
                isSaving ? "bg-blue-400" : "bg-blue-600"
              }`}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text className="text-white font-semibold text-base ml-2">
                    Lưu thay đổi
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ClubDetails;
