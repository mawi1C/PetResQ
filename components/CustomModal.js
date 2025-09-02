import React, { useEffect, useRef } from "react"
import { View, TouchableOpacity, Modal, Animated } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import tw from "twrnc"
import CustomText from "./CustomText"

export default function ErrorModal({
  visible,
  onClose,
  description,
  type = "error",
  showResend = false,   // 🔹 new
  onResend,             // 🔹 new
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 100,
      }).start()
    } else {
      scaleAnim.setValue(0)
    }
  }, [visible])

  const getIcon = () => {
    switch (type) {
      case "error":
        return { name: "close-circle", color: "#ef4444" }
      case "warning":
        return { name: "warning", color: "#f59e0b" }
      case "lock":
        return { name: "lock-closed", color: "#3b82f6" }
      case "info":
        return { name: "information-circle", color: "#3b82f6" }
      case "success":
        return { name: "checkmark-circle", color: "#00C666" }
      default:
        return { name: "alert-circle", color: "#ef4444" }
    }
  }

  const { name, color } = getIcon()

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-30`}>
        <Animated.View
          style={[
            tw`bg-white p-4 rounded-lg w-74`,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Icon */}
          <View style={tw`flex-row items-center justify-center mb-2`}>
            <Ionicons name={name} size={50} color={color} />
          </View>

          {/* Description */}
          <CustomText style={tw`text-center text-gray-600 text-sm mb-4`}>
            {description}
          </CustomText>

          {/* Main Button */}
          <TouchableOpacity
            style={tw`bg-blue-600 py-2 rounded-lg mb-2`}
            onPress={onClose}
          >
            <CustomText weight="Medium" style={tw`text-white text-center text-sm py-1.5`}>
              OK
            </CustomText>
          </TouchableOpacity>

          {/* 🔹 Conditionally render Resend button */}
          {showResend && (
            <TouchableOpacity
              style={tw`border border-blue-600 py-2 rounded-lg`}
              onPress={onResend}
            >
              <CustomText style={tw`text-blue-600 text-center text-sm font-semibold py-1.5`}>
                Resend Verification Email
              </CustomText>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  )
}
