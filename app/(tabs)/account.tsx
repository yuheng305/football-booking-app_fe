import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HeaderUser from "@/component/HeaderUser";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const User = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [bookingHistory, setBookingHistory] = useState([]);
  const [imageUri, setImageUri] = useState(
    require("../../assets/images/user_placeholder.jpg")
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem("userData");
        console.log("Dữ liệu từ AsyncStorage:", userDataString);
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          console.log("Dữ liệu sau khi parse:", userData);
          setName(userData.fullName || "");
          setEmail(userData.email || "");
          setPhone(userData.phone || "");
          setUsername(userData.username || "");
          setUserId(userData._id || "");
          setBookingHistory(userData.bookingHistory || []);
        } else {
          console.log("Không tìm thấy userData");
          Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng!");
          router.replace("/login");
        }
      } catch (error) {
        console.error("Lỗi lấy dữ liệu:", error);
        Alert.alert("Lỗi", "Không thể tải thông tin người dùng!");
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
    try {
      const token = await AsyncStorage.getItem("authToken");
      console.log("Token:", token);
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại!");
        return;
      }

      console.log("Dữ liệu gửi API:", {
        fullName: name,
        email,
        phone,
        username,
      });
      const response = await fetch(
        `https://gopitch.onrender.com/users/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName: name,
            username,
            phone,
            email,
          }),
        }
      );

      const data = await response.json();
      console.log("API response:", data);
      if (response.ok) {
        const updatedUserData = {
          fullName: name,
          email,
          phone,
          username,
          bookingHistory,
        };
        await AsyncStorage.setItem("userData", JSON.stringify(updatedUserData));
        console.log("Dữ liệu đã lưu lại:", updatedUserData);
        Alert.alert("Thành công", "Cập nhật tài khoản thành công!");
      } else {
        Alert.alert("Lỗi", data.message || "Cập nhật tài khoản thất bại!");
      }
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
    <SafeAreaView className="flex-1 bg-white">
      <HeaderUser location="Tài khoản" time={name} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
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

          <TouchableOpacity
            className="bg-green-500 rounded-lg p-3 mt-4"
            onPress={handleUpdate}
          >
            <Text className="text-white text-center text-lg font-semibold">
              Cập nhật tài khoản
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="border-2 border-red-500 rounded-xl p-3 mt-4"
            onPress={() => {
              console.log("Truyền bookingHistory:", bookingHistory);
              router.push({
                pathname: "/history",
                params: {
                  bookingHistory: JSON.stringify(bookingHistory),
                },
              });
            }}
          >
            <Text className="text-red-500 font-semibold text-xl text-center">
              Lịch sử đặt sân
            </Text>
          </TouchableOpacity>

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
