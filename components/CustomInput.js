"use client"

import { useState } from "react"
import { TextInput, View, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import tw from "twrnc"

export default function CustomInput({ style, isPassword = false, ...props }) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible)
  }

  if (isPassword) {
    return (
      <View style={[tw`border border-gray-300 rounded-lg flex-row items-center px-4`, style]}>
        <TextInput
          placeholderTextColor="#9CA3AF"
          style={[
            tw`flex-1 py-4`,
            {
              fontFamily: "Poppins-Regular",
              textAlign: "left",
              textAlignVertical: "center",
              includeFontPadding: false,
              paddingVertical: 0,
            },
          ]}
          secureTextEntry={!isPasswordVisible}
          {...props}
        />
        <TouchableOpacity onPress={togglePasswordVisibility} style={tw`ml-2`}>
          <Ionicons name={isPasswordVisible ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <TextInput
      placeholderTextColor="#9CA3AF"
      style={[
        tw`border border-gray-300 rounded-lg px-4 py-4`,
        {
          fontFamily: "Poppins-Regular",
          textAlign: "left",
          textAlignVertical: "center",
          includeFontPadding: false,
          paddingVertical: 0,
        },
        style,
      ]}
      {...props}
    />
  )
}
