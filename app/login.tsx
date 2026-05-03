import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import authService from "../src/services/auth.service";
import { ROLE_ROUTES } from "../src/constants/roles";

const Login: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async () => {
    if (!emailOrUsername || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ email/username và mật khẩu!");
      return;
    }

    setIsLoading(true);

    try {
      const { user } = await authService.login({
        user_email: emailOrUsername.trim(),
        password,
      });

      if (user) {
        // Navigate based on role
        const destination = ROLE_ROUTES[user.role] || ("/(tabs)/home" as const);
        console.log(`Logged in as ${user.role}, navigating to: ${destination}`);
        router.replace(destination);
      }
    } catch (error: unknown) {
      console.error("Login error:", error);

      let errorMessage = "Đã có lỗi xảy ra. Vui lòng thử lại!";

      if (error instanceof Error) {
        if (error.message.includes("Network request failed")) {
          errorMessage =
            "Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet!";
        } else if (
          error.message.includes("401") ||
          error.message.includes("Unauthorized")
        ) {
          errorMessage = "Email hoặc mật khẩu không đúng!";
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert("Lỗi đăng nhập", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#1A2A44]">
      <View className="flex-1 justify-center px-6">
        <View className="flex-row justify-center gap-4 mb-8">
          <Text className="text-white text-lg font-semibold border-b-2 border-blue-500 pb-1 px-2">
            Đăng nhập
          </Text>
          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text className="text-white text-lg">Đăng ký</Text>
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
            <TextInput
              value={emailOrUsername}
              onChangeText={setEmailOrUsername}
              placeholder="Nhập email"
              placeholderTextColor="gray"
              className="flex-1 text-white"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
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
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center">
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ false: "gray", true: "#6366F1" }}
              thumbColor="white"
              disabled={isLoading}
            />
            <Text className="text-gray-400 ml-2">Ghi nhớ mật khẩu</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleLogin}
          className="bg-blue-500 p-4 rounded-lg mb-4"
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

        {/* Forgot Password Link */}
        <TouchableOpacity
          onPress={() => router.push("/forgot-password")}
          className="mb-4"
        >
          <Text className="text-center text-blue-400 text-sm">
            Quên mật khẩu?
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Login;
