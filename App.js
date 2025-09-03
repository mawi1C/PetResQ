import React, { useEffect, useState } from "react"
import { View, ActivityIndicator } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase"
import * as Font from "expo-font"
import tw from "twrnc"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Components
import BottomNav from "./components/BottomNav"

// Screens
import OnboardingScreen from "./screens/OnBoardingScreen"
import LoginScreen from "./screens/authscreens/LoginScreen"
import RegisterScreen from "./screens/authscreens/RegisterScreen"
import NotificationScreen from "./screens/mainscreens/NotificationScreen"
import ReportScreen from "./screens/mainscreens/ReportScreen"

const Stack = createNativeStackNavigator()

export default function App() {
  const [user, setUser] = useState(null)
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [onboardingSeen, setOnboardingSeen] = useState(null)

  const loadFonts = async () => {
    await Font.loadAsync({
      "Poppins-Regular": require("./assets/fonts/Poppins-Regular.ttf"),
      "Poppins-Medium": require("./assets/fonts/Poppins-Medium.ttf"),
      "Poppins-SemiBold": require("./assets/fonts/Poppins-SemiBold.ttf"),
    })
    setFontsLoaded(true)
  }

  const checkOnboarding = async () => {
    const seen = await AsyncStorage.getItem("onboardingSeen")
    setOnboardingSeen(seen === "true")
  }

  useEffect(() => {
    const init = async () => {
      await loadFonts()
      await checkOnboarding()

      const unsubscribe = onAuthStateChanged(auth, (authUser) => {
        if (authUser?.emailVerified) {
          setUser(authUser)
        } else {
          setUser(null)
        }
        setLoading(false)
      })

      return unsubscribe
    }

    init()
  }, [])

  if (!fontsLoaded || loading || onboardingSeen === null) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          animation: "slide_from_right",
        }}
      >
        {user ? (
          // 🔹 User logged in → show MainTabs (with Home as default tab)
          <>
            <Stack.Screen
              name="MainTabs"
              component={BottomNav}
              options={{ animation: "fade_from_bottom" }}
            />
            
            <Stack.Screen
              name="Notifications"
              component={NotificationScreen}
              options={{ animation: "slide_from_right" }}
            />

            <Stack.Screen
              name="ReportScreen"
              component={ReportScreen}
              options={{ animation: "slide_from_right" }}
            />
          </>
        ) : onboardingSeen ? (
          // 🔹 Onboarding already seen → show Auth flow
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ animation: "slide_from_left" }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ animation: "slide_from_right" }}
            />
          </>
        ) : (
          // 🔹 First time → Onboarding
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ animation: "fade" }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )

}
