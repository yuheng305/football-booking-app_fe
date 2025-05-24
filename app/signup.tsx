import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const Signup = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = () => {
    if (password !== confirmPassword) {
      alert("Mật khẩu và xác nhận mật khẩu không khớp!");
      return;
    }
    // Logic đăng ký (gọi API hoặc xử lý dữ liệu)
    router.replace("/login"); // Sau khi đăng ký thành công, điều hướng về login
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
        >
          <Text className="text-center text-white font-semibold text-lg">
            Đăng ký
          </Text>
        </TouchableOpacity>
      </View>

      {/* Thêm hiệu ứng gradient ở dưới cùng (tùy chọn) */}
      <View className="absolute bottom-0 w-full h-1/4 bg-gradient-to-t from-[#3b82f6] to-transparent" />
    </SafeAreaView>
  );
};

export default Signup;
