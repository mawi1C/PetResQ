import React, { useState, useRef } from "react"
import { ScrollView, View, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import tw from "twrnc"
import { registerUser } from "../../utils/Authentication"
import { sendLocalNotification } from "../../utils/NotificationService"
import CustomInput from "../../components/CustomInput"
import CustomText from "../../components/CustomText"
import ErrorModal from "../../components/CustomModal"

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [modalVisible, setModalVisible] = useState(false)
  const scrollRef = useRef(null)

  const handleRegister = async () => {
    const result = await registerUser(fullName, email, phone, location, password)
    if (result.success) {
      sendLocalNotification(
        "Account Created",
        "Your account has been created successfully! Please verify your email before logging in."
      )
      navigation.replace("Login") // Replace so user can't go back to Register after signup
    } else {
      setError(result.error)
      setModalVisible(true)
    }
  }

  const scrollToBottom = () => {
    scrollRef.current?.scrollToEnd({ animated: true })
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Header with back arrow */}
      <View style={tw`flex-row items-center justify-center py-4 border-b border-gray-200`}>
        <TouchableOpacity
          style={tw`absolute left-4`}
          onPress={() => navigation.navigate("Login")}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <CustomText style={tw`text-xl font-semibold`}>Register</CustomText>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={tw`flex-grow justify-center px-6`}
        keyboardShouldPersistTaps="handled"
      >
        <CustomInput placeholder="Full Name" value={fullName} onChangeText={setFullName} onFocus={scrollToBottom} />
        <CustomInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={tw`mt-4`} onFocus={scrollToBottom} />
        <CustomInput placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={tw`mt-4`} onFocus={scrollToBottom} />
        <CustomInput placeholder="Location" value={location} onChangeText={setLocation} style={tw`mt-4`} onFocus={scrollToBottom} />
        <CustomInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={tw`mt-4`} onFocus={scrollToBottom} />

        <TouchableOpacity style={tw`bg-blue-600 py-3 rounded-lg items-center mt-6`} onPress={handleRegister}>
          <CustomText style={tw`text-white text-base font-semibold`}>Sign Up</CustomText>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")} style={tw`mt-5`}>
          <CustomText style={tw`text-gray-600 text-center text-sm`}>
            Already have an account? Login
          </CustomText>
        </TouchableOpacity>
      </ScrollView>

      <ErrorModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setError("") }}
        title="Error"
        description={error}
        iconName="close-circle"
        iconColor="#ef4444"
      />
    </SafeAreaView>
  )
}
