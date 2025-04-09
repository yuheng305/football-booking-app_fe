import { router } from "expo-router"
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native"
import Swiper from "react-native-swiper"

const onboarding = () => {
    return (
        <Swiper loop={false} showsPagination={true}>
            <SafeAreaView className="flex-1 justify-center items-center bg-white">
                <Text className="text-center text-3xl font-bold text-indigo-600 mb-4">👋 Hi Mom, onboarding screen 1!</Text>
                <Text className="text-center text-lg text-gray-500">Swipe to continue</Text>
            </SafeAreaView>

            <SafeAreaView className="flex-1 bg-white">
                {/* Text centered in the flex space */}
                <View className="flex-1 justify-center items-center">
                    <Text className="text-center text-3xl font-bold text-indigo-600 mb-4">👋 Hi Mom, onboarding screen 2!</Text>
                </View>
                
                {/* Button at the bottom with some padding */}
                <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} className="w-[90%] bg-blue-500 rounded-lg py-4 items-center self-center mb-8">
                    <Text className="text-lg text-white font-bold">Start</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </Swiper>
    )
}

export default onboarding