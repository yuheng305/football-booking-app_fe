import { SafeAreaView, Text } from "react-native";

const home = () => {
    return (
        <SafeAreaView className="flex-1 bg-white items-center justify-center">
            <Text className="font-bold text-center text-3xl text-indigo-600">Hi Mom, this is Homepage</Text>
        </SafeAreaView>
    )
}

export default home;