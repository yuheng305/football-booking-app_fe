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

  // Lấy dữ liệu người dùng từ AsyncStorage khi component được mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem("userData");
        console.log("Dữ liệu từ AsyncStorage:", userDataString); // Debug
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          console.log("Dữ liệu sau khi parse:", userData); // Debug
          setOwnerId(userData._id || "");
          setName(userData.fullName || "");
          setEmail(userData.email || "");
          setPhone(userData.phone || "");
          setUsername(userData.username || "");
          setClustername(userData.clusterName || "");
          setAddress(userData.address || "");
        } else {
          console.log("Không tìm thấy userData");
          Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng!");
          router.replace("/login");
        }
      } catch (error) {
        console.error("Lỗi lấy dữ liệu:", error);
        Alert.alert("Lỗi", "Không thể tải thông tin người dùng!");
      } finally {
        console.log("Hoàn tất lấy dữ liệu"); // Debug
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
      const response = await fetch(
        `https://gopitch.onrender.com/owners/${ownerId}`, // Sửa template literal
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(userData),
        }
      );

      const data = await response.json();
      console.log("API response:", data); // Debug
      if (response.ok) {
        const updatedUserData = {
          ...data,
          _id: ownerId,
          imageUri: imageUri?.uri || null, // Giữ imageUri cục bộ
        };
        await AsyncStorage.setItem("userData", JSON.stringify(updatedUserData));
        console.log("Dữ liệu đã lưu lại:", updatedUserData); // Debug
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
    <SafeAreaView className="flex-1 bg-white">
      <HeaderUser location="Tài khoản" time={name} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
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
          <TouchableOpacity
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
          </TouchableOpacity>

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
