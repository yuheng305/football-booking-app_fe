import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import HeaderUser from "../../component/HeaderUser";
import { Ionicons } from "@expo/vector-icons";

interface Tournament {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  maxTeams: number;
  currentTeams: number;
  status: "upcoming" | "ongoing" | "completed";
  prize: string;
}

export default function Tournament() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "all" | "upcoming" | "ongoing" | "completed"
  >("all");

  useEffect(() => {
    // TODO: Fetch tournaments from API
    // For now, using mock data
    setTimeout(() => {
      setTournaments([
        {
          id: "1",
          name: "Giải bóng đá mùa hè 2024",
          description: "Giải đấu dành cho các câu lạc bộ nghiệp dư",
          startDate: "2024-06-01",
          endDate: "2024-06-30",
          location: "Sân Thống Nhất",
          maxTeams: 16,
          currentTeams: 12,
          status: "upcoming",
          prize: "20.000.000 VNĐ",
        },
        {
          id: "2",
          name: "Giải bóng đá học sinh - sinh viên",
          description: "Giải đấu dành cho học sinh, sinh viên các trường",
          startDate: "2024-05-15",
          endDate: "2024-05-25",
          location: "Sân vận động quận 7",
          maxTeams: 8,
          currentTeams: 8,
          status: "ongoing",
          prize: "10.000.000 VNĐ",
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredTournaments = tournaments.filter(
    (t) => activeTab === "all" || t.status === activeTab
  );

  const getStatusColor = (status: Tournament["status"]) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-500";
      case "ongoing":
        return "bg-green-500";
      case "completed":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: Tournament["status"]) => {
    switch (status) {
      case "upcoming":
        return "Sắp diễn ra";
      case "ongoing":
        return "Đang diễn ra";
      case "completed":
        return "Đã kết thúc";
      default:
        return "";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <HeaderUser />

      <View className="flex-1">
        {/* Tabs */}
        <View className="flex-row border-b border-gray-200 px-4">
          {[
            { key: "all", label: "Tất cả" },
            { key: "upcoming", label: "Sắp diễn ra" },
            { key: "ongoing", label: "Đang diễn ra" },
            { key: "completed", label: "Đã kết thúc" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              className={`mr-6 pb-3 ${
                activeTab === tab.key ? "border-b-2 border-blue-500" : ""
              }`}
            >
              <Text
                className={`text-base ${
                  activeTab === tab.key
                    ? "text-blue-500 font-semibold"
                    : "text-gray-600"
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tournament List */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <ScrollView className="flex-1 px-4 pt-4">
            {filteredTournaments.length === 0 ? (
              <View className="items-center justify-center py-20">
                <Ionicons name="trophy-outline" size={64} color="#d1d5db" />
                <Text className="text-gray-400 mt-4 text-base">
                  Chưa có giải đấu nào
                </Text>
              </View>
            ) : (
              filteredTournaments.map((tournament) => (
                <TouchableOpacity
                  key={tournament.id}
                  className="bg-white rounded-xl p-4 mb-4 border border-gray-200 shadow-sm"
                  onPress={() => {
                    // TODO: Navigate to tournament detail
                    console.log(
                      "Navigate to tournament detail:",
                      tournament.id
                    );
                  }}
                >
                  {/* Status Badge */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View
                      className={`${getStatusColor(
                        tournament.status
                      )} px-3 py-1 rounded-full`}
                    >
                      <Text className="text-white text-xs font-semibold">
                        {getStatusText(tournament.status)}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="people" size={16} color="#6b7280" />
                      <Text className="text-gray-600 text-sm ml-1">
                        {tournament.currentTeams}/{tournament.maxTeams} đội
                      </Text>
                    </View>
                  </View>

                  {/* Tournament Info */}
                  <Text className="text-lg font-bold text-gray-800 mb-2">
                    {tournament.name}
                  </Text>
                  <Text className="text-gray-600 text-sm mb-3">
                    {tournament.description}
                  </Text>

                  <View className="space-y-2">
                    <View className="flex-row items-center">
                      <Ionicons name="calendar" size={16} color="#6b7280" />
                      <Text className="text-gray-600 text-sm ml-2">
                        {new Date(tournament.startDate).toLocaleDateString(
                          "vi-VN"
                        )}{" "}
                        -{" "}
                        {new Date(tournament.endDate).toLocaleDateString(
                          "vi-VN"
                        )}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="location" size={16} color="#6b7280" />
                      <Text className="text-gray-600 text-sm ml-2">
                        {tournament.location}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="trophy" size={16} color="#f59e0b" />
                      <Text className="text-gray-600 text-sm ml-2">
                        Giải thưởng: {tournament.prize}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
