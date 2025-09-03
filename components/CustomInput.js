import { useState } from "react"
import { TextInput, View, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import tw from "twrnc"
import CustomText from "./CustomText"

export default function CustomInput({
  style,
  isPassword = false,
  iconName,
  error,
  ...props
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible)
  }

  return (
    <View style={tw`mb-2`}>
      <View
        style={[
          tw`border rounded-lg flex-row items-center px-4`,
          error
            ? tw`border-red-500`
            : isFocused
            ? tw`border-blue-500`
            : tw`border-gray-300`,
          style,
        ]}
      >
        {/* Left Icon */}
        {iconName && (
          <Ionicons
            name={iconName}
            size={18}
            color={
              error
                ? "#EF4444"
                : isFocused
                ? "#3B82F6" // blue when focused
                : "#9CA3AF"
            }
            style={tw`mr-2`}
          />
        )}

        {/* Input Field */}
        <TextInput
          placeholderTextColor="#9CA3AF"
          style={[
            tw`flex-1 py-4`,
            {
              fontSize: 12,
              fontFamily: "Poppins-Regular",
              textAlign: "left",
              textAlignVertical: "center",
              includeFontPadding: false,
              paddingVertical: 0,
            },
          ]}
          secureTextEntry={isPassword && !isPasswordVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {/* Eye Toggle (only if password) */}
        {isPassword && (
          <TouchableOpacity onPress={togglePasswordVisibility} style={tw`ml-2`}>
            <Ionicons
              name={isPasswordVisible ? "eye-off" : "eye"}
              size={18}
              color={isFocused ? "#3B82F6" : "#9CA3AF"}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Error Text */}
      {error && (
        <CustomText size="xs" style={tw`text-red-500 mt-1 ml-1`}>
          {error}
        </CustomText>
      )}
    </View>
  )
}
