import React, { useState, useEffect } from "react"
import { ScrollView, KeyboardAvoidingView, Platform, View, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import tw from "twrnc"
import { loginUser } from "../../utils/Authentication"
import { sendLocalNotification } from "../../utils/NotificationService"
import CustomInput from "../../components/CustomInput"
import CustomText from "../../components/CustomText"
import ErrorModal from "../../components/CustomModal"

export default function LoginScreen({ navigation, route }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [modalVisible, setModalVisible] = useState(false)

  // Notification after email verification
  useEffect(() => {
    if (route.params?.emailVerified) {
      sendLocalNotification(
        "Email Verified",
        "Your email is now verified! You can successfully log in."
      )
    }
  }, [route.params])

  const handleLogin = async () => {
    const result = await loginUser(email, password)
    if (result.success) {
      navigation.replace("MainTabs") // Replace so user can't go back to login
    } else {
      setError(result.error)
      setModalVisible(true)
    }
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
      >
        <ScrollView
          contentContainerStyle={tw`flex-grow justify-center px-6`}
          keyboardShouldPersistTaps="handled"
        >
          <CustomText style={tw`text-2xl font-semibold text-center mb-6`}>Login</CustomText>

          <CustomInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <CustomInput
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={tw`mt-4`}
          />

          <TouchableOpacity
            style={tw`bg-blue-600 py-3 rounded-lg items-center mt-6`}
            onPress={handleLogin}
          >
            <CustomText style={tw`text-white text-base font-semibold`}>Sign In</CustomText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Register")}
            style={tw`mt-5`}
          >
            <CustomText style={tw`text-gray-600 text-center text-sm`}>
              Don’t have an account? Register
            </CustomText>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ErrorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Error"
        description={error}
        iconName="close-circle"
        iconColor="#ef4444"
      />
    </SafeAreaView>
  )
}
