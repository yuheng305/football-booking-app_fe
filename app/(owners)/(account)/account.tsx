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
import { legacyApiService } from "@/src/services/legacy-api.service";

const Owner = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [clustername, setClustername] = useState("");
  const [address, setAddress] = useState("");
  const [imageUri, setImageUri] = useState(
    require("../../../assets/images/user_placeholder.jpg")
  );
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState("");

  // Lấy dữ liệu người dùng từ API khi component được mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Gọi API để lấy thông tin user mới nhất
        const userProfile = await authService.getMe();
        console.log("Dữ liệu từ API getMe:", userProfile);
        
        // Cập nhật state với dữ liệu từ API
        setOwnerId(userProfile.id.toString());
        setName(`${userProfile.first_name} ${userProfile.last_name}`.trim());
        setEmail(userProfile.email || "");
        setPhone(userProfile.phone_number || "");
        setUsername(userProfile.email?.split("@")[0] || "");
        
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
            setName(userData.fullName || "");
            setEmail(userData.email || "");
            setPhone(userData.phone || "");
            setUsername(userData.username || "");
            setClustername(userData.clusterName || "");
            setAddress(userData.address || "");
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
      setImageUri({ uri: result.assets[0].uri });
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
        fullName: name,
        username,
        phone,
        email,
        clusterName: clustername, // Đổi thành clusterName để khớp với API
        address,
      };

      console.log("Dữ liệu gửi API:", userData); // Debug
      const data = await legacyApiService.updateOwnerProfile(
        ownerId,
        userData,
        token
      );
      console.log("API response:", data); // Debug

      const updatedUserData = {
        ...data,
        _id: ownerId,
        imageUri: imageUri?.uri || null,
      };
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUserData));
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
            await AsyncStorage.removeItem("userRole");
            router.replace("/login");
          },
        },
      ],
      { cancelable: true }
    );
  };

  console.log("Render với state:", {
    name,
    email,
    phone,
    username,
    clustername,
    address,
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
      <HeaderOwner title="Tài khoản" subtitle={name} />
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
              value={name}
              onChangeText={setName}
              placeholder="Nhập tên"
            />
          </View>

          <View className="border border-black px-4 pt-2">
            <Text className="text-xl text-gray-600">Tài khoản</Text>
            <TextInput
              className="text-2xl font-bold"
              value={username}
              onChangeText={setUsername}
              placeholder="Nhập tài khoản"
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
            <Text className="text-xl text-gray-600">Email</Text>
            <TextInput
              className="text-2xl font-bold"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholder="Nhập email"
            />
          </View>

          <View className="border border-black px-4 pt-2">
            <Text className="text-xl text-gray-600">Cụm sân</Text>
            <TextInput
              className="text-2xl font-bold"
              value={clustername}
              onChangeText={setClustername}
              keyboardType="default"
              placeholder="Nhập tên cụm sân"
            />
          </View>

          <View className="border border-black px-4 pt-2">
            <Text className="text-xl text-gray-600">Địa chỉ</Text>
            <TextInput
              className="text-2xl font-bold"
              value={address}
              onChangeText={setAddress}
              keyboardType="default"
              placeholder="Nhập địa chỉ"
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
