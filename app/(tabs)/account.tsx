import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  Image,
  ImageSourcePropType,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HeaderUser from "@/component/HeaderUser";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { authService } from "@/src/services/auth.service";
import { imageService } from "@/src/services/image.service";

const User = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [bookingHistory, setBookingHistory] = useState([]);
  const [imageUri, setImageUri] = useState<ImageSourcePropType>(
    require("../../assets/images/user_placeholder.jpg")
  );
  const [qrImageUri, setQrImageUri] = useState<ImageSourcePropType>(
    require("../../assets/images/qr.png")
  );
  const [qrRemoteUrl, setQrRemoteUrl] = useState<string | null>(null);
  const [showQrManager, setShowQrManager] = useState(false);
  const [showQrInfo, setShowQrInfo] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");

  const splitFullName = (fullName: string) => {
    const trimmed = fullName.trim();
    if (!trimmed) {
      return { firstName: "", lastName: "" };
    }

    const parts = trimmed.split(/\s+/);
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" "),
    };
  };

  const isOrganizerRole = (rawRole?: string) => {
    const normalized = String(rawRole || "")
      .trim()
      .toLowerCase();

    return normalized === "organizer" || normalized === "owner";
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Gọi API để lấy thông tin user mới nhất
        const userProfile = await authService.getMe();
        console.log("Dữ liệu từ API getMe:", userProfile);
        
        // Cập nhật state với dữ liệu từ API
        setFirstName(userProfile.first_name || "");
        setLastName(userProfile.last_name || "");
        setEmail(userProfile.email || "");
        setPhone(userProfile.phone_number || "");
        setAge(String(userProfile.age ?? ""));
        setUsername(userProfile.email?.split("@")[0] || "");
        setUserId(userProfile.id.toString());
        setRole(String(userProfile.role || ""));

        try {
          const avatarUrl = await imageService.getAvatarUrl(userProfile.id);
          if (avatarUrl) {
            setImageUri({ uri: avatarUrl });
          }
        } catch (avatarError) {
          console.error("Lỗi lấy avatar:", avatarError);
        }

        try {
          const qrUrl = await imageService.getQrCodeUrl(userProfile.id);
          if (qrUrl) {
            setQrImageUri({ uri: qrUrl });
            setQrRemoteUrl(qrUrl);
          }
        } catch (qrError) {
          console.error("Lỗi lấy QR:", qrError);
        }
        
        // Lưu lại vào AsyncStorage để dùng offline
        const userDataToStore = {
          id: userProfile.id,
          email: userProfile.email,
          first_name: userProfile.first_name,
          last_name: userProfile.last_name,
          phone_number: userProfile.phone_number,
          role: userProfile.role,
          age: userProfile.age,
          status: userProfile.status,
          is_verified: userProfile.is_verified,
        };
        await AsyncStorage.setItem("userProfile", JSON.stringify(userDataToStore));
        
      } catch (error) {
        console.error("Lỗi lấy dữ liệu từ API:", error);
        // Fallback: Thử lấy từ AsyncStorage nếu API lỗi
        try {
          const userDataString = await AsyncStorage.getItem("userData");
          console.log("Fallback: Dữ liệu từ AsyncStorage:", userDataString);
          if (userDataString) {
            const userData = JSON.parse(userDataString);
            const parsedName = splitFullName(userData.fullName || "");
            setFirstName(parsedName.firstName);
            setLastName(parsedName.lastName);
            setEmail(userData.email || "");
            setPhone(userData.phone || "");
            setAge(String(userData.age ?? ""));
            setUsername(userData.username || "");
            setUserId(userData._id || "");
            setBookingHistory(userData.bookingHistory || []);
            setRole(String(userData.role || ""));

            const fallbackUserId = Number(userData._id || userData.id);
            if (Number.isFinite(fallbackUserId) && fallbackUserId > 0) {
              try {
                const avatarUrl = await imageService.getAvatarUrl(fallbackUserId);
                if (avatarUrl) {
                  setImageUri({ uri: avatarUrl });
                }
              } catch (avatarError) {
                console.error("Lỗi lấy avatar fallback:", avatarError);
              }
            }
          } else {
            Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng!");
            router.replace("/login");
          }
        } catch (storageError) {
          console.error("Lỗi lấy dữ liệu từ storage:", storageError);
          Alert.alert("Lỗi", "Không thể tải thông tin người dùng!");
        }
      } finally {
        console.log("Hoàn tất lấy dữ liệu");
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImageUri({ uri: asset.uri });

      try {
        const uploaded = await imageService.uploadImage(
          "avatar",
          asset.uri,
          asset.fileName || undefined,
          asset.mimeType || undefined,
          undefined,
          asset.fileSize || undefined
        );

        if (uploaded.url) {
          setImageUri({ uri: uploaded.url });
        }
      } catch (error) {
        console.error("Lỗi upload avatar:", error);
        Alert.alert("Lỗi", "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.");
      }
    }
  };

  const pickQrImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setQrImageUri({ uri: asset.uri });
      setUploadingQr(true);

      try {
        const uploaded = await imageService.uploadImage(
          "qr_code",
          asset.uri,
          asset.fileName || undefined,
          asset.mimeType || undefined,
          undefined,
          asset.fileSize || undefined
        );

        if (uploaded.url) {
          setQrImageUri({ uri: uploaded.url });
          setQrRemoteUrl(uploaded.url);
        }

        Alert.alert("Thành công", "Đã cập nhật QR nhận tiền");
      } catch (error) {
        console.error("Lỗi upload QR:", error);
        Alert.alert("Lỗi", "Không thể cập nhật QR. Vui lòng thử lại.");
      } finally {
        setUploadingQr(false);
      }
    }
  };

  const handleUpdate = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      console.log("Token:", token);
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại!");
        return;
      }

      console.log("Dữ liệu gửi API:", {
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        age,
      });
      const data = await authService.updateMe({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
        age: Number(age),
      });
      console.log("API response:", data);

      const updatedUserData = {
        ...data,
        fullName: `${firstName} ${lastName}`.trim(),
        email: data.email,
        phone: data.phone_number,
        username: data.email?.split("@")[0] || username,
        bookingHistory,
      };
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUserData));
      await AsyncStorage.setItem("userProfile", JSON.stringify(data));
      console.log("Dữ liệu đã lưu lại:", updatedUserData);
      Alert.alert("Thành công", "Cập nhật tài khoản thành công!");
    } catch (error) {
      console.error("Lỗi cập nhật:", error);
      Alert.alert("Lỗi", "Đã có lỗi xảy ra. Vui lòng thử lại!");
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Xác nhận đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất?",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: async () => {
            console.log("Đang đăng xuất...");
            await AsyncStorage.removeItem("authToken");
            await AsyncStorage.removeItem("userData");
            await AsyncStorage.removeItem("userProfile");
            await AsyncStorage.removeItem("userRole");
            router.replace("/login");
          },
        },
      ],
      { cancelable: true }
    );
  };

  console.log("Render với state:", {
    firstName,
    lastName,
    email,
    phone,
    username,
    age,
    bookingHistory,
  });

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Text className="text-center text-lg mt-10">Đang tải...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <HeaderUser title="Tài khoản" />
      <ScrollView className="flex-1" bounces={false}>
        <View className="items-center mt-6">
          <TouchableOpacity onPress={pickImage} className="relative">
            <View className="w-24 h-24 rounded-full overflow-hidden border-2 border-green-500">
              <Image
                source={imageUri}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <View className="absolute bottom-0 right-0 bg-white p-1 rounded-full border border-gray-400">
              <Ionicons name="camera" size={20} color="black" />
            </View>
          </TouchableOpacity>
        </View>

        <View className="mx-6 mt-4 mb-1 border border-blue-300 rounded-xl p-3 bg-blue-50 flex-row items-center justify-between">
          <TouchableOpacity
            className="flex-row items-center flex-1"
            onPress={() => setShowQrManager(true)}
          >
            <View className="w-10 h-10 rounded-full bg-white border border-blue-300 items-center justify-center mr-3">
              <Ionicons name="qr-code-outline" size={20} color="#1d4ed8" />
            </View>
            <View className="flex-1">
              <Text className="text-blue-900 font-semibold">QR nhận tiền</Text>
              <Text className="text-blue-700 text-xs mt-1">
                Nhấn để xem, tải lên hoặc cập nhật QR
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-8 h-8 rounded-full bg-white border border-blue-300 items-center justify-center ml-2"
            onPress={() => setShowQrInfo(true)}
          >
            <Ionicons name="information" size={16} color="#1d4ed8" />
          </TouchableOpacity>
        </View>

        <View className="mx-6 mt-4 space-y-4 mb-0">
          <View className="border border-black px-4 pt-2">
            <Text className="text-xl text-gray-600">Tên</Text>
            <TextInput
              className="text-2xl font-bold"
              value={firstName}
              onChangeText={setFirstName}
              editable={true}
            />
          </View>

          <View className="border border-black px-4 pt-2">
            <Text className="text-xl text-gray-600">Họ</Text>
            <TextInput
              className="text-2xl font-bold"
              value={lastName}
              onChangeText={setLastName}
              editable={true}
            />
          </View>

          <View className="border border-black px-4 pt-2 flex-row justify-between items-center">
            <View>
              <Text className="text-xl text-gray-600">Mật khẩu</Text>
              <Text className="text-2xl font-bold text-gray-800">********</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/(users)/change-password")}
              className="bg-blue-500 px-3 py-1 rounded"
            >
              <Text className="text-white font-semibold text-xl">Đổi</Text>
            </TouchableOpacity>
          </View>

          <View className="border border-black px-4 pt-2">
            <Text className="text-xl text-gray-600">Số điện thoại</Text>
            <TextInput
              className="text-2xl font-bold"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View className="border border-black px-4 pt-2">
            <Text className="text-xl text-gray-600">Tuổi</Text>
            <TextInput
              className="text-2xl font-bold"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
            />
          </View>

          <View className="border border-black px-4 pt-2 bg-gray-100">
            <Text className="text-xl text-gray-600">Email</Text>
            <TextInput
              className="text-2xl font-bold text-gray-500"
              value={email}
              editable={false}
              keyboardType="email-address"
            />
          </View>

          <View className="border border-black px-4 pt-2 bg-gray-100">
            <Text className="text-xl text-gray-600">Tài khoản</Text>
            <TextInput
              className="text-2xl font-bold text-gray-500"
              value={username}
              editable={false}
            />
          </View>

          <TouchableOpacity
            className="bg-green-500 rounded-lg p-3 mt-4"
            onPress={handleUpdate}
          >
            <Text className="text-white text-center text-lg font-semibold">
              Cập nhật tài khoản
            </Text>
          </TouchableOpacity>

          {!isOrganizerRole(role) && (
            <TouchableOpacity
              className="border-2 border-orange-500 rounded-xl p-3 mt-4 flex-row items-center justify-center"
              onPress={() => router.push("/(tabs)/(users)/history")}
            >
              <Ionicons name="time-outline" size={24} color="#f97316" />
              <Text className="text-orange-500 font-semibold text-xl text-center ml-2">
                Lịch sử đặt sân
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className="bg-red-500 rounded-lg p-3 mt-4"
            onPress={handleLogout}
          >
            <Text className="text-white text-center text-lg font-semibold">
              Đăng xuất
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showQrInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrInfo(false)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="w-full bg-white rounded-2xl p-4">
            <Text className="text-lg font-bold text-gray-900 mb-2">QR nhận tiền là gì?</Text>
            <Text className="text-gray-700 leading-6">
              Đây là mã QR để nhận chuyển khoản khi có sự cố phát sinh trong booking. Chủ sân chỉ nên dùng để hoàn tiền hoặc xử lý thanh toán bổ sung theo thỏa thuận.
            </Text>
            <TouchableOpacity
              className="mt-4 bg-blue-600 rounded-xl py-3 items-center"
              onPress={() => setShowQrInfo(false)}
            >
              <Text className="text-white font-semibold">Đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showQrManager}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQrManager(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-5">
            <Text className="text-xl font-bold text-gray-900">Quản lý QR nhận tiền</Text>
            <Text className="text-sm text-gray-600 mt-1">
              Giữ mã QR luôn chính xác để xử lý sự cố nhanh hơn.
            </Text>

            <View className="items-center mt-4">
              <View className="w-56 h-56 rounded-2xl overflow-hidden border-2 border-blue-300 bg-white items-center justify-center">
                <Image source={qrImageUri} className="w-full h-full" resizeMode="cover" />
              </View>
            </View>

            {uploadingQr && (
              <View className="items-center mt-3">
                <ActivityIndicator size="small" color="#2563eb" />
                <Text className="text-blue-700 mt-1">Đang tải QR lên...</Text>
              </View>
            )}

            <View className="flex-row mt-5">
              <TouchableOpacity
                className="flex-1 bg-blue-600 rounded-xl py-3 items-center mr-2"
                onPress={pickQrImage}
                disabled={uploadingQr}
              >
                <Text className="text-white font-semibold">
                  {qrRemoteUrl ? "Cập nhật QR" : "Tải lên QR"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 rounded-xl py-3 items-center ml-2 ${
                  qrRemoteUrl ? "bg-white border border-blue-600" : "bg-gray-200"
                }`}
                onPress={() => {
                  if (qrRemoteUrl) {
                    Linking.openURL(qrRemoteUrl);
                  }
                }}
                disabled={!qrRemoteUrl}
              >
                <Text className={`${qrRemoteUrl ? "text-blue-700" : "text-gray-500"} font-semibold`}>
                  Mở/Tải QR
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="mt-3 border border-gray-300 rounded-xl py-3 items-center"
              onPress={() => setShowQrManager(false)}
            >
              <Text className="text-gray-700 font-semibold">Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default User;
