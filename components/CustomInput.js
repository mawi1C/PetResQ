import React from "react"
import { TextInput } from "react-native"
import tw from "twrnc"

export default function CustomInput({ style, ...props }) {
  return (
    <TextInput
      placeholderTextColor="#9CA3AF" // Tailwind gray-400
      style={[
        tw`border border-gray-300 rounded-lg px-4 py-4`,
        {
          fontFamily: "Poppins-Regular",
          textAlign: "left",            // horizontal alignment
          textAlignVertical: "center",  // fix Android vertical alignment
          includeFontPadding: false,    // remove font padding
          paddingVertical: 0,           // prevent placeholder jump
        },
        style,
      ]}
      {...props}
    />
  )
}
