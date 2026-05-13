import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fieldService } from "@/src/services/field.service";
import { resolveOwnerAddFieldBackTarget } from "@/src/utils/owner-stadium-navigation.util";
import { SPORT_TYPE_PICKER_OPTIONS } from "@/src/utils/sport-type.util";
import AppPopup from "@/component/AppPopup";

const SPORT_TYPE_OPTIONS = SPORT_TYPE_PICKER_OPTIONS;

export default function AddField() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clusterId?: string }>();
  const [fieldSize, setFieldSize] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerHour, setPricePerHour] = useState("100000");
  const [selectedSportTypeId, setSelectedSportTypeId] = useState(1);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolvedClusterId, setResolvedClusterId] = useState<number>(
    Number(params.clusterId ?? 0)
  );

  useEffect(() => {
    const resolveClusterId = async () => {
      if (Number.isFinite(Number(params.clusterId)) && Number(params.clusterId) > 0) {
        setResolvedClusterId(Number(params.clusterId));
        return;
      }

      const storedClusterId = await AsyncStorage.getItem("clusterId");
      const parsedClusterId = Number(storedClusterId);
      if (Number.isFinite(parsedClusterId) && parsedClusterId > 0) {
        setResolvedClusterId(parsedClusterId);
      }
    };

    resolveClusterId();
  }, [params.clusterId]);

  const parsePrice = (value: string) => {
    const parsed = Number(String(value).replace(/[^0-9]/g, ""));
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const handleSave = async () => {
    if (!Number.isFinite(resolvedClusterId) || resolvedClusterId <= 0) {
      Alert.alert("Lỗi", "Không xác định được cụm sân. Vui lòng quay lại và chọn cụm sân.");
      return;
    }

    if (!fieldSize.trim()) {
      Alert.alert("Lỗi", "Vui lòng điền tên sân!");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập mô tả sân!");
      return;
    }

    const parsedPrice = parsePrice(pricePerHour);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập giá sân hợp lệ!");
      return;
    }

    setLoading(true);
    try {
      const authToken = await AsyncStorage.getItem("authToken");
      if (!authToken) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại!");
        return;
      }
      await fieldService.createField({
        cluster_id: resolvedClusterId,
        sport_type_id: selectedSportTypeId,
        size: fieldSize.trim(),
        description: description.trim(),
        price_per_hour: parsedPrice,
      });

      await AsyncStorage.removeItem("fieldAvailableSlots");
      await AsyncStorage.removeItem("fieldBookedSlots");

      setSuccessModalVisible(true);
    } catch (error: any) {
      console.error("Lỗi khi thêm sân:", error);
      let errorMessage = "Đã có lỗi xảy ra. Vui lòng thử lại!";
      if (error.message.includes("Network request failed")) {
        errorMessage =
          "Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet.";
      }
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const closeSuccessModal = () => {
    setSuccessModalVisible(false);
    router.replace(resolveOwnerAddFieldBackTarget(resolvedClusterId) as never);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* <View className="w-full h-11 bg-black" /> */}

      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() => router.replace(resolveOwnerAddFieldBackTarget(resolvedClusterId) as never)}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>

        <Text className="flex-1 font-bold text-[26px] text-[#1E232C] text-center">
          Thêm sân
        </Text>

        <View className="w-10 h-10" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingTop: 32, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View className="mb-6">
          <Text className="text-black text-[15px] font-medium mb-2">
            Tên sân / size
          </Text>
          <TextInput
            className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-black text-[15px] font-medium"
            value={fieldSize}
            onChangeText={setFieldSize}
            placeholder="Ví dụ: Sân Pickleball"
            placeholderTextColor="#8391A1"
            style={{ fontFamily: "Urbanist" }}
          />
        </View>

        <View className="mb-6">
          <Text className="text-black text-[15px] font-medium mb-2">
            Môn thể thao
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {SPORT_TYPE_OPTIONS.map((option) => {
              const active = selectedSportTypeId === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  className={`px-3 py-2 rounded-full border ${
                    active ? "bg-[#114F99] border-[#114F99]" : "bg-white border-gray-300"
                  }`}
                  onPress={() => setSelectedSportTypeId(option.id)}
                >
                  <Text className={`text-sm font-semibold ${active ? "text-white" : "text-gray-700"}`}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-black text-[15px] font-medium mb-2">
            Mô tả
          </Text>
          <TextInput
            className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-black text-[15px] font-medium"
            value={description}
            onChangeText={setDescription}
            placeholder="Ví dụ: Sân Pickleball phục vụ mọi lứa tuổi"
            placeholderTextColor="#8391A1"
            multiline
            textAlignVertical="top"
            style={{ fontFamily: "Urbanist", minHeight: 96 }}
          />
        </View>

        <View className="mb-6">
          <Text className="text-black text-[15px] font-medium mb-2">
            Giá / giờ
          </Text>
          <TextInput
            className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-black text-[15px] font-medium"
            value={pricePerHour}
            onChangeText={setPricePerHour}
            placeholder="Ví dụ: 100000"
            placeholderTextColor="#8391A1"
            keyboardType="numeric"
            style={{ fontFamily: "Urbanist" }}
          />
        </View>

        <View className="mb-6">
          <Text className="text-black text-[13px] text-gray-500">
            Cụm sân hiện tại: #{resolvedClusterId}
          </Text>
        </View>

        <TouchableOpacity
          className="bg-[#0B8FAC] py-4 px-20 rounded-lg items-center mt-8 self-center"
          onPress={handleSave}
          disabled={loading}
        >
          <Text className="text-white text-xl font-semibold">Thêm</Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <AppPopup
        visible={successModalVisible}
        title="Thêm sân thành công"
        message="Sân mới đã được thêm vào cụm sân hiện tại."
        tone="success"
        onClose={closeSuccessModal}
        actions={[
          {
            label: "Quay về danh sách sân",
            variant: "primary",
            onPress: closeSuccessModal,
          },
        ]}
      />
    </SafeAreaView>
  );
}
