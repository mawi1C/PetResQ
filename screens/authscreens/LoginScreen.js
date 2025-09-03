import { useState, useCallback, useEffect, useRef } from "react"
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { loginUser, resetPassword } from "../../utils/Authentication"
import tw from "twrnc"
import CustomText from "../../components/CustomText"
import CustomInput from "../../components/CustomInput"
import ErrorModal from "../../components/CustomModal"
import { Ionicons } from "@expo/vector-icons"

export default function LoginScreen() {
  const navigation = useNavigation()
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [rememberMe, setRememberMe] = useState(false)

  // 🔹 Modal state
  const [modalVisible, setModalVisible] = useState(false)
  const [modalMessage, setModalMessage] = useState("")
  const [modalType, setModalType] = useState("error")

  const showModal = (msg, type = "error") => {
    setModalMessage(msg)
    setModalType(type)
    setModalVisible(true)
  }

  // 🔹 Keyboard animation
  const shift = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "android" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        Animated.timing(shift, {
          toValue: -event.endCoordinates.height / 2,
          duration: event.duration || 250,
          useNativeDriver: true,
        }).start()
      }
    )

    const hideSub = Keyboard.addListener(
      Platform.OS === "android" ? "keyboardWillHide" : "keyboardDidHide",
      (event) => {
        Animated.timing(shift, {
          toValue: 0,
          duration: event.duration || 250,
          useNativeDriver: true,
        }).start()
      }
    )

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [shift])

  const handleForgotPassword = useCallback(async () => {
    if (!formData.email.trim()) {
      showModal("Please enter your email address first.", "warning")
      return
    }

    try {
      const result = await resetPassword(formData.email.trim())
      if (result.success) {
        showModal(result.message, "info")
      } else {
        showModal(result.error, "error")
      }
    } catch (error) {
      showModal("Failed to send reset email. Please try again.", "error")
    }
  }, [formData.email])

  const validateLoginInputs = useCallback(() => {
    const errors = {}
    const trimmedEmail = formData.email.trim()
    const trimmedPassword = formData.password.trim()

    if (!trimmedEmail) {
      errors.email = "Please enter your email"
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = "Please enter a valid email address"
      }
    }

    if (!trimmedPassword) {
      errors.password = "Please enter your password"
    } else if (trimmedPassword.length < 6) {
      errors.password = "Password must be at least 6 characters"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData.email, formData.password])

  const handleLogin = useCallback(async () => {
    if (!validateLoginInputs()) return

    setLoading(true)
    try {
      const result = await loginUser(
        formData.email.trim(),
        formData.password,
        rememberMe
      )

      if (result.success) {
        // ✅ App.js handles auth state navigation
      } else {
        if (result.needsVerification) {
          showModal("Please verify your email before logging in.", "info")
        } else if (result.locked) {
          showModal(
            "Too many failed attempts. Account locked. Try again later.",
            "lock"
          )
        } else if (result.error?.includes("Invalid email or password")) {
          showModal("Invalid email or password. Please try again.", "error")
        } else if (result.error?.includes("Too many failed attempts")) {
          showModal(
            "Too many failed attempts. Please try again later.",
            "warning"
          )
        } else if (result.error?.includes("network")) {
          showModal(
            "Network issue. Please check your internet connection.",
            "warning"
          )
        } else {
          showModal(result.error || "Login failed. Please try again.", "error")
        }
      }
    } catch (error) {
      showModal("An unexpected error occurred. Please try again.", "error")
    } finally {
      setLoading(false)
    }
  }, [formData, validateLoginInputs, rememberMe])

  const handleEmailChange = useCallback(
    (text) => {
      setFormData((prev) => ({ ...prev, email: text }))
      if (validationErrors.email) {
        setValidationErrors((prev) => ({ ...prev, email: null }))
      }
    },
    [validationErrors.email]
  )

  const handlePasswordChange = useCallback(
    (text) => {
      setFormData((prev) => ({ ...prev, password: text }))
      if (validationErrors.password) {
        setValidationErrors((prev) => ({ ...prev, password: null }))
      }
    },
    [validationErrors.password]
  )

  const navigateToSignup = useCallback(() => {
    navigation.navigate("Register")
  }, [navigation])

  return (
    <KeyboardAvoidingView
      style={tw`flex-1 bg-white`}
      behavior={Platform.OS === "android" ? "padding" : undefined}
    >
      {/* 🔹 Animated wrapper */}
      <Animated.View
        style={[
          tw`flex-1 justify-center px-6`,
          { transform: [{ translateY: shift }] },
        ]}
      >
        <CustomText weight="Medium" size="xl" style={tw`text-left`}>
          Welcome back hero!
        </CustomText>
        <CustomText size="xs" style={tw`mb-8 text-left text-gray-500`}>
          Log in to continue and help us make a difference!
        </CustomText>

        {/* Email Input */}
        <View style={tw`mb-4`}>
          <CustomInput
            label="Email Address"
            placeholder="Email"
            value={formData.email}
            onChangeText={handleEmailChange}
            error={validationErrors.email}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            autoComplete="email"
            iconName="person-outline"
          />
        </View>

        {/* Password Input */}
        <View style={tw`mb-4`}>
          <CustomInput
            label="Password"
            placeholder="Password"
            value={formData.password}
            onChangeText={handlePasswordChange}
            error={validationErrors.password}
            editable={!loading}
            autoComplete="password"
            isPassword={true}
            iconName="lock-closed-outline"
          />
        </View>

        {/* Remember Me + Forgot Password */}
        <View style={tw`flex-row justify-between items-center mb-6`}>
          <TouchableOpacity
            onPress={() => setRememberMe(!rememberMe)}
            style={tw`flex-row items-center`}
            activeOpacity={0.7}
          >
            <View
              style={tw`w-5 h-5 border-2 border-gray-300 rounded mr-2 items-center justify-center ${
                rememberMe ? "bg-blue-500 border-blue-500" : ""
              }`}
            >
              {rememberMe && (
                <Ionicons name="checkmark" size={14} color="white" />
              )}
            </View>
            <CustomText size="xs">Remember me</CustomText>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
            <CustomText style={tw`text-blue-500 text-xs`}>
              Forgot Password?
            </CustomText>
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          onPress={handleLogin}
          style={tw`${
            loading ? "bg-blue-400" : "bg-blue-500"
          } p-3 rounded-lg`}
          disabled={loading}
          activeOpacity={0.8}
        >
          <CustomText
            weight="Medium"
            color="white"
            style={tw`text-center text-[14px]`}
          >
            {loading ? "Logging In..." : "Log In"}
          </CustomText>
        </TouchableOpacity>

        {/* Signup Link */}
        <TouchableOpacity
          onPress={navigateToSignup}
          style={tw`mt-4`}
          disabled={loading}
          activeOpacity={0.7}
        >
          <CustomText style={tw`text-center text-xs`}>
            Don't have an account?{" "}
            <CustomText weight="Medium" style={tw`text-xs text-blue-500`}>
              Sign up
            </CustomText>
          </CustomText>
        </TouchableOpacity>
      </Animated.View>

      {/* 🔹 Error Modal */}
      <ErrorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        description={modalMessage}
        type={modalType}
      />
    </KeyboardAvoidingView>
  )
}
