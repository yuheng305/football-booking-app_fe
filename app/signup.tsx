import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const Signup = () => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState(""); // Thêm state cho username
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Thêm state cho loading

  const handleSignup = async () => {
    // Kiểm tra các trường bắt buộc
    if (
      !name ||
      !username ||
      !phone ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ tất cả các trường!");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu và xác nhận mật khẩu không khớp!");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        "https://gopitch.onrender.com/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            username: username.trim(),
            phone: phone.trim(),
            email: email.trim(),
            password: password,
          }),
        }
      );

      const data = await response.json();

      console.log("Response status:", response.status);
      console.log("Response data:", data);

      if (response.ok) {
        Alert.alert("Thành công", "Đăng ký thành công! Vui lòng đăng nhập.");
        router.replace("/login"); // Điều hướng về màn hình đăng nhập
      } else {
        let errorMessage = "Đăng ký thất bại!";
        if (data.message) {
          errorMessage = data.message;
        }
        Alert.alert("Lỗi", errorMessage);
      }
    } catch (error) {
      Alert.alert(
        "Lỗi",
        "Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet!"
      );
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#1A2A44]">
      <View className="flex-1 justify-center px-6">
        {/* Tab Đăng nhập / Đăng ký */}
        <View className="flex-row justify-center mb-8">
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text className="text-white text-xl mr-8">Đăng nhập</Text>
          </TouchableOpacity>
          <Text className="text-white text-xl font-semibold border-b-2 border-blue-500 pb-2">
            Đăng ký
          </Text>
        </View>

        {/* Trường Name */}
        <View className="mb-6">
          <View className="flex-row items-center border-b border-gray-500 py-2">
            <Ionicons
              name="person-outline"
              size={24}
              color="#3b82f6"
              className="mr-3"
            />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor="gray"
              className="flex-1 text-white"
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Trường Username */}
        <View className="mb-6">
          <View className="flex-row items-center border-b border-gray-500 py-2">
            <Ionicons
              name="person-add-outline"
              size={24}
              color="#3b82f6"
              className="mr-3"
            />
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor="gray"
              className="flex-1 text-white"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Trường Phone Number */}
        <View className="mb-6">
          <View className="flex-row items-center border-b border-gray-500 py-2">
            <Ionicons
              name="call-outline"
              size={24}
              color="#3b82f6"
              className="mr-3"
            />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone Number"
              placeholderTextColor="gray"
              className="flex-1 text-white"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Trường Email Address */}
        <View className="mb-6">
          <View className="flex-row items-center border-b border-gray-500 py-2">
            <Ionicons
              name="mail-outline"
              size={24}
              color="#3b82f6"
              className="mr-3"
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email Address"
              placeholderTextColor="gray"
              className="flex-1 text-white"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Trường Password */}
        <View className="mb-6">
          <View className="flex-row items-center border-b border-gray-500 py-2">
            <Ionicons
              name="lock-closed-outline"
              size={24}
              color="#3b82f6"
              className="mr-3"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
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

        {/* Trường Confirm Password */}
        <View className="mb-6">
          <View className="flex-row items-center border-b border-gray-500 py-2">
            <Ionicons
              name="lock-closed-outline"
              size={24}
              color="#3b82f6"
              className="mr-3"
            />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
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

        {/* Nút Đăng ký */}
        <TouchableOpacity
          onPress={handleSignup}
          className="bg-blue-500 p-4 rounded-lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-center text-white font-semibold text-lg">
              Đăng ký
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Thêm hiệu ứng gradient ở dưới cùng (tùy chọn) */}
      <View className="absolute bottom-0 w-full h-1/4 bg-gradient-to-t from-[#3b82f6] to-transparent" />
    </SafeAreaView>
  );
};

export default Signup;
