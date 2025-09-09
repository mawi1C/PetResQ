import React from "react";
import { View } from "react-native";
import tw from "twrnc";
import CustomText from "../../components/CustomText";

const AIPetSearchScreen = () => {
  return (
    <View style={tw`flex-1 bg-white items-center justify-center`}>
      <CustomText size="xl" weight="SemiBold" style={tw`text-gray-800`}>
        AI Pet Search Screen
      </CustomText>
    </View>
  );
};

export default AIPetSearchScreen;