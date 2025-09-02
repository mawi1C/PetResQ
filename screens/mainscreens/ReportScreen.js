import React from "react"
import { SafeAreaView, View } from "react-native"
import tw from "twrnc"
import CustomText from "../../components/CustomText"

export default function ReportScreen() {
  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <View style={tw`flex-1 justify-center items-center`}>
        <CustomText style={tw`text-2xl font-bold text-gray-800`}>
          Report Lost/Found Pet
        </CustomText>
      </View>
    </SafeAreaView>
  )
}
