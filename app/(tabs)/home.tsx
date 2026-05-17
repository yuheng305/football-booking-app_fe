import {
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

const CARD_SIZE = 160;
const CARD_PAD_H = 12;
const CARD_PAD_TOP = 12;
const CARD_PAD_BOTTOM = 8;

const cardStyle = {
  width: CARD_SIZE,
  height: CARD_SIZE,
  backgroundColor: "white",
  borderRadius: 16,
  borderWidth: 2,
  borderColor: "#3b82f6",
  marginRight: 16,
  paddingHorizontal: CARD_PAD_H,
  paddingTop: CARD_PAD_TOP,
  paddingBottom: CARD_PAD_BOTTOM,
};

const cardImageWrapper = {
  flex: 1,
  width: CARD_SIZE - CARD_PAD_H * 2,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const cardImageStyle = {
  width: CARD_SIZE - CARD_PAD_H * 2,
  height: CARD_SIZE - CARD_PAD_TOP - CARD_PAD_BOTTOM - 28,
};

const resolveUserRole = async (): Promise<string | null> => {
  try {
    const [profileRaw, userDataRaw, legacyRole] = await Promise.all([
      AsyncStorage.getItem("userProfile"),
      AsyncStorage.getItem("userData"),
      AsyncStorage.getItem("userRole"),
    ]);

    const profileRole = profileRaw ? JSON.parse(profileRaw)?.role : null;
    const userRole = userDataRaw ? JSON.parse(userDataRaw)?.role : null;
    const rawRole = (userRole || profileRole || legacyRole || "")
      .toString()
      .trim()
      .toLowerCase();

    if (rawRole === "user") {
      return "player";
    }

    if (rawRole === "organizer") {
      return "owner";
    }

    if (rawRole === "player" || rawRole === "owner") {
      return rawRole;
    }

    return "player";
  } catch {
    return "player";
  }
};

export default function Home() {
  const router = useRouter();
  const [bookingIconFailed, setBookingIconFailed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadRole = async () => {
      const role = await resolveUserRole();
      if (mounted) {
        setUserRole(role);
      }
    };

    loadRole();

    return () => {
      mounted = false;
    };
  }, []);

  const isPlayer = useMemo(() => userRole === "player", [userRole]);
  const isOrganizer = useMemo(() => userRole === "owner", [userRole]);

  return (
    <SafeAreaView className="flex-1 bg-[#060b28]" edges={['top']}>
      {/* Header Section */}
      <View className="items-end mt-8 mr-4">
        <Text className="text-[#ff4d4d] text-5xl">GoPitch</Text>
        <Text className="text-blue-300 text-3xl mt-2">Đặt sân thể thao</Text>
      </View>

      {/* Player Image */}
      <View className="items-center">
        <Image
          source={require("../../assets/images/player_badminton.png")}
          style={{
            width: width * 1.2,
            height: width * 1.2,
            resizeMode: "contain",
          }}
        />
      </View>

      {/* Function Cards in ScrollView */}
      <View className="mb-8">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          className="flex-row"
        >
          {isPlayer && (
            <TouchableOpacity
              style={cardStyle}
              onPress={() => router.push("/(tabs)/stadium")}
            >
              <View style={cardImageWrapper}>
                {bookingIconFailed ? (
                  <MaterialCommunityIcons name="soccer-field" size={62} color="#1d4ed8" />
                ) : (
                  <Image
                    source={require("../../assets/images/book.png")}
                    style={cardImageStyle}
                    resizeMode="contain"
                    onError={() => setBookingIconFailed(true)}
                  />
                )}
              </View>
              <Text className="text-[#060b28] font-semibold text-center">
                Đặt sân
              </Text>
            </TouchableOpacity>
          )}

          {isOrganizer && (
            <TouchableOpacity
              style={cardStyle}
              onPress={() => router.push("/(tabs)/tournament")}
            >
              <View style={cardImageWrapper}>
                <Image
                  source={require("../../assets/images/tournament.png")}
                  style={cardImageStyle}
                  resizeMode="contain"
                />
              </View>
              <Text className="text-[#060b28] font-semibold text-center">
                Giải đấu
              </Text>
            </TouchableOpacity>
          )}

          {/* Card: Tài khoản */}
          <TouchableOpacity
            style={cardStyle}
            onPress={() => router.push("/(tabs)/account")}
          >
            <View style={cardImageWrapper}>
              <Image
                source={require("../../assets/images/account.png")}
                style={cardImageStyle}
                resizeMode="contain"
              />
            </View>
            <Text className="text-[#060b28] font-semibold text-center">
              Tài khoản
            </Text>
          </TouchableOpacity>

          {/* Card: Thanh toán */}
          <TouchableOpacity
            style={cardStyle}
            onPress={() => router.push("/(tabs)/payment")}
          >
            <View style={cardImageWrapper}>
              <Image
                source={require("../../assets/images/payment.png")}
                style={cardImageStyle}
                resizeMode="contain"
              />
            </View>
            <Text className="text-[#060b28] font-semibold text-center">
              Thanh toán
            </Text>
          </TouchableOpacity>

          {/* Card: Lịch sử đặt */}
          {isPlayer && (
            <TouchableOpacity
              style={cardStyle}
              onPress={() => router.push("/(tabs)/(users)/history")}
            >
              <View style={cardImageWrapper}>
                <Image
                  source={require("../../assets/images/bookinghistory.png")}
                  style={cardImageStyle}
                  resizeMode="contain"
                />
              </View>
              <Text className="text-[#060b28] font-semibold text-center">
                Lịch sử đặt
              </Text>
            </TouchableOpacity>
          )}

          {/* {isOrganizer && (
            <TouchableOpacity
              className="w-40 h-40 bg-white rounded-2xl items-center justify-center p-4 border-2 border-blue-500 mr-4"
              onPress={() => router.push("/chats")}
            >
              <MaterialCommunityIcons name="chat-processing-outline" size={62} color="#1d4ed8" />
              <Text className="text-[#060b28] font-semibold text-center mt-2">
                Hội thoại
              </Text>
            </TouchableOpacity>
          )} */}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
