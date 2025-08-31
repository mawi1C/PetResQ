import React, { useEffect, useState } from "react"
import { View, ActivityIndicator, Text } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase"
import * as Font from "expo-font"
import tw from "twrnc"

// Screens
import LoginScreen from "./screens/authscreens/LoginScreen"
import RegisterScreen from "./screens/authscreens/RegisterScreen"
import BottomNav from "./components/BottomNav"
import OnboardingScreen from "./screens/OnBoardingScreen"

const Stack = createNativeStackNavigator()

export default function App() {
  const [user, setUser] = useState(null)
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadFonts = async () => {
    await Font.loadAsync({
      "Poppins-Regular": require("./assets/fonts/Poppins-Regular.ttf"),
      "Poppins-Medium": require("./assets/fonts/Poppins-Medium.ttf"),
      "Poppins-SemiBold": require("./assets/fonts/Poppins-SemiBold.ttf"),
    })
    setFontsLoaded(true)
  }

  useEffect(() => {
    const init = async () => {
      await loadFonts()

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

  if (!fontsLoaded || loading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={tw`mt-4 text-lg`}>Loading...</Text>
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Always start with Onboarding */}
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />

        {!user && (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}

        {user && <Stack.Screen name="MainTabs" component={BottomNav} />}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
