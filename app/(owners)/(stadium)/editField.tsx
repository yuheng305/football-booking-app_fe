import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function editField() {
  const router = useRouter();
  const { stadiumName } = useLocalSearchParams();
  const [startDate, setStartDate] = useState("20/04/2025");
  const [endDate, setEndDate] = useState("20/06/2025");
  const [openHour, setOpenHour] = useState(6);
  const [openMinute, setOpenMinute] = useState(10);
  const [openPeriod, setOpenPeriod] = useState("PM");
  const [closeHour, setCloseHour] = useState(6);
  const [closeMinute, setCloseMinute] = useState(10);
  const [closePeriod, setClosePeriod] = useState("PM");
  const [isOpenTimePickerVisible, setIsOpenTimePickerVisible] = useState(false);
  const [isCloseTimePickerVisible, setIsCloseTimePickerVisible] = useState(false);
  const [isStartDatePickerVisible, setIsStartDatePickerVisible] = useState(false);
  const [isEndDatePickerVisible, setIsEndDatePickerVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(20);
  const [selectedMonth, setSelectedMonth] = useState(4); // 1-12
  const [selectedYear, setSelectedYear] = useState(2025);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "April",
    "May",
    "June",
    "July",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const handleHourChange = (type: "open" | "close", value: number) => {
    if (type === "open") setOpenHour(value);
    else setCloseHour(value);
  };

  const handleMinuteChange = (type: "open" | "close", value: number) => {
    if (type === "open") setOpenMinute(value);
    else setCloseMinute(value);
  };

  const handlePeriodToggle = (type: "open" | "close") => {
    if (type === "open") setOpenPeriod(openPeriod === "AM" ? "PM" : "AM");
    else setClosePeriod(closePeriod === "AM" ? "PM" : "AM");
  };

  const handleDayChange = (day: number) => setSelectedDay(day);
  const handleMonthChange = (month: number) => setSelectedMonth(month);
  const handleYearChange = (year: number) => setSelectedYear(year);

  const handleSaveDate = (type: "start" | "end") => {
    const newDate = `${selectedDay.toString().padStart(2, "0")}/${selectedMonth
      .toString()
      .padStart(2, "0")}/${selectedYear}`;
    if (type === "start") setStartDate(newDate);
    else setEndDate(newDate);
    if (type === "start") setIsStartDatePickerVisible(false);
    else setIsEndDatePickerVisible(false);
  };

  const handleCancelDate = (type: "start" | "end") => {
    if (type === "start") setIsStartDatePickerVisible(false);
    else setIsEndDatePickerVisible(false);
  };

  const handleSave = () => {
    console.log(
      `Lưu thông tin thời gian cho ${stadiumName}: Từ ${startDate} đến ${endDate}, Mở ${openHour}:${openMinute} ${openPeriod} - Đóng ${closeHour}:${closeMinute} ${closePeriod}`
    );
    router.push("/stadium");
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View key={`empty-${i}`} className="w-[30px] h-[30px]" />
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = day === selectedDay;
      days.push(
        <TouchableOpacity
          key={day}
          className={`w-[30px] h-[30px] rounded-full justify-center items-center ${
            isSelected ? "bg-[#7B61FF]" : ""
          }`}
          onPress={() => handleDayChange(day)}
        >
          <Text
            className={`text-center font-poppins text-[14px] ${
              isSelected ? "text-white" : day > daysInMonth ? "text-[#CACACA]" : "text-[#222222]"
            }`}
            style={{ fontFamily: "Poppins" }}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="w-full h-11 bg-black" />

      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity
          className="w-10 h-10 bg-white border border-gray-200 rounded-xl items-center justify-center"
          onPress={() => router.push("/stadium")}
        >
          <Ionicons name="arrow-back" size={20} color="#1E232C" />
        </TouchableOpacity>

        <Text
          className="flex-1 font-bold text-[26px] text-[#1E232C] text-center"
          style={{ fontFamily: "Open Sans" }}
        >
          {stadiumName || "Sân 1"}
        </Text>

        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1 px-4 mt-8">
        <View className="mb-6">
          <Text className="text-black text-[15px] font-medium mb-2">
            Chọn giờ mở sân
          </Text>
          <View className="bg-gray-100 border border-gray-300 rounded-lg p-4 flex-row items-center justify-between">
            <Text
              className="text-black text-[24px] font-medium"
              style={{ fontFamily: "Pretendard" }}
            >
              {openHour.toString().padStart(2, "0")}:
              {openMinute.toString().padStart(2, "0")} {openPeriod}
            </Text>
            <TouchableOpacity
              className="p-2"
              onPress={() => setIsOpenTimePickerVisible(!isOpenTimePickerVisible)}
            >
              <Ionicons name="time-outline" size={20} color="#4B72D2" />
            </TouchableOpacity>
          </View>
          {isOpenTimePickerVisible && (
            <View className="bg-white border border-gray-300 rounded-lg p-4 mt-2 flex-row items-center justify-between">
              <TouchableOpacity
                className="p-2"
                onPress={() => handleHourChange("open", Math.max(1, openHour - 1))}
              >
                <Text className="text-[#4B72D2] font-bold">↑</Text>
              </TouchableOpacity>
              <Text
                className="text-black text-[24px] font-medium mx-2"
                style={{ fontFamily: "Pretendard" }}
              >
                {openHour.toString().padStart(2, "0")}
              </Text>
              <TouchableOpacity
                className="p-2"
                onPress={() => handleHourChange("open", Math.min(12, openHour + 1))}
              >
                <Text className="text-[#4B72D2] font-bold">↓</Text>
              </TouchableOpacity>
              <Text className="text-[#A6A6A6] text-[10.67px] mx-1" style={{ fontFamily: "Pretendard" }}>
                :
              </Text>
              <TouchableOpacity
                className="p-2"
                onPress={() => handleMinuteChange("open", Math.max(0, openMinute - 1))}
              >
                <Text className="text-[#4B72D2] font-bold">↑</Text>
              </TouchableOpacity>
              <Text
                className="text-black text-[24px] font-medium mx-2"
                style={{ fontFamily: "Pretendard" }}
              >
                {openMinute.toString().padStart(2, "0")}
              </Text>
              <TouchableOpacity
                className="p-2"
                onPress={() => handleMinuteChange("open", Math.min(59, openMinute + 1))}
              >
                <Text className="text-[#4B72D2] font-bold">↓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="p-2 ml-2"
                onPress={() => handlePeriodToggle("open")}
              >
                <Text
                  className="text-[#4B72D2] text-[16px] font-semibold"
                  style={{ fontFamily: "Pretendard" }}
                >
                  {openPeriod}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View className="mb-6">
          <Text className="text-black text-[15px] font-medium mb-2">
            Chọn giờ đóng sân
          </Text>
          <View className="bg-gray-100 border border-gray-300 rounded-lg p-4 flex-row items-center justify-between">
            <Text
              className="text-black text-[24px] font-medium"
              style={{ fontFamily: "Pretendard" }}
            >
              {closeHour.toString().padStart(2, "0")}:
              {closeMinute.toString().padStart(2, "0")} {closePeriod}
            </Text>
            <TouchableOpacity
              className="p-2"
              onPress={() => setIsCloseTimePickerVisible(!isCloseTimePickerVisible)}
            >
              <Ionicons name="time-outline" size={20} color="#4B72D2" />
            </TouchableOpacity>
          </View>
          {isCloseTimePickerVisible && (
            <View className="bg-white border border-gray-300 rounded-lg p-4 mt-2 flex-row items-center justify-between">
              <TouchableOpacity
                className="p-2"
                onPress={() => handleHourChange("close", Math.max(1, closeHour - 1))}
              >
                <Text className="text-[#4B72D2] font-bold">↑</Text>
              </TouchableOpacity>
              <Text
                className="text-black text-[24px] font-medium mx-2"
                style={{ fontFamily: "Pretendard" }}
              >
                {closeHour.toString().padStart(2, "0")}
              </Text>
              <TouchableOpacity
                className="p-2"
                onPress={() => handleHourChange("close", Math.min(12, closeHour + 1))}
              >
                <Text className="text-[#4B72D2] font-bold">↓</Text>
              </TouchableOpacity>
              <Text className="text-[#A6A6A6] text-[10.67px] mx-1" style={{ fontFamily: "Pretendard" }}>
                :
              </Text>
              <TouchableOpacity
                className="p-2"
                onPress={() => handleMinuteChange("close", Math.max(0, closeMinute - 1))}
              >
                <Text className="text-[#4B72D2] font-bold">↑</Text>
              </TouchableOpacity>
              <Text
                className="text-black text-[24px] font-medium mx-2"
                style={{ fontFamily: "Pretendard" }}
              >
                {closeMinute.toString().padStart(2, "0")}
              </Text>
              <TouchableOpacity
                className="p-2"
                onPress={() => handleMinuteChange("close", Math.min(59, closeMinute + 1))}
              >
                <Text className="text-[#4B72D2] font-bold">↓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="p-2 ml-2"
                onPress={() => handlePeriodToggle("close")}
              >
                <Text
                  className="text-[#4B72D2] text-[16px] font-semibold"
                  style={{ fontFamily: "Pretendard" }}
                >
                  {closePeriod}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View className="mb-6">
          <Text className="text-black text-[15px] font-medium mb-2">
            Chọn ngày áp dụng
          </Text>
          <View className="flex-row items-center">
            <View className="flex-1 mr-2">
              <Text className="text-black text-[15px] font-medium mb-1">Từ:</Text>
              <TouchableOpacity
                className="bg-gray-100 border border-gray-300 rounded-lg p-4 flex-row items-center justify-between"
                onPress={() => setIsStartDatePickerVisible(true)}
              >
                <Text
                  className="text-black text-[16px] font-medium"
                  style={{ fontFamily: "Inter" }}
                >
                  {startDate}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#4B72D2" />
              </TouchableOpacity>
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-black text-[15px] font-medium mb-1">Đến:</Text>
              <TouchableOpacity
                className="bg-gray-100 border border-gray-300 rounded-lg p-4 flex-row items-center justify-between"
                onPress={() => setIsEndDatePickerVisible(true)}
              >
                <Text
                  className="text-black text-[16px] font-medium"
                  style={{ fontFamily: "Inter" }}
                >
                  {endDate}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#4B72D2" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          className="bg-[#0B8FAC] py-4 px-20 rounded-lg items-center mt-8 self-center"
          onPress={handleSave}
        >
          <Text className="text-white text-xl font-semibold" style={{ fontFamily: "Urbanist" }}>
            Áp dụng
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={isStartDatePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsStartDatePickerVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="w-[334px] h-[440px] bg-[#FCFCFC] rounded-[14px] p-5">
            <View className="flex-row justify-between items-center w-[293px] h-[34px] mb-5">
              <View className="flex-row items-center w-[88px] h-[22px]">
                <Text
                  className="text-[#222222] text-[18px] font-medium w-[42px] h-[22px] text-center"
                  style={{ fontFamily: "Inter" }}
                >
                  {months[selectedMonth - 1]}
                </Text>
                <Text
                  className="text-[#222222] text-[18px] font-medium w-[46px] h-[22px] text-center"
                  style={{ fontFamily: "Inter" }}
                >
                  {selectedYear}
                </Text>
              </View>
              <View className="flex-row w-[82.01px] h-[34px] gap-3">
                <TouchableOpacity
                  className="w-[34px] h-[34px] p-1 justify-center items-center"
                  onPress={() => {
                    if (selectedMonth === 1) {
                      setSelectedMonth(12);
                      setSelectedYear(selectedYear - 1);
                    } else {
                      setSelectedMonth(selectedMonth - 1);
                    }
                  }}
                >
                  <Ionicons name="caret-up" size={26} color="#222222" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="w-[34px] h-[34px] p-1 justify-center items-center"
                  onPress={() => {
                    if (selectedMonth === 12) {
                      setSelectedMonth(1);
                      setSelectedYear(selectedYear + 1);
                    } else {
                      setSelectedMonth(selectedMonth + 1);
                    }
                  }}
                >
                  <Ionicons name="caret-down" size={26} color="#222222" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="w-[294px] h-[278px] gap-5">
              <View className="flex-row justify-between w-[294px] h-[16px] gap-0.5">
                {daysOfWeek.map((day) => (
                  <Text
                    key={day}
                    className="text-[#656565] text-[14px] font-medium w-[30px] h-[16px] text-center"
                    style={{ fontFamily: "Inter" }}
                  >
                    {day}
                  </Text>
                ))}
              </View>

              <View className="flex-row flex-wrap w-[294px] h-[240px] gap-3">
                {renderCalendarDays()}
              </View>
            </View>

            <View className="flex-row justify-center items-center w-[293px] h-[40px] gap-2.5 mt-5">
              <TouchableOpacity
                className="w-[141.5px] h-[40px] border border-[#222222] rounded-[6px] justify-center items-center"
                onPress={() => handleCancelDate("start")}
              >
                <Text
                  className="text-[#222222] text-[16px] font-medium"
                  style={{ fontFamily: "Poppins" }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="w-[141.5px] h-[40px] bg-[#7B61FF] rounded-[6px] justify-center items-center"
                onPress={() => handleSaveDate("start")}
              >
                <Text
                  className="text-[#FCFCFC] text-[16px] font-medium"
                  style={{ fontFamily: "Poppins" }}
                >
                  Áp dụng
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isEndDatePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEndDatePickerVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="w-[334px] h-[440px] bg-[#FCFCFC] rounded-[14px] p-5">
            {/* Top Bar */}
            <View className="flex-row justify-between items-center w-[293px] h-[34px] mb-5">
              <View className="flex-row items-center w-[88px] h-[22px]">
                <Text
                  className="text-[#222222] text-[18px] font-medium w-[42px] h-[22px] text-center"
                  style={{ fontFamily: "Inter" }}
                >
                  {months[selectedMonth - 1]}
                </Text>
                <Text
                  className="text-[#222222] text-[18px] font-medium w-[46px] h-[22px] text-center"
                  style={{ fontFamily: "Inter" }}
                >
                  {selectedYear}
                </Text>
              </View>
              <View className="flex-row w-[82.01px] h-[34px] gap-3">
                <TouchableOpacity
                  className="w-[34px] h-[34px] p-1 justify-center items-center"
                  onPress={() => {
                    if (selectedMonth === 1) {
                      setSelectedMonth(12);
                      setSelectedYear(selectedYear - 1);
                    } else {
                      setSelectedMonth(selectedMonth - 1);
                    }
                  }}
                >
                  <Ionicons name="caret-up" size={26} color="#222222" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="w-[34px] h-[34px] p-1 justify-center items-center"
                  onPress={() => {
                    if (selectedMonth === 12) {
                      setSelectedMonth(1);
                      setSelectedYear(selectedYear + 1);
                    } else {
                      setSelectedMonth(selectedMonth + 1);
                    }
                  }}
                >
                  <Ionicons name="caret-down" size={26} color="#222222" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="w-[294px] h-[278px] gap-5">
              <View className="flex-row justify-between w-[294px] h-[16px] gap-0.5">
                {daysOfWeek.map((day) => (
                  <Text
                    key={day}
                    className="text-[#656565] text-[14px] font-medium w-[30px] h-[16px] text-center"
                    style={{ fontFamily: "Inter" }}
                  >
                    {day}
                  </Text>
                ))}
              </View>

              <View className="flex-row flex-wrap w-[294px] h-[240px] gap-3">
                {renderCalendarDays()}
              </View>
            </View>

            <View className="flex-row justify-center items-center w-[293px] h-[40px] gap-2.5 mt-5">
              <TouchableOpacity
                className="w-[141.5px] h-[40px] border border-[#222222] rounded-[6px] justify-center items-center"
                onPress={() => handleCancelDate("end")}
              >
                <Text
                  className="text-[#222222] text-[16px] font-medium"
                  style={{ fontFamily: "Poppins" }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="w-[141.5px] h-[40px] bg-[#7B61FF] rounded-[6px] justify-center items-center"
                onPress={() => handleSaveDate("end")}
              >
                <Text
                  className="text-[#FCFCFC] text-[16px] font-medium"
                  style={{ fontFamily: "Poppins" }}
                >
                  Áp dụng
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}