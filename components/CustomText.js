// components/CustomText.js
import React from "react"
import { Text } from "react-native"
import tw from "twrnc"

// ✅ Poppins-based Text component
export default function CustomText({
  children,
  style,
  weight = "Regular", // Regular | Medium | SemiBold
  ...props
}) {
  // Map weights to loaded Poppins fonts
  const fontFamilyMap = {
    Regular: "Poppins-Regular",
    Medium: "Poppins-Medium",
    SemiBold: "Poppins-SemiBold",
  }

  return (
    <Text
      style={[
        tw`text-base text-gray-800`,
        { fontFamily: fontFamilyMap[weight] || fontFamilyMap.Regular },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  )
}
