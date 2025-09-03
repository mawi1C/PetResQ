"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
  Easing,
  ActivityIndicator,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Ionicons } from "@expo/vector-icons"
import tw from "twrnc"
import { registerUser } from "../../utils/Authentication"
import { sendLocalNotification } from "../../utils/NotificationService"
import CustomInput from "../../components/CustomInput"
import CustomText from "../../components/CustomText"
import ErrorModal from "../../components/CustomModal"

export default function RegisterScreen() {
  const navigation = useNavigation()

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    password: "",
    confirmPassword: "",
  })

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

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

  // 🔹 Progress animation
  const progress = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.timing(progress, {
      toValue: step,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start()
  }, [step])

  // Interpolations for bar widths
  const bar1Width = progress.interpolate({
    inputRange: [1, 2, 3],
    outputRange: ["100%", "100%", "100%"],
  })

  const bar2Width = progress.interpolate({
    inputRange: [1, 2, 3],
    outputRange: ["0%", "100%", "100%"],
  })

  const bar3Width = progress.interpolate({
    inputRange: [1, 2, 3],
    outputRange: ["0%", "0%", "100%"],
  })

  // Animation for strength bar
  const strengthAnim = useRef(new Animated.Value(0)).current
  const [barWidth, setBarWidth] = useState(0)

  useEffect(() => {
    if (formData.password.length > 0 && barWidth > 0) {
      const targetWidth =
        (getPasswordStrength(formData.password).percentage / 100) * barWidth
      Animated.timing(strengthAnim, {
        toValue: targetWidth,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start()
    } else {
      strengthAnim.setValue(0)
    }
  }, [formData.password, barWidth])

  // 🔹 Password Strength Checker
  const getPasswordStrength = (password) => {
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    if (score <= 1) {
      return { label: "Weak", color: "red", textColor: "red-500", percentage: 33 }
    } else if (score === 2 || score === 3) {
      return {
        label: "Medium",
        color: "orange",
        textColor: "orange-500",
        percentage: 66,
      }
    } else {
      return {
        label: "Strong",
        color: "green",
        textColor: "green-500",
        percentage: 100,
      }
    }
  }

  // 🔹 Step Validation
  const validateStep = () => {
    const errors = {}
    if (step === 1) {
      if (!formData.firstName.trim()) errors.firstName = "First name is required"
      if (!formData.lastName.trim()) errors.lastName = "Last name is required"
      if (!formData.email.trim()) {
        errors.email = "Email address is required"
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email.trim())) {
          errors.email = "Please enter a valid email address"
        }
      }
    } else if (step === 2) {
      if (!formData.phone.trim()) errors.phone = "Phone number is required"
      if (!formData.location.trim()) errors.location = "Location is required"
    } else if (step === 3) {
      if (!formData.password.trim()) {
        errors.password = "Password is required"
      } else if (formData.password.length < 8) {
        errors.password = "Password must be at least 8 characters"
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match"
      }
    }
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // 🔹 Register Submit
  const handleRegister = useCallback(async () => {
    if (!validateStep()) return

    setLoading(true)
    try {
      const { firstName, lastName, email, phone, location, password } = formData
      const result = await registerUser(
        firstName,
        lastName,
        email,
        phone,
        location,
        password
      )

      if (result.success) {
        sendLocalNotification(
          "Account Created",
          "Your account has been created successfully! Please verify your email before logging in."
        )

        setModalMessage(
          "Your account is ready! Check your inbox or spam to verify your email."
        )
        setModalType("info")
        setModalVisible(true)
      } else {
        if (result.error?.includes("already registered")) {
          showModal(result.error, "warning")
        } else if (result.error?.includes("Password must")) {
          showModal(result.error, "lock")
        } else if (result.error?.includes("valid email")) {
          showModal(result.error, "info")
        } else {
          showModal(result.error, "error")
        }
      }
    } catch (error) {
      showModal("An unexpected error occurred. Please try again.", "error")
    } finally {
      setLoading(false)
    }
  }, [formData])

  const handleNext = () => {
    if (!validateStep()) return
    if (step < 3) {
      setStep(step + 1)
    } else {
      handleRegister()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: null }))
    }
  }

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
        {/* Step Indicator */}
        <View style={tw`flex-row w-50% justify-center mt-6 mb-2`}>
          <View style={tw`h-2 flex-1 mx-1 bg-gray-200 rounded-full overflow-hidden`}>
            <Animated.View
              style={[tw`h-2 bg-blue-500 rounded-full`, { width: bar1Width }]}
            />
          </View>
          <View style={tw`h-2 flex-1 mx-1 bg-gray-200 rounded-full overflow-hidden`}>
            <Animated.View
              style={[tw`h-2 bg-blue-500 rounded-full`, { width: bar2Width }]}
            />
          </View>
          <View style={tw`h-2 flex-1 mx-1 bg-gray-200 rounded-full overflow-hidden`}>
            <Animated.View
              style={[tw`h-2 bg-blue-500 rounded-full`, { width: bar3Width }]}
            />
          </View>
        </View>

        {/* Headings */}
        <CustomText weight="Medium" size="xl" style={tw`mt-2`}>
          {step === 1 && "Let’s get started!"}
          {step === 2 && "Almost there!"}
          {step === 3 && "Secure your account!"}
        </CustomText>
        <CustomText size="xs" style={tw`mb-8 text-gray-500`}>
          {step === 1 && "Enter your basic details to begin your journey."}
          {step === 2 && "Provide your contact and location info."}
          {step === 3 && "Set up a strong password to protect your account."}
        </CustomText>

        {/* Step 1 */}
        {step === 1 && (
          <>
            <CustomInput
              label="First Name"
              placeholder="First name"
              value={formData.firstName}
              onChangeText={(t) => handleChange("firstName", t)}
              error={validationErrors.firstName}
              editable={!loading}
              iconName="person-outline"
            />
            <View style={tw`mt-4`}>
              <CustomInput
                label="Last Name"
                placeholder="Last name"
                value={formData.lastName}
                onChangeText={(t) => handleChange("lastName", t)}
                error={validationErrors.lastName}
                editable={!loading}
                iconName="person-outline"
              />
            </View>
            <View style={tw`mt-4 mb-4`}>
              <CustomInput
                label="Email Address"
                placeholder="Email"
                value={formData.email}
                onChangeText={(t) => handleChange("email", t)}
                error={validationErrors.email}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                iconName="mail-outline"
              />
            </View>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <CustomInput
              label="Phone Number"
              placeholder="Phone"
              value={formData.phone}
              onChangeText={(t) => handleChange("phone", t)}
              error={validationErrors.phone}
              keyboardType="phone-pad"
              editable={!loading}
              iconName="call-outline"
            />
            <View style={tw`mt-4 mb-4`}>
              <CustomInput
                label="Location"
                placeholder="Location"
                value={formData.location}
                onChangeText={(t) => handleChange("location", t)}
                error={validationErrors.location}
                editable={!loading}
                iconName="location-outline"
              />
            </View>
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            <CustomInput
              label="Password"
              placeholder="Password"
              value={formData.password}
              onChangeText={(t) => handleChange("password", t)}
              error={validationErrors.password}
              editable={!loading}
              isPassword={true}
              iconName="lock-closed-outline"
            />

            {/* 🔹 Password Strength Indicator */}
            {formData.password.length > 0 && (
              <View style={tw`mt-3 items-start`}>
                <View
                  style={tw`h-2 w-7/12 bg-gray-200 rounded-full overflow-hidden`}
                  onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
                >
                  <Animated.View
                    style={[
                      tw`h-2 rounded-full`,
                      {
                        backgroundColor: getPasswordStrength(formData.password).color,
                        width: strengthAnim,
                      },
                    ]}
                  />
                </View>
                <CustomText
                  size="xs"
                  weight="Medium"
                  style={tw`mt-1 text-${
                    getPasswordStrength(formData.password).textColor
                  }`}
                >
                  {getPasswordStrength(formData.password).label}
                </CustomText>
              </View>
            )}

            <View style={tw`mt-4 mb-4`}>
              <CustomInput
                label="Confirm Password"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(t) => handleChange("confirmPassword", t)}
                error={validationErrors.confirmPassword}
                editable={!loading}
                isPassword={true}
                iconName="lock-closed-outline"
              />
            </View>
          </>
        )}

        {/* 🔹 Navigation Buttons */}
        {step === 1 ? (
          <TouchableOpacity
            onPress={handleNext}
            style={tw`w-full mt-2 ${loading ? "bg-blue-400" : "bg-blue-500"} py-3 rounded-lg`}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <CustomText
                weight="Medium"
                color="white"
                style={tw`text-center text-[14px]`}
              >
                Next
              </CustomText>
            )}
          </TouchableOpacity>
        ) : (
          <View style={tw`flex-row items-center mt-2`}>
            <TouchableOpacity
              style={tw`bg-gray-100 w-12 h-12 rounded-lg justify-center items-center`}
              onPress={handleBack}
              disabled={loading}
            >
              <Ionicons name="chevron-back" size={22} color="#505050ff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              style={tw`flex-1 ml-3 ${loading ? "bg-blue-400" : "bg-blue-500"} py-3 rounded-lg`}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <CustomText
                  weight="Medium"
                  color="white"
                  style={tw`text-center text-[14px]`}
                >
                  {step < 3 ? "Next" : "Sign Up"}
                </CustomText>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          style={tw`mt-5`}
        >
          <CustomText style={tw`text-center text-xs`}>
            Already have an account?{" "}
            <CustomText weight="Medium" style={tw`text-xs text-blue-500`}>
              Log in
            </CustomText>
          </CustomText>
        </TouchableOpacity>
      </Animated.View>

      {/* 🔹 Error Modal */}
      <ErrorModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false)
          if (
            modalType === "info" &&
            modalMessage.includes("verify your email")
          ) {
            navigation.replace("Login")
          }
        }}
        description={modalMessage}
        type={modalType}
        showResend={
          modalType === "info" && modalMessage.includes("verify your email")
        }
        onResend={() => {
          console.log("Resend email to:", formData.email)
          showModal("Verification email resent. Please check your inbox.", "info")
        }}
      />
    </KeyboardAvoidingView>
  )
}
