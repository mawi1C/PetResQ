"use client"

import { TouchableOpacity, View, Image, Animated } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import tw from "twrnc"
import AsyncStorage from "@react-native-async-storage/async-storage"
import CustomText from "../components/CustomText"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useRef } from "react"

export default function OnboardingScreen({ navigation }) {
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoTranslateY = useRef(new Animated.Value(-30)).current
  const illustrationOpacity = useRef(new Animated.Value(0)).current
  const illustrationScale = useRef(new Animated.Value(0.8)).current
  const textOpacity = useRef(new Animated.Value(0)).current
  const textTranslateY = useRef(new Animated.Value(30)).current
  const buttonOpacity = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    const animateSequence = () => {
      // Logo animation
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(logoTranslateY, {
          toValue: 0,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start()

      // Illustration animation
      Animated.parallel([
        Animated.timing(illustrationOpacity, {
          toValue: 1,
          duration: 800,
          delay: 400,
          useNativeDriver: true,
        }),
        Animated.spring(illustrationScale, {
          toValue: 1,
          delay: 400,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start()

      // Text animation
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          delay: 800,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          delay: 800,
          useNativeDriver: true,
        }),
      ]).start()

      // Button animation
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 600,
          delay: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          delay: 1000,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start()
    }

    animateSequence()
  }, [])

  const finishAndGo = async (screen) => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()

    await AsyncStorage.setItem("onboardingSeen", "true")
    navigation.replace(screen)
  }

  return (
    <View style={tw`flex-1 bg-white`}>
      <SafeAreaView style={tw`flex-1 px-6`}>
        {/* Logo Header */}
        <Animated.View
          style={[
            tw`pt-8 pb-4`,
            {
              opacity: logoOpacity,
              transform: [{ translateY: logoTranslateY }],
            },
          ]}
        >
          <View style={tw`items-center`}>
            <View
              style={tw`bg-white border border-blue-400 rounded-2xl px-6 py-3 flex-row items-center`}
            >
              <View style={tw`w-6 h-6 items-center justify-center mr-3`}>
                <Image 
                  source={require("../assets/images/logo2.png")} 
                  style={tw`w-10 h-10`} 
                  resizeMode="contain" 
                />
              </View>
              <CustomText fontWeight="400" style={tw`text-gray-800 text-base`}>
                PetResQ
              </CustomText>
            </View>
          </View>
        </Animated.View>

        {/* Main Content Container */}
        <View style={tw`flex-1 justify-between`}>
          {/* Illustration */}
          <Animated.View
            style={[
              tw`flex-1 justify-center items-center px-4`,
              {
                opacity: illustrationOpacity,
                transform: [{ scale: illustrationScale }],
              },
            ]}
          >
            <Image
              source={require("../assets/images/onboarding.png")}
              style={tw`w-80 h-64`}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Text Content */}
          <Animated.View
            style={[
              tw`px-4 pb-8`,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            {/* Main Heading */}
            <View style={tw`mb-6`}>
              <CustomText style={tw`text-center leading-tight mb-2`}>
                <CustomText size="2xl" style={tw`text-blue-500`}> Home</CustomText>
                <CustomText size="2xl" style={tw`text-gray-800`}> is where their</CustomText>
              </CustomText>
              <CustomText style={tw`text-center leading-tight`}>
                <CustomText size="2xl" style={tw`text-blue-500`}> heart</CustomText>
                <CustomText size="2xl" style={tw`text-gray-800`}> waits.</CustomText>
              </CustomText>
            </View>

            {/* Subtitle */}
            <CustomText style={tw`text-center text-gray-600 text-xs leading-relaxed mb-8`}>
              Guided by kindness and community, we help reunite pets with their families.
            </CustomText>

            {/* Button and Footer Text */}
            <Animated.View
              style={[
                {
                  opacity: buttonOpacity,
                  transform: [{ scale: buttonScale }],
                },
              ]}
            >
              <TouchableOpacity
                style={tw`bg-blue-500 py-4 rounded-2xl items-center mb-4 shadow-sm`}
                onPress={() => finishAndGo("Register")}
                activeOpacity={0.8}
              >
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="log-in-outline" size={20} color="white" style={tw`mr-2`} />
                  <CustomText style={tw`text-white text-xs`} weight="Medium">
                    Join Community
                  </CustomText>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  )
}