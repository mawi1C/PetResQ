"use client"

import { useState, useEffect, useRef } from "react"
import {
  SafeAreaView,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Animated,
  StatusBar,
} from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"
import tw from "twrnc"
import CustomText from "../components/CustomText"

const { width, height } = Dimensions.get("window")

const slides = [
  {
    id: "1",
    title: "Welcome to PetResQ",
    description: "Join thousands of pet lovers helping lost pets find their way back home safely.",
    image: require("../assets/images/img1.jpg"),
    icon: "heart",
    color: "#2563EB",
    bgGradient: ["#2563EB", "#7C3AED"],
  },
  {
    id: "2",
    title: "Report & Rescue",
    description: "Instantly report lost or found pets with location tracking and real-time alerts.",
    image: require("../assets/images/img1.jpg"),
    icon: "location",
    color: "#EA580C",
    bgGradient: ["#EA580C", "#059669"],
  },
  {
    id: "3",
    title: "Community Heroes",
    description: "Connect with local volunteers and be part of life-saving rescue missions.",
    image: require("../assets/images/img1.jpg"),
    icon: "people",
    color: "#059669",
    bgGradient: ["#059669", "#7C3AED"],
  },
]

export default function OnboardingScreen({ navigation }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(true)
  const flatListRef = useRef(null)

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const buttonScale = useRef(new Animated.Value(1)).current
  const iconRotation = useRef(new Animated.Value(0)).current

  useEffect(() => {
    setLoading(false)

    // Initial entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start()

    // Icon rotation animation
    const rotateIcon = () => {
      Animated.sequence([
        Animated.timing(iconRotation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(iconRotation, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start(() => rotateIcon())
    }
    rotateIcon()
  }, [])

  // Animate slide changes
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()
  }, [currentSlide])

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width)
    setCurrentSlide(slideIndex)
  }

  const finishAndGo = async (screen) => {
    // Button press animation
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

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentSlide + 1, animated: true })
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      flatListRef.current?.scrollToIndex({ index: currentSlide - 1, animated: true })
    }
  }

  const Slide = ({ item, index }) => {
    const isActive = index === currentSlide
    const spin = iconRotation.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    })

    return (
      <Animated.View
        style={[
          tw`w-[${width}px] items-center justify-center px-8`,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            tw`absolute inset-0 opacity-5`,
            {
              background: `linear-gradient(135deg, ${item.bgGradient[0]}, ${item.bgGradient[1]})`,
              transform: [{ rotate: spin }],
            },
          ]}
        >
          <Ionicons name={item.icon} size={300} color={item.color} />
        </Animated.View>

        <Animated.View
          style={[
            tw`mb-8 rounded-3xl overflow-hidden border-2 border-black`,
            {
              transform: [{ scale: isActive ? 1 : 0.9 }],
            },
          ]}
        >
          <Image source={item.image} style={tw`w-80 h-52`} resizeMode="cover" />
          <View
            style={[
              tw`absolute inset-0 rounded-3xl`,
              {
                background: `linear-gradient(45deg, ${item.color}20, transparent 60%)`,
              },
            ]}
          />
        </Animated.View>

        <View style={tw`items-center px-4`}>
          <CustomText weight="SemiBold" style={[tw`text-3xl text-center mb-4`, { color: "#1F2937" }]}>
            {item.title}
          </CustomText>
          <CustomText style={[tw`text-lg text-center leading-7`, { color: "#4B5563" }]}>{item.description}</CustomText>
        </View>

        <View style={tw`flex-row mt-6 px-4`}>
          <View style={tw`flex-row items-center mr-6 bg-green-50 px-3 py-2 rounded-full`}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <CustomText style={tw`ml-2 text-sm text-gray-700 font-medium`}>Free to use</CustomText>
          </View>
          <View style={tw`flex-row items-center bg-violet-50 px-3 py-2 rounded-full`}>
            <Ionicons name="shield-checkmark" size={20} color="#7C3AED" />
            <CustomText style={tw`ml-2 text-sm text-gray-700 font-medium`}>Safe & Secure</CustomText>
          </View>
        </View>
      </Animated.View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 items-center justify-center bg-gray-50`}>
        <ActivityIndicator size="large" color="#2563EB" />
        <CustomText style={tw`mt-4 text-gray-600`}>Loading PetResQ...</CustomText>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: "#F8FAFC" }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <TouchableOpacity
        style={[
          tw`absolute top-12 right-6 z-10 px-4 py-2 rounded-full border`,
          {
            backgroundColor: "#FFFFFF",
            borderColor: "#7C3AED30",
          },
        ]}
        onPress={() => finishAndGo("Login")}
      >
        <CustomText style={tw`text-gray-600 text-base font-medium`}>Skip</CustomText>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={({ item, index }) => <Slide item={item} index={index} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        keyExtractor={(item) => item.id}
        scrollEventThrottle={16}
      />

      <View style={tw`absolute top-1/2 left-4 right-4 flex-row justify-between`}>
        {currentSlide > 0 && (
          <TouchableOpacity
            style={[
              tw`p-3 rounded-full shadow-lg border`,
              {
                backgroundColor: "#FFFFFF",
                borderColor: "#00000020",
              },
            ]}
            onPress={prevSlide}
          >
            <Ionicons name="chevron-back" size={24} color="#2563EB" />
          </TouchableOpacity>
        )}
        <View style={tw`flex-1`} />
        {currentSlide < slides.length - 1 && (
          <TouchableOpacity
            style={[
              tw`p-3 rounded-full shadow-lg border`,
              {
                backgroundColor: "#FFFFFF",
                borderColor: "#00000020",
              },
            ]}
            onPress={nextSlide}
          >
            <Ionicons name="chevron-forward" size={24} color="#2563EB" />
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom section */}
      <View style={tw`pb-8 px-6`}>
        {/* Enhanced dots indicator */}
        <View style={tw`flex-row justify-center mb-8`}>
          {slides.map((slide, index) => (
            <Animated.View
              key={index}
              style={[
                tw`h-2 rounded-full mx-1`,
                {
                  width: index === currentSlide ? 24 : 8,
                  backgroundColor: index === currentSlide ? slide.color : "#E5E5E5",
                },
              ]}
            />
          ))}
        </View>

        <View style={tw`flex-row justify-between`}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[
                tw`bg-white border-2 border-gray-200 py-4 px-8 rounded-2xl flex-row items-center shadow-lg`,
                {
                  backgroundColor: "#FFFFFF",
                  borderColor: "#000000",
                },
              ]}
              onPress={() => finishAndGo("Login")}
            >
              <Ionicons name="log-in-outline" size={20} color="#000000" />
              <CustomText weight="Medium" style={tw`text-black text-base ml-2`}>
                Login
              </CustomText>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[
                tw`py-4 px-8 rounded-2xl flex-row items-center shadow-xl`,
                {
                  background: `linear-gradient(135deg, ${slides[currentSlide].color}, #7C3AED)`,
                  backgroundColor: slides[currentSlide].color,
                },
              ]}
              onPress={() => finishAndGo("Register")}
            >
              <Ionicons name="person-add-outline" size={20} color="white" />
              <CustomText weight="SemiBold" style={tw`text-white text-base ml-2`}>
                Get Started
              </CustomText>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={tw`flex-row justify-center items-center mt-6 opacity-80`}>
          <View style={tw`flex-row items-center bg-blue-50 px-3 py-1 rounded-full mr-3`}>
            <Ionicons name="people" size={16} color="#2563EB" />
            <CustomText style={tw`text-xs text-blue-700 ml-1 font-medium`}>10K+ Users</CustomText>
          </View>
          <View style={tw`flex-row items-center bg-orange-50 px-3 py-1 rounded-full mr-3`}>
            <Ionicons name="star" size={16} color="#EA580C" />
            <CustomText style={tw`text-xs text-orange-700 ml-1 font-medium`}>4.8 Rating</CustomText>
          </View>
          <View style={tw`flex-row items-center bg-green-50 px-3 py-1 rounded-full`}>
            <Ionicons name="shield-checkmark" size={16} color="#059669" />
            <CustomText style={tw`text-xs text-green-700 ml-1 font-medium`}>Verified Safe</CustomText>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}
