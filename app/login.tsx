import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Login = () => {
  const [emailOrUsername, setEmailOrUsername] = useState(""); // Thay đổi tên state
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!emailOrUsername || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ email/username và mật khẩu!");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("https://gopitch.onrender.com/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailOrUsername.trim(), // Gửi cả email và username, để server xử lý
          username: emailOrUsername.trim(), // Thêm username vào body
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        const token = data.token;
        await AsyncStorage.setItem("authToken", token);
        // Kiểm tra loại tài khoản dựa trên username
        const isOwner =
          data.user &&
          data.user.username &&
          data.user.username.startsWith("owner");
        const destination = isOwner ? "/(owners)/home" : "/(tabs)/home";

        console.log("Navigating to:", destination);
        router.replace(destination);
      } else {
        // Xử lý lỗi chi tiết hơn dựa trên message từ API
        let errorMessage = "Email hoặc mật khẩu không đúng!";
        if (data.message) {
          if (data.message.includes("Tên người dùng không tồn tại")) {
            errorMessage = "Tên người dùng không tồn tại!";
          } else if (data.message.includes("Mật khẩu")) {
            errorMessage = "Mật khẩu không đúng!";
          } else {
            errorMessage = data.message;
          }
        }
        Alert.alert("Lỗi đăng nhập", errorMessage);
      }
    } catch (error) {
      //   if (error.message.includes("Network request failed")) {
      //     Alert.alert(
      //       "Lỗi",
      //       "Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet!"
      //     );
      //   } else {
      //     Alert.alert("Lỗi", "Đã có lỗi xảy ra. Vui lòng thử lại!");
      //   }
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#1A2A44]">
      <View className="flex-1 justify-center px-6">
        <View className="flex-row justify-center mb-8">
          <Text className="text-white text-xl font-semibold mr-8 border-b-2 border-blue-500 pb-2">
            Đăng nhập
          </Text>
          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text className="text-white text-xl">Đăng ký</Text>
          </TouchableOpacity>
        </View>
        <View className="mb-6">
          <View className="flex-row items-center border-b border-gray-500 py-2">
            <Ionicons
              name="person-outline"
              size={24}
              color="gray"
              className="mr-3"
            />
            {/* Thay biểu tượng mail bằng person */}
            <TextInput
              value={emailOrUsername}
              onChangeText={setEmailOrUsername}
              placeholder="Email hoặc Tài khoản"
              placeholderTextColor="gray"
              className="flex-1 text-white"
              keyboardType="default" // Thay email-address bằng default để hỗ trợ cả username
              autoCapitalize="none"
            />
          </View>
        </View>
        <View className="mb-6">
          <View className="flex-row items-center border-b border-gray-500 py-2">
            <Ionicons
              name="lock-closed-outline"
              size={24}
              color="gray"
              className="mr-3"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Mật khẩu"
              placeholderTextColor="gray"
              className="flex-1 text-white"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={24}
                color="gray"
              />
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center">
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ false: "gray", true: "#6366F1" }}
              thumbColor="white"
            />
            <Text className="text-gray-400 ml-2">Ghi nhớ mật khẩu</Text>
          </View>
          {/* <TouchableOpacity onPress={() => router.push("/forgot-password")}>
            <Text className="text-gray-400">Quên mật khẩu</Text>
          </TouchableOpacity> */}
        </View>
        <TouchableOpacity
          onPress={handleLogin}
          className="bg-blue-500 p-4 rounded-lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-center text-white font-semibold text-lg">
              Đăng nhập
            </Text>
          )}
        </TouchableOpacity>
        <View className="mt-8">
          <Text className="text-center text-gray-400 mb-4">
            hoặc đăng nhập với
          </Text>
          <View className="flex-row justify-center space-x-6">
            <TouchableOpacity>
              <View className="bg-blue-600 p-3 rounded-full">
                <Ionicons name="logo-facebook" size={24} color="white" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity>
              <View className="bg-gray-600 p-3 rounded-full">
                <Ionicons name="logo-instagram" size={24} color="white" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity>
              <View className="bg-red-500 p-3 rounded-full">
                <Ionicons name="logo-pinterest" size={24} color="white" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity>
              <View className="bg-blue-700 p-3 rounded-full">
                <Ionicons name="logo-linkedin" size={24} color="white" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Login;
