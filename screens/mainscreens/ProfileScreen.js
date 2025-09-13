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
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
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

  const [userPets, setUserPets] = useState([]);
  const [loadingPets, setLoadingPets] = useState(true);

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

  // Fetch user pets from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoadingPets(false);
      return;
    }

    const petsQuery = query(
      collection(db, "pets"),
      where("ownerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      petsQuery,
      (querySnapshot) => {
        const pets = [];
        querySnapshot.forEach((doc) => {
          pets.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        setUserPets(pets);
        setLoadingPets(false);
      },
      (error) => {
        console.error("Error fetching pets:", error);
        setLoadingPets(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.log("Logout failed:", error);
    }
  };

  const statusBarHeight =
    Platform.OS === "android" ? StatusBar.currentHeight : 0;

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

  // Helper function to get tag color based on attribute
  const getTagColor = (type, value) => {
    const colors = {
      gender: {
        male: { bg: "#f3f3f3ff", text: "#f58b00ff" },
        female: { bg: "#f3f3f3ff", text: "#f58b00ff" },
        default: { bg: "#f3f3f3ff", text: "#f58b00ff" },
      },
      size: {
        small: { bg: "#f3f3f3ff", text: "#f58b00ff" },
        medium: { bg: "#f3f3f3ff", text: "#f58b00ff" },
        large: { bg: "#f3f3f3ff", text: "#f58b00ff" },
        default: { bg: "#f3f3f3ff", text: "#f58b00ff" },
      },
      color: {
        default: { bg: "#f3f3f3ff", text: "#f58b00ff" },
      },
    };

    const typeColors = colors[type] || colors.color;
    return typeColors[value?.toLowerCase()] || typeColors.default;
  };

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

        {/* REGISTERED PETS SECTION */}
        <View style={tw`px-4 mb-6`}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <CustomText size="xs" weight="SemiBold" color="#374151">
              Registered Pet's
            </CustomText>
            <TouchableOpacity
              onPress={() => navigation.navigate("Home")}
              style={tw`bg-gray-800 px-4 py-2 rounded-lg`}
            >
              <CustomText size="xs" color="#fff" weight="Medium">
                Add Pet
              </CustomText>
            </TouchableOpacity>
          </View>

          {loadingPets ? (
            <View style={tw`items-center justify-center py-8`}>
              <CustomText size="xs" color="#6b7280">
                Loading your pets...
              </CustomText>
            </View>
          ) : userPets.length === 0 ? (
            <View
              style={tw`items-center justify-center py-8 border border-gray-200 rounded-xl mb-5`}
            >
              <Ionicons name="paw" size={22} color="#9ca3af" />
              <CustomText
                size="xs"
                color="#6b7280"
                style={tw`mt-2 text-center`}
              >
                No pets registered yet
              </CustomText>
              <CustomText
                size="xs"
                color="#9ca3af"
                style={tw`mt-1 text-center`}
              >
                Register your first pet to get started
              </CustomText>
            </View>
          ) : (
            userPets.map((pet) => (
              <View
                key={pet.id}
                style={tw`bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm`}
              >
                {/* Pet Header with Image, Name and Edit Button */}
                <View style={tw`flex-row items-start justify-between mb-3`}>
                  <View style={tw`flex-row items-center flex-1`}>
                    <Image
                      source={{ uri: pet.photoUrl }}
                      style={tw`w-12 h-12 rounded-full mr-3`}
                      resizeMode="cover"
                    />
                    <View style={tw`flex-1`}>
                      <CustomText
                        size="sm"
                        weight="SemiBold"
                        color="#1F2937"
                        style={tw`mb-1`}
                      >
                        {pet.petname}
                      </CustomText>
                      <CustomText size="xs" color="#6B7280">
                        {pet.breed}
                      </CustomText>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      console.log("Edit pet:", pet.id);
                    }}
                    style={tw`p-2 bg-gray-100 rounded-lg`}
                  >
                    <Ionicons name="create" size={18} color="#32302eff" />
                  </TouchableOpacity>
                </View>

                {/* Pet Info Text */}
                <CustomText
                  size="xs"
                  color="#6B7280"
                  style={tw`mb-3 leading-4`}
                >
                  {pet.features ||
                    pet.specialNeeds ||
                    pet.behavior ||
                    `${pet.species} • ${pet.age} • ${pet.color}`}
                </CustomText>

                {/* Pet Tags */}
                <View style={tw`flex-row flex-wrap`}>
                  {/* Gender Tag */}
                  {pet.gender && (
                    <View
                      style={[
                        tw`px-5 py-2 rounded-lg mr-2 mb-1 items-center`,
                        {
                          backgroundColor: getTagColor("gender", pet.gender).bg,
                        },
                      ]}
                    >
                      <CustomText
                        size="xs"
                        weight="Medium"
                        style={{
                          color: getTagColor("gender", pet.gender).text,
                        }}
                      >
                        {pet.gender}
                      </CustomText>
                      <CustomText
                        size="xs"
                        weight="Regular"
                        style={tw`text-gray-500`}
                      >
                        Gender
                      </CustomText>
                    </View>
                  )}

                  {/* Age Tag */}
                  {pet.age && (
                    <View
                      style={[
                        tw`px-5 py-2 rounded-lg mr-2 mb-1 items-center`,
                        { backgroundColor: getTagColor("size", "medium").bg },
                      ]}
                    >
                      <CustomText
                        size="xs"
                        weight="Medium"
                        style={{ color: getTagColor("size", "medium").text }}
                      >
                        {pet.age}
                      </CustomText>
                      <CustomText
                        size="xs"
                        weight="Regular"
                        style={tw`text-gray-500`}
                      >
                        Age
                      </CustomText>
                    </View>
                  )}

                  {/* Color Tag */}
                  {pet.color && (
                    <View
                      style={[
                        tw`px-5 py-2 rounded-lg mr-2 mb-1 items-center`,
                        { backgroundColor: getTagColor("color", pet.color).bg },
                      ]}
                    >
                      <CustomText
                        size="xs"
                        weight="Medium"
                        style={{ color: getTagColor("color", pet.color).text }}
                      >
                        {pet.color}
                      </CustomText>
                      <CustomText
                        size="xs"
                        weight="Regular"
                        style={tw`text-gray-500`}
                      >
                        Color
                      </CustomText>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
