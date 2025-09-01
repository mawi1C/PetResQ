import React from "react"
import { View, Animated, Dimensions } from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import HomeScreen from "../screens/mainscreens/HomeScreen"

// Create tab navigator
const Tab = createBottomTabNavigator()
const { width } = Dimensions.get("window")

// Layout constants
const tabBarWidth = width * 0.7
const paddingHorizontal = 8
const iconWidth = 45
const iconHeight = 40
const contentWidth = tabBarWidth - paddingHorizontal * 2
const tabSpacing = contentWidth / 5
const maxSafeScale = Math.min((tabSpacing / iconWidth) * 0.8, 1.3)

// 🔹 Animated Icon
const AnimatedTabIcon = ({ focused, IconComponent, iconName, iconSize = 20 }) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current
  const opacityValue = React.useRef(new Animated.Value(0.7)).current

  React.useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: focused ? Math.min(1.2, maxSafeScale) : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start()

    Animated.timing(opacityValue, {
      toValue: focused ? 1 : 0.6,
      duration: 250,
      useNativeDriver: true,
    }).start()
  }, [focused])

  return (
    <View style={{ width: iconWidth, height: iconHeight, justifyContent: "center", alignItems: "center" }}>
      <Animated.View style={{ opacity: opacityValue, transform: [{ scale: scaleValue }] }}>
        <IconComponent name={iconName} size={iconSize} color="#fff" />
      </Animated.View>
    </View>
  )
}

// 🔹 Animated Background Indicator
const AnimatedBackground = ({ state }) => {
  const translateX = React.useRef(new Animated.Value(0)).current
  const scaleX = React.useRef(new Animated.Value(1)).current

  React.useEffect(() => {
    const basePosition = paddingHorizontal
    const targetPosition = basePosition + state.index * tabSpacing + tabSpacing / 2 - iconWidth / 2
    const backgroundMaxScale = Math.min((tabSpacing / iconWidth) * 0.9, 1.15)

    Animated.parallel([
      Animated.spring(translateX, {
        toValue: targetPosition,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.sequence([
        Animated.timing(scaleX, {
          toValue: backgroundMaxScale,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleX, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [state.index])

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 7,
        left: 0,
        width: iconWidth,
        height: iconHeight,
        borderRadius: 22,
        backgroundColor: "#FAA617",
        transform: [{ translateX }, { scaleX }],
        shadowColor: "#222831",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
      }}
    />
  )
}

// 🔹 Custom TabBar UI
const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View
      style={{
        position: "absolute",
        bottom: 25,
        width: "70%",
        marginHorizontal: "15%",
        backgroundColor: "transparent",
      }}
    >
      <View
        style={{
          height: 54,
          backgroundColor: "rgba(31, 26, 37, 0.9)",
          borderRadius: 40,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 12,
          elevation: 8,
          position: "relative",
          paddingHorizontal,
        }}
      >
        <AnimatedBackground state={state} />

        <View style={{ flexDirection: "row", height: "100%", alignItems: "center", justifyContent: "space-evenly" }}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index

            const onPress = () => {
              if (!isFocused) navigation.navigate(route.name)
            }

            const icons = {
              Home: { comp: Ionicons, name: "home-outline" },
              Map: { comp: Ionicons, name: "map-outline" },
              "AI Search": { comp: MaterialCommunityIcons, name: "dog" },
              Community: { comp: Ionicons, name: "people-outline" },
              Profile: { comp: Ionicons, name: "person" },
            }

            return (
              <View
                key={route.key}
                style={{ width: iconWidth, height: iconHeight, alignItems: "center", justifyContent: "center" }}
                onTouchStart={onPress}
              >
                <AnimatedTabIcon
                  focused={isFocused}
                  IconComponent={icons[route.name].comp}
                  iconName={icons[route.name].name}
                  iconSize={20}
                />
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

// 🔹 Main Bottom Navigation (UI Only for now)
export default function BottomNav() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={HomeScreen} />
      <Tab.Screen name="AI Search" component={HomeScreen} />
      <Tab.Screen name="Community" component={HomeScreen} />
      <Tab.Screen name="Profile" component={HomeScreen} />
    </Tab.Navigator>
  )
}
