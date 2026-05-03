import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import authService from "../src/services/auth.service";
import { UserRole } from "../src/types/auth.types";

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "player", label: "Người chơi" },
  { value: "owner", label: "Chủ sân" },
  { value: "organizer", label: "Ban tổ chức" },
];

const Signup = () => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [age, setAge] = useState("");
  const [role, setRole] = useState<UserRole>("player");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const selectedRoleLabel =
    ROLE_OPTIONS.find((option) => option.value === role)?.label || "Người chơi";

  const handleSignup = async () => {
    // Validate required fields
    if (
      !email ||
      !firstName ||
      !lastName ||
      !phone ||
      !password ||
      !confirmPassword ||
      !age
    ) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ tất cả các trường!");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Lỗi", "Email không hợp lệ!");
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu và xác nhận mật khẩu không khớp!");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }

    // Validate age
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 13) {
      Alert.alert("Lỗi", "Tuổi phải lớn hơn hoặc bằng 13!");
      return;
    }

    setIsLoading(true);

    try {
      await authService.signup({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
        password,
        role,
        age: ageNum,
        status: "active",
      });

      Alert.alert("Thành công", "Đăng ký thành công! Vui lòng đăng nhập.");
      router.replace("/login");
    } catch (error: unknown) {
      console.error("Signup error:", error);

      let errorMessage = "Đăng ký thất bại!";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      Alert.alert("Lỗi", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#1A2A44]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View className="px-6 py-6">
          {/* Tab Navigation */}
          <View className="flex-row justify-center gap-4 mb-8">
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text className="text-white text-lg">Đăng nhập</Text>
            </TouchableOpacity>
            <Text className="text-white text-lg font-semibold border-b-2 border-blue-500 pb-1 px-2">
              Đăng ký
            </Text>
          </View>

          {/* Email */}
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
                placeholder="Nhập email"
                placeholderTextColor="gray"
                className="flex-1 text-white"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* First Name */}
          <View className="mb-6">
            <View className="flex-row items-center border-b border-gray-500 py-2">
              <Ionicons
                name="person-outline"
                size={24}
                color="#3b82f6"
                className="mr-3"
              />
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Tên"
                placeholderTextColor="gray"
                className="flex-1 text-white"
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Last Name */}
          <View className="mb-6">
            <View className="flex-row items-center border-b border-gray-500 py-2">
              <Ionicons
                name="person-outline"
                size={24}
                color="#3b82f6"
                className="mr-3"
              />
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Họ"
                placeholderTextColor="gray"
                className="flex-1 text-white"
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Phone */}
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
                placeholder="Số điện thoại"
                placeholderTextColor="gray"
                className="flex-1 text-white"
                keyboardType="phone-pad"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Age */}
          <View className="mb-6">
            <View className="flex-row items-center border-b border-gray-500 py-2">
              <Ionicons
                name="calendar-outline"
                size={24}
                color="#3b82f6"
                className="mr-3"
              />
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="Tuổi"
                placeholderTextColor="gray"
                className="flex-1 text-white"
                keyboardType="number-pad"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Role */}
          <View className="mb-6">
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color="#3b82f6"
                className="mr-3"
              />
              <Text className="text-white text-base">Vai trò</Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {ROLE_OPTIONS.map((option) => {
                const active = role === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setRole(option.value)}
                    disabled={isLoading}
                    className={`px-3 py-2 rounded-xl border ${
                      active ? "border-blue-400 bg-blue-500/20" : "border-gray-500"
                    }`}
                  >
                    <Text className={active ? "text-blue-200 font-semibold" : "text-white"}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-gray-300 text-xs mt-2">Vai trò đã chọn: {selectedRoleLabel}</Text>
          </View>

          {/* Password */}
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
                placeholder="Mật khẩu"
                placeholderTextColor="gray"
                className="flex-1 text-white"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
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

          {/* Confirm Password */}
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
                placeholder="Xác nhận mật khẩu"
                placeholderTextColor="gray"
                className="flex-1 text-white"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
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

          {/* Signup Button */}
          <TouchableOpacity
            onPress={handleSignup}
            className="bg-blue-500 p-4 rounded-lg mb-6"
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Signup;
