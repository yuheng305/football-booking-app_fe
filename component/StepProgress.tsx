import React from "react";
import { View, Text } from "react-native";

type StepProgressProps = {
  currentStep: number;
  totalSteps: number;
  label?: string;
};

const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  totalSteps,
  label,
}) => {
  return (
    <View className="px-4 pt-3 pb-2 bg-white">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-gray-700 font-semibold">
          {label || `Bước ${currentStep}/${totalSteps}`}
        </Text>
        <Text className="text-xs text-gray-500">Tiến độ {Math.round((currentStep / totalSteps) * 100)}%</Text>
      </View>

      <View className="flex-row">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const step = index + 1;
          const active = step <= currentStep;

          return (
            <View
              key={step}
              className={`h-2 rounded-full mr-2 flex-1 ${active ? "bg-indigo-600" : "bg-gray-200"}`}
            />
          );
        })}
      </View>
    </View>
  );
};

export default StepProgress;
