import { Text } from "react-native"
import tw from "twrnc"

export default function CustomText({
  children,
  style,
  weight = "Regular", // 'Medium' | 'SemiBold' | 'Regular'
  size = "base", // Tailwind sizes like: 'xs', 'sm', 'base', 'lg', 'xl'
  color = "black", // Text color
  ...props
}) {
  const fontMap = {
    Regular: "Poppins-Regular",
    Medium: "Poppins-Medium",
    SemiBold: "Poppins-SemiBold",
  }

  return (
    <Text
      {...props}
      style={[tw`text-${size} text-[${color}]`, { fontFamily: fontMap[weight] || "Poppins-Regular" }, style]}
    >
      {children}
    </Text>
  )
}
