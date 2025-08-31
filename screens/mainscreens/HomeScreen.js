import React from "react"
import { SafeAreaView, View } from "react-native"
import tw from "twrnc"
import CustomText from "../../components/CustomText"

export default function HomeScreen() {
  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <View style={tw`flex-1 justify-center items-center`}>
        <CustomText style={tw`text-2xl font-bold text-gray-800`}>
          Home 🏠
        </CustomText>
        <CustomText style={tw`text-base text-gray-600 mt-2`}>
          Welcome to your app!
        </CustomText>
      </View>
    </SafeAreaView>
  )
}
