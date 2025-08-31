import React, { useEffect, useRef } from "react"
import { View, TouchableOpacity, Modal, Animated, Easing } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import tw from "twrnc"
import CustomText from "./CustomText"

export default function ErrorModal({ visible, onClose, description }) {
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
          {/* Header with X icon and title */}
          <View style={tw`flex-row items-center justify-center mb-2`}>
            <Ionicons name="close-circle" size={50} color="#ef4444" style={tw`mr-2`} />
          </View>

          {/* Description */}
          <CustomText style={tw`text-center text-gray-600 text-sm mb-4`}>
            {description}
          </CustomText>

          {/* Close Button */}
          <TouchableOpacity
            style={tw`bg-blue-600 py-2 rounded-lg`}
            onPress={onClose}
          >
            <CustomText style={tw`text-white text-center font-semibold py-1.5`}>
              OK
            </CustomText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  )
}
