import { View, Text, ScrollView } from "react-native";

export default function Home() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1 bg-white px-4 pt-8">
      
      {/* Horizontal Section */}
      <Text className="text-xl font-bold mb-2 text-gray-800">Horizontal</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[...Array(10)].map((_, index) => (
          <View
            key={index}
            className="w-40 h-24 bg-gray-300 rounded-lg mr-4 justify-center items-center"
          >
            <Text className="text-gray-600">Item {index + 1}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Vertical Section */}
      <Text className="text-xl font-bold mt-8 mb-2 text-gray-800">Vertical</Text>
      {[...Array(10)].map((_, index) => (
        <View
          key={index}
          className="w-full h-24 bg-gray-300 rounded-lg mb-4 justify-center items-center"
        >
          <Text className="text-gray-600">Item {index + 1}</Text>
        </View>
      ))}

    </ScrollView>
  );
}
