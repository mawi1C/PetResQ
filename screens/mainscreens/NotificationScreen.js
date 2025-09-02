// screens/mainscreens/NotificationScreen.js
import React, { useState, useEffect } from "react"
import {
  SafeAreaView,
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native"
import tw from "twrnc"
import CustomText from "../../components/CustomText"
import { Ionicons } from "@expo/vector-icons"
import * as Notifications from "expo-notifications"
import { useNavigation } from "@react-navigation/native"

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      title: "Pet Alert!",
      body: "A new pet has been added nearby. Check it out now!",
    },
  ]) // 👈 preload with a dummy notification
  const navigation = useNavigation()

  // Listen for incoming notifications
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notif) => {
      const { title, body } = notif.request.content
      setNotifications((prev) => [
        { id: Date.now().toString(), title, body },
        ...prev,
      ])
    })

    return () => subscription.remove()
  }, [])

  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight : 0

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Header */}
      <View
        style={[
          tw`relative flex-row items-center justify-center px-4 pb-3 mt-3`,
          { paddingTop: statusBarHeight || 16 },
        ]}
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw`absolute left-4 w-10 h-10 rounded-full bg-gray-100 items-center justify-center mt-6`}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color="#313131ff" />
        </TouchableOpacity>

        {/* Centered title */}
        <CustomText style={tw`text-gray-800`} weight="Medium" size="4.5">
          Notifications
        </CustomText>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={tw`flex-grow px-5`}
        ListEmptyComponent={
          <View style={tw`flex-1 items-center justify-center`}>
            <Ionicons name="notifications-off-outline" size={50} color="#d1d5db" />
            <CustomText style={tw`mt-4 text-gray-500 text-base text-center`}>
              No notifications yet
            </CustomText>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={tw`bg-white border border-gray-200 rounded-2xl p-4 mb-3 flex-row items-start shadow-sm mt-2`}
          >
            <Ionicons
              name="notifications"
              size={20}
              color="#FAA617"
              style={tw`mr-3`}
            />
            <View style={tw`flex-1`}>
              <CustomText style={tw`text-gray-800`} size="md" weight="Medium">
                {item.title}
              </CustomText>
              <CustomText style={tw`text-gray-600 text-xs leading-5`}>
                {item.body}
              </CustomText>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  )
}
