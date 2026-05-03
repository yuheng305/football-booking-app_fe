import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HeaderOwner from "@/component/HeaderOwner";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { authService } from "@/src/services/auth.service";
import { imageService } from "@/src/services/image.service";

const Owner = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [username, setUsername] = useState("");
  const [imageUri, setImageUri] = useState(
    require("../../../assets/images/user_placeholder.jpg")
  );
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState("");

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

  // Lấy dữ liệu người dùng từ API khi component được mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Gọi API để lấy thông tin user mới nhất
        const userProfile = await authService.getMe();
        console.log("Dữ liệu từ API getMe:", userProfile);
        
        // Cập nhật state với dữ liệu từ API
        setOwnerId(userProfile.id.toString());
        setFirstName(userProfile.first_name || "");
        setLastName(userProfile.last_name || "");
        setEmail(userProfile.email || "");
        setPhone(userProfile.phone_number || "");
        setAge(String(userProfile.age ?? ""));
        setUsername(userProfile.email?.split("@")[0] || "");

        try {
          const avatarUrl = await imageService.getAvatarUrl(userProfile.id);
          if (avatarUrl) {
            setImageUri({ uri: avatarUrl });
          }
        } catch (avatarError) {
          console.error("Lỗi lấy avatar owner:", avatarError);
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
            setOwnerId(userData._id || "");
              const parsedName = splitFullName(userData.fullName || "");
              setFirstName(parsedName.firstName);
              setLastName(parsedName.lastName);
            setEmail(userData.email || "");
            setPhone(userData.phone || "");
              setAge(String(userData.age ?? ""));
            setUsername(userData.username || "");
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
        console.error("Lỗi upload avatar owner:", error);
        Alert.alert("Lỗi", "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.");
      }
    }
  };

  const handleUpdate = async () => {
    if (!ownerId) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng!");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("authToken");
      console.log("Token:", token); // Debug
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại!");
        return;
      }

      const userData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
        age: Number(age),
      };

      console.log("Dữ liệu gửi API:", userData); // Debug
      const data = await authService.updateMe(userData);
      console.log("API response:", data); // Debug

      const updatedUserData = {
        ...data,
        fullName: `${data.first_name} ${data.last_name}`.trim(),
        email: data.email,
        phone: data.phone_number,
        username: data.email?.split("@")[0] || username,
        _id: ownerId,
        imageUri: imageUri?.uri || null,
      };
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUserData));
      await AsyncStorage.setItem("userProfile", JSON.stringify(data));
      console.log("Dữ liệu đã lưu lại:", updatedUserData); // Debug
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
            console.log("Đang đăng xuất..."); // Debug
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
  }); // Debug

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Text className="text-center text-lg mt-10">Đang tải...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <HeaderOwner title="Tài khoản" subtitle={`${firstName} ${lastName}`.trim()} />
      <ScrollView className="flex-1" bounces={false}>
        {/* Avatar người dùng */}
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

        {/* Khung thông tin */}
        <View className="mx-6 mt-4 space-y-4 mb-0">
          <View className="border border-black px-4 pt-2">
            <Text className="text-xl text-gray-600">Tên</Text>
            <TextInput
              className="text-2xl font-bold"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Nhập tên"
              editable={true}
            />
          </View>

          <View className="border border-black px-4 pt-2">
            <Text className="text-xl text-gray-600">Họ</Text>
            <TextInput
              className="text-2xl font-bold"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Nhập họ"
            />
          </View>

          <View className="border border-black px-4 pt-2 flex-row justify-between items-center">
            <View>
              <Text className="text-xl text-gray-600">Mật khẩu</Text>
              <Text className="text-2xl font-bold text-gray-800">********</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/changePassword")}
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
              placeholder="Nhập số điện thoại"
            />
          </View>

          <View className="border border-black px-4 pt-2">
            <Text className="text-xl text-gray-600">Tuổi</Text>
            <TextInput
              className="text-2xl font-bold"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              placeholder="Nhập tuổi"
            />
          </View>

          <View className="border border-black px-4 pt-2 bg-gray-100">
            <Text className="text-xl text-gray-600">Email</Text>
            <TextInput
              className="text-2xl font-bold text-gray-500"
              value={email}
              editable={false}
              keyboardType="email-address"
              placeholder="Nhập email"
            />
          </View>

          <View className="border border-black px-4 pt-2 bg-gray-100">
            <Text className="text-xl text-gray-600">Tài khoản</Text>
            <TextInput
              className="text-2xl font-bold text-gray-500"
              value={username}
              editable={false}
              placeholder="Không hỗ trợ chỉnh sửa"
            />
          </View>

          {/* Nút cập nhật */}
          <TouchableOpacity
            className="bg-green-500 rounded-lg p-3 mt-4"
            onPress={handleUpdate}
          >
            <Text className="text-white text-center text-xl font-semibold">
              Cập nhật tài khoản
            </Text>
          </TouchableOpacity>

          {/* Nút thống kê doanh thu */}
          {/* <TouchableOpacity
            className="bg-blue-400 rounded-xl p-3 mt-4"
            onPress={() => {
              console.log("Truyền userData:", {
                name,
                email,
                phone,
                username,
                clustername,
                address,
              }); // Debug
              router.push({
                pathname: "/history",
                params: {
                  userData: JSON.stringify({
                    name,
                    email,
                    phone,
                    username,
                    clustername,
                    address,
                  }),
                },
              });
            }}
          >
            <Text className="text-white font-semibold text-xl text-center">
              Thống kê doanh thu
            </Text>
          </TouchableOpacity> */}

          {/* Nút đăng xuất */}
          <TouchableOpacity
            className="bg-red-500 rounded-lg p-3 mt-4"
            onPress={handleLogout}
          >
            <Text className="text-white text-center text-xl font-semibold">
              Đăng xuất
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Owner;
