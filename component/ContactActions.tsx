import React from "react";
import { View, TouchableOpacity, Text, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";

interface Props {
  receiverId?: string | number | null;
  name?: string | null;
  phone?: string | null;
}

export default function ContactActions({ receiverId, name, phone }: Props) {
  const router = useRouter();

  const onChat = () => {
    if (!receiverId) {
      Alert.alert("Không thể nhắn", "Không có thông tin người nhận");
      return;
    }

    router.push({ pathname: "/chat", params: { receiverId: String(receiverId), name: name || "" } } as any);
  };

  const onCopy = async () => {
    if (!phone) {
      Alert.alert("Không có số", "Số điện thoại không có sẵn để sao chép");
      return;
    }

    try {
      await Clipboard.setStringAsync(phone);
      Alert.alert("Đã sao chép", "Số điện thoại đã được sao chép vào clipboard");
    } catch (e) {
      Alert.alert("Lỗi", "Không thể sao chép số điện thoại");
    }
  };

  return (
    <View style={{ flexDirection: "row", marginTop: 8 }}>
      <TouchableOpacity
        onPress={onChat}
        style={{ backgroundColor: "#114F99", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 }}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>Nhắn</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onCopy}
        style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1d5db", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}
      >
        <Text style={{ color: "#111827", fontWeight: "600" }}>Sao chép SĐT</Text>
      </TouchableOpacity>
    </View>
  );
}
