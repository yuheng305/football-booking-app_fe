import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView, // Thêm ScrollView
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HeaderUser from "@/component/HeaderUser";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const User = () => {
  const [name, setName] = useState("Nguyễn Văn A");
  const [email, setEmail] = useState("huydt04@gmail.com");
  const [phone, setPhone] = useState("0123456789");
  const [username, setUsername] = useState("huydt04");

  const [imageUri, setImageUri] = useState(
    require("../../assets/images/user_placeholder.jpg")
  );

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

  const handleUpdate = () => {
    Alert.alert("Thông báo", "Cập nhật tài khoản thành công!");
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
            // Xóa token khỏi AsyncStorage
            await AsyncStorage.removeItem("authToken");
            // Điều hướng về màn hình đăng nhập
            router.replace("/login");
          },
        },
      ],
      { cancelable: true }
    );
  };

  const userData = {
    id: 1,
    name,
    email,
    phone,
    username,
    bookingHistory: [
      {
        id: 1,
        date: "2023-10-01",
        time: "08:00",
        stadium: "Cụm sân 1",
        address: "Tân Bình",
        mini_stadium: "Sân A",
        type: "Đặt nửa sân",
        services: [
          "Nước uống",
          "Găng tay thủ môn",
          "Áo bib",
          "Quay lại trận đấu",
        ],
        price: 200000,
        status: "Đã thanh toán",
      },
    ],
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <HeaderUser location="Tài khoản" time={name} />

      <ScrollView className="flex-1">
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
        <View className="mx-6 mt-4 space-y-4 mb-6">
          <View className="border border-black px-4 pt-2">
            <Text className="text-xl text-gray-600">Tên</Text>
            <TextInput
              className="text-2xl font-bold"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="border border-black px-4 pt-2">
            <Text className="text-xl text-gray-600">Tài khoản</Text>
            <TextInput
              className="text-2xl font-bold"
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <View className="border border-black px-4 pt-2 flex-row justify-between items-center">
            <View>
              <Text className="text-xl text-gray-600">Mật khẩu</Text>
              <Text className="text-2xl font-bold text-gray-800">********</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/change-password")}
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
            <Text className="text-xl text-gray-600">Email</Text>
            <TextInput
              className="text-2xl font-bold"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>

          {/* Nút cập nhật */}
          <TouchableOpacity
            className="bg-green-500 rounded-lg p-3 mt-4"
            onPress={handleUpdate}
          >
            <Text className="text-white text-center text-lg font-semibold">
              Cập nhật tài khoản
            </Text>
          </TouchableOpacity>

          {/* Nút lịch sử */}
          <TouchableOpacity
            className="border-2 border-red-500 rounded-xl p-3 mt-4"
            onPress={() =>
              router.push({
                pathname: "/history",
                params: {
                  userData: JSON.stringify(userData),
                },
              })
            }
          >
            <Text className="text-red-500 font-semibold text-xl text-center">
              Lịch sử đặt sân
            </Text>
          </TouchableOpacity>

          {/* Nút đăng xuất */}
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
    </SafeAreaView>
  );
};

export default User;
