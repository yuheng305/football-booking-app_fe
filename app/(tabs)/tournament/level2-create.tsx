import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import HeaderUser from "@/component/HeaderUser";
import { goBackOrReplace } from "@/src/utils/navigation.helper";
import tournamentLevel2DraftService from "@/src/services/tournament-level2-draft.service";
import type { TournamentSportType } from "@/src/types/tournament.types";
import { bracketRoundCount, byeCountRound1, matchCountForBracketRound } from "@/src/utils/bracket";

const SPORTS: Array<{ key: TournamentSportType; label: string }> = [
  { key: "football", label: "Bóng đá" },
  { key: "badminton", label: "Cầu lông" },
  { key: "tennis", label: "Quần vợt" },
  { key: "pickleball", label: "Pickleball" },
  { key: "basketball", label: "Bóng rổ" },
];

const MIN_TEAMS = 2;
const MAX_TEAMS = 128;

export default function TournamentLevel2CreateScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [sportType, setSportType] = useState<TournamentSportType>("football");
  const [teamCountStr, setTeamCountStr] = useState("8");
  const [teams, setTeams] = useState<string[]>(() => Array(8).fill(""));
  const [saving, setSaving] = useState(false);

  const parsedTeamCount = useMemo(() => {
    const n = parseInt(teamCountStr.replace(/\D/g, ""), 10);
    if (!Number.isFinite(n)) return null;
    return Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, n));
  }, [teamCountStr]);

  useEffect(() => {
    if (parsedTeamCount == null) return;
    setTeams((prev) => {
      const next = [...prev];
      while (next.length < parsedTeamCount) next.push("");
      next.length = parsedTeamCount;
      return next;
    });
  }, [parsedTeamCount]);

  const bracketPreview = useMemo(() => {
    if (parsedTeamCount == null || parsedTeamCount < MIN_TEAMS) return null;
    const k = bracketRoundCount(parsedTeamCount);
    const r1 = matchCountForBracketRound(parsedTeamCount, 1);
    const bye = byeCountRound1(parsedTeamCount);
    return { k, r1, bye };
  }, [parsedTeamCount]);

  const canContinue = useMemo(() => {
    if (!name.trim()) return false;
    if (parsedTeamCount == null) return false;

    if (teams.length !== parsedTeamCount) return false;

    return teams.every((t) => t.trim().length > 0);
  }, [name, parsedTeamCount, teams]);

  const handleContinue = async () => {
    if (!canContinue || parsedTeamCount == null) {
      Alert.alert(
        "Thiếu thông tin",
        `Vui lòng nhập tên giải, số đội (${MIN_TEAMS}–${MAX_TEAMS}) và đủ tên từng đội.`
      );
      return;
    }

    try {
      setSaving(true);
      await tournamentLevel2DraftService.setSetupDraft({
        name: name.trim(),
        sport_type: sportType,
        size: parsedTeamCount,
        teams: teams.map((t) => t.trim()),
        entry_fee: 0,
      });
      router.push("/(tabs)/tournament/level2-round-config" as never);
    } catch (error: any) {
      Alert.alert("Không lưu được", error?.message || "Thử lại sau.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <HeaderUser
        title="Tạo giải đấu theo vòng"
        subtitle="Thông tin giải và danh sách đội"
        showBackButton
        onBackPress={() => goBackOrReplace(navigation, "/(tabs)/tournament")}
      />

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="border border-indigo-200 bg-indigo-50 rounded-2xl p-3 mb-4">
          <Text className="text-indigo-900 font-semibold">Giải đấu loại trực tiếp</Text>
          <Text className="text-indigo-800 text-xs mt-1">
            Điền tên từng đội theo đúng số đội đã nhập. Bước sau bạn chọn cụm sân và khung ngày giờ từng vòng; lịch trận sẽ do hệ thống tự sắp.
          </Text>
        </View>

        <Text className="text-sm text-gray-500 mb-1">Tên giải đấu</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="VD: Giải hè 2026"
          className="border border-gray-300 rounded-xl px-4 py-3 text-base mb-3"
        />

        <Text className="text-sm text-gray-500 mb-2">Môn thể thao</Text>
        <View className="flex-row flex-wrap mb-3">
          {SPORTS.map((sport) => {
            const active = sport.key === sportType;
            return (
              <TouchableOpacity
                key={sport.key}
                onPress={() => setSportType(sport.key)}
                className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                  active ? "border-indigo-600 bg-indigo-50" : "border-gray-300"
                }`}
              >
                <Text className={active ? "text-indigo-700 font-semibold" : "text-gray-700"}>
                  {sport.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text className="text-sm text-gray-500 mb-1">Số đội ({MIN_TEAMS}–{MAX_TEAMS})</Text>
        <TextInput
          value={teamCountStr}
          onChangeText={(text) => setTeamCountStr(text.replace(/[^\d]/g, ""))}
          keyboardType="number-pad"
          placeholder={`${MIN_TEAMS}–${MAX_TEAMS}`}
          className="border border-gray-300 rounded-xl px-4 py-3 text-base mb-2"
        />
        {bracketPreview ? (
          <Text className="text-xs text-gray-600 mb-3">
            → {bracketPreview.k} vòng đấu · Vòng 1: {bracketPreview.r1} trận
            {bracketPreview.bye > 0 ? `, ${bracketPreview.bye} đội chờ vòng sau` : ""}
          </Text>
        ) : (
          <Text className="text-xs text-gray-400 mb-3">Nhập số đội hợp lệ để xem tóm tắt vòng đấu.</Text>
        )}

        <Text className="text-sm text-gray-500 mb-2">Tên các đội</Text>
        {teams.map((teamName, index) => (
          <View key={index} className="mb-2">
            <Text className="text-xs text-gray-400 mb-1">Đội {index + 1}</Text>
            <TextInput
              value={teamName}
              onChangeText={(text) =>
                setTeams((prev) => prev.map((v, i) => (i === index ? text : v)))
              }
              placeholder={`Tên đội ${index + 1}`}
              className="border border-gray-300 rounded-xl px-4 py-3 text-base"
            />
          </View>
        ))}

        <TouchableOpacity
          onPress={handleContinue}
          disabled={!canContinue || saving}
          className={`rounded-xl py-3 items-center mb-2 ${!canContinue || saving ? "bg-gray-300" : "bg-emerald-600"}`}
        >
          <Text className="text-white font-semibold">{saving ? "Đang lưu..." : "Tiếp theo: cụm sân & khung thời gian"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
