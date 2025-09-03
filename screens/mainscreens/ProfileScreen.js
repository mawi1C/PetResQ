import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import tw from "twrnc";
import CustomText from "../../components/CustomText";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";

export default function ProfileScreen() {
  const [userProfile, setUserProfile] = useState({
    fullName: "Den John Cabria",
    email: "denjohncabria@gmail.com",
    phone: "0951-547-7844",
    profileImage: null,
    rescuedPets: 12,
    overallRating: 5.0,
  });

  const navigation = useNavigation();

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          setUserProfile((prev) => ({
            ...prev,
            fullName: userData.fullName || prev.fullName,
            email: userData.email || user.email || prev.email,
            phone: userData.phone || prev.phone,
            profileImage: userData.profileImage || prev.profileImage,
            rescuedPets: userData.rescuedPets || prev.rescuedPets,
            overallRating: userData.overallRating || prev.overallRating,
          }));
        }
      } catch (error) {
        console.log("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.log("Logout failed:", error);
    }
  };

  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight : 0;

  const menuItems = [
    {
      id: "myReport",
      title: "My Report",
      icon: "document-text-outline",
      iconColor: "#3B82F6",
      backgroundColor: "#EFF6FF",
      onPress: () => navigation.navigate("MyReport"),
    },
    {
      id: "messages",
      title: "Messages",
      icon: "chatbubbles-outline",
      iconColor: "#3B82F6",
      backgroundColor: "#EFF6FF",
      hasNotification: true,
      notificationCount: 2,
      onPress: () => navigation.navigate("Messages"),
    },
    {
      id: "ownerClaims",
      title: "Owner Claim's",
      icon: "checkmark-circle-outline",
      iconColor: "#3B82F6",
      backgroundColor: "#EFF6FF",
      onPress: () => navigation.navigate("OwnerClaims"),
    },
    {
      id: "settings",
      title: "Settings",
      icon: "settings-outline",
      iconColor: "#3B82F6",
      backgroundColor: "#EFF6FF",
      onPress: () => navigation.navigate("Settings"),
    },
    {
      id: "logout",
      title: "Logout",
      icon: "log-out-outline",
      iconColor: "#EF4444",
      backgroundColor: "#FEF2F2",
      onPress: handleLogout,
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: "sighting",
      title: "Sightings",
      description: "You report a sighting of a pet named Rara",
      icon: "eye-outline",
      iconColor: "#F59E0B",
      backgroundColor: "#FEF3C7",
      action: "View details",
    },
    {
      id: 2,
      type: "ai",
      title: "AI Analysis",
      description: "You started AI search of your pet named Mile",
      icon: "flash-outline",
      iconColor: "#8B5CF6",
      backgroundColor: "#F3E8FF",
      action: "View details",
    },
  ];

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* HEADER: Matches NotificationScreen */}
      <View
        style={[
          tw`relative flex-row items-center justify-center px-4 pb-3 mt-3`,
          { paddingTop: statusBarHeight || 16 },
        ]}
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw`absolute left-4 w-8 h-8 rounded-full bg-gray-100 items-center justify-center mt-6`}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#313131ff" />
        </TouchableOpacity>

        {/* Centered title */}
        <CustomText style={tw`text-gray-800`} weight="Medium" size="sm">
          Profile
        </CustomText>
      </View>

      <ScrollView style={tw`flex-1 pt-4`} showsVerticalScrollIndicator={false}>
        {/* PROFILE SECTION */}
        <View style={tw`px-4 mb-6`}>
          <View style={tw`flex-row items-center mb-4`}>
            {/* Profile Image */}
            <View style={tw`relative mr-4`}>
              {userProfile.profileImage ? (
                <Image
                  source={{ uri: userProfile.profileImage }}
                  style={tw`w-16 h-16 rounded-full`}
                />
              ) : (
                <View
                  style={tw`w-14 h-14 rounded-full bg-orange-400 items-center justify-center`}
                >
                  <CustomText size="base" weight="SemiBold" color="white">
                    {userProfile.fullName.charAt(0)}
                  </CustomText>
                </View>
              )}
            </View>

            {/* Profile Info */}
            <View style={tw`flex-1`}>
              <View style={tw`flex-row items-center mb-1`}>
                <CustomText size="sm" weight="SemiBold" color="#374151">
                  {userProfile.fullName}
                </CustomText>
                <TouchableOpacity
                  style={tw`ml-2 p-1`}
                  onPress={() => navigation.navigate("EditProfile")}
                >
                  <Ionicons name="create-outline" size={16} color="#3B82F6" />
                </TouchableOpacity>
              </View>
              <CustomText size="xs" color="#6B7280">
                Pet Owner
              </CustomText>
            </View>
          </View>

          {/* Contact Info */}
          <View style={tw`mb-6`}>
            <View style={tw`flex-row items-center mb-3`}>
              <Ionicons
                name="call-outline"
                size={16}
                color="#6B7280"
                style={tw`mr-3`}
              />
              <CustomText size="xs" color="#6c6c6cff">
                {userProfile.phone}
              </CustomText>
            </View>
            <View style={tw`flex-row items-center`}>
              <Ionicons
                name="mail-outline"
                size={16}
                color="#6B7280"
                style={tw`mr-3`}
              />
              <CustomText size="xs" color="#6c6c6cff">
                {userProfile.email}
              </CustomText>
            </View>
          </View>

          {/* Stats */}
          <View style={tw`flex-row justify-between mb-0`}>
            <View style={tw`items-center flex-1`}>
              <CustomText size="lg" weight="Bold" color="#374151">
                {userProfile.rescuedPets}
              </CustomText>
              <CustomText size="xs" color="#6B7280">
                Rescued Pet's
              </CustomText>
            </View>

            <View style={tw`w-px bg-gray-200 mx-4`} />

            <View style={tw`items-center flex-1`}>
              <View style={tw`flex-row items-center`}>
                <Ionicons
                  name="star"
                  size={16}
                  color="#F59E0B"
                  style={tw`mr-1`}
                />
                <CustomText size="lg" weight="Bold" color="#374151">
                  {userProfile.overallRating.toFixed(1)}
                </CustomText>
              </View>
              <CustomText size="xs" color="#6B7280">
                Overall Rating
              </CustomText>
            </View>
          </View>
        </View>

        {/* MENU ITEMS */}
        <View style={tw`px-4 mb-6`}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              onPress={item.onPress}
              style={tw`flex-row items-center py-4 ${
                index < menuItems.length - 1 ? "border-b border-gray-100" : ""
              }`}
              activeOpacity={0.7}
            >
              <View
                style={[
                  tw`w-10 h-10 rounded-full items-center justify-center mr-4`,
                ]}
              >
                <Ionicons name={item.icon} size={20} color={item.iconColor} />
              </View>

              <View style={tw`flex-1`}>
                <CustomText size="xs" weight="Medium" color="#374151">
                  {item.title}
                </CustomText>
              </View>

              {item.hasNotification && (
                <View
                  style={tw`bg-gray-400 rounded-full w-5 h-5 items-center justify-center mr-3`}
                >
                  <CustomText size="xs" weight="Medium" color="white">
                    {item.notificationCount}
                  </CustomText>
                </View>
              )}

              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* RECENT ACTIVITY */}
        <View style={tw`px-4 mb-6`}>
          <CustomText
            size="xs"
            weight="SemiBold"
            color="#374151"
            style={tw`mb-4`}
          >
            Recent Activity
          </CustomText>

          {recentActivities.map((activity) => (
            <View
              key={activity.id}
              style={tw`bg-white border-2 border-gray-100 rounded-2xl p-4 mb-3`}
            >
              <View style={tw`flex-row items-start`}>
                <View
                  style={[
                    tw`w-8 h-8 rounded-full items-center justify-center mr-3 rounded-lg`,
                    { backgroundColor: activity.backgroundColor },
                  ]}
                >
                  <Ionicons
                    name={activity.icon}
                    size={20}
                    color={activity.iconColor}
                  />
                </View>

                <View style={tw`flex-1`}>
                  <CustomText
                    size="xs"
                    weight="Medium"
                    color="#374151"
                    style={tw`mb-1`}
                  >
                    {activity.title}
                  </CustomText>
                  <CustomText
                    size="xs"
                    color="#6B7280"
                    style={tw`mb-2`}
                  >
                    {activity.description}
                  </CustomText>
                  <TouchableOpacity>
                    <CustomText size="xs" weight="Medium" color="#3B82F6">
                      {activity.action}
                    </CustomText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
