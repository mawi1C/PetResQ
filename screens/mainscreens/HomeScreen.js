import React, { useEffect, useState, useRef } from "react"
import {
  SafeAreaView,
  View,
  TouchableOpacity,
  StatusBar,
  Platform,
  Animated,
} from "react-native"
import tw from "twrnc"
import CustomText from "../../components/CustomText"
import { Ionicons } from "@expo/vector-icons"
import { signOut } from "firebase/auth"
import { auth, db } from "../../firebase"
import { doc, getDoc } from "firebase/firestore"

export default function HomeScreen() {
  const [firstName, setFirstName] = useState("Friend")
  const [greeting, setGreeting] = useState("")
  const [greetingDesc, setGreetingDesc] = useState("")

  // Animated values
  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(-20)).current // start slightly left

  // Descriptions to cycle
  const descriptions = [
    "Let’s help pets find home",
    "Together, let’s reunite pets & families",
    "Caring for pets, caring for families",
    "Every pet deserves a loving home",
  ]
  const descIndex = useRef(0)

  // Fetch user name
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const user = auth.currentUser
        if (!user) return
        const docRef = doc(db, "users", user.uid)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const fullName = docSnap.data().fullName || "Friend"
          const first = fullName.split(" ")[0]
          setFirstName(first)
        }
      } catch (error) {
        console.log("Error fetching user name:", error)
      }
    }
    fetchUserName()
  }, [])

  // Greeting based on time
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      setGreeting("Good Morning")
    } else if (hour >= 12 && hour < 18) {
      setGreeting("Good Afternoon")
    } else {
      setGreeting("Good Evening")
    }
  }, [])

  // Animate + cycle descriptions every 7s with slide fade
  useEffect(() => {
    const cycleDescriptions = () => {
      // increment index first
      descIndex.current = (descIndex.current + 1) % descriptions.length
      setGreetingDesc(descriptions[descIndex.current])

      // reset positions
      fadeAnim.setValue(0)
      slideAnim.setValue(-20) // start left

      // animate slide + fade
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start()
    }

    // first description immediately
    setGreetingDesc(descriptions[0])
    fadeAnim.setValue(1)
    slideAnim.setValue(0)

    const interval = setInterval(cycleDescriptions, 7000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.log("Logout failed:", error)
    }
  }

  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight : 0

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <View
        style={[
          tw`flex-row justify-between items-center px-4`,
          { paddingTop: statusBarHeight || 16 },
        ]}
      >
        {/* Greeting */}
        <View style={tw`mt-3`}>
          <CustomText style={tw`text-gray-800`} size="4.5" weight="Medium">
            {greeting}, {firstName} 👋
          </CustomText>

          {/* Slide + Fade Animated Description */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            }}
          >
            <CustomText style={tw`text-sm text-gray-600`}>
              {greetingDesc}
            </CustomText>
          </Animated.View>
        </View>

        {/* Notification Icon */}
        <TouchableOpacity
          style={tw`w-12 h-12 rounded-full bg-gray-100 items-center justify-center mt-3`}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications" size={22} color="#252525ff" />
        </TouchableOpacity>
      </View>

      <View style={tw`flex-1 justify-center items-center`}>
        <CustomText style={tw`text-base text-gray-600 mt-2`}>
          Welcome to your app!
        </CustomText>

        <TouchableOpacity
          onPress={handleLogout}
          style={tw`mt-8 flex-row items-center bg-red-500 px-4 py-2 rounded-lg`}
          activeOpacity={0.8}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color="white"
            style={tw`mr-2`}
          />
          <CustomText weight="Medium" color="white">
            Logout
          </CustomText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
