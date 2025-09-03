import React, { useState, useEffect } from "react"
import {
  ScrollView,
  View,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import tw from "twrnc"
import { Ionicons } from "@expo/vector-icons"
import { useRoute } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"
import { auth, db } from "../../firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"

import CustomText from "../../components/CustomText"
import CustomInput from "../../components/CustomInput"

export default function ReportScreen() {
  const route = useRoute()
  const { reportType } = route.params || { reportType: "lost" }

  // Form state
  const [lostData, setLostData] = useState({
    petname: "",
    species: "",
    breed: "",
    color: "",
    gender: "",
    age: "",
    lastSeenLocation: "",
    lastSeenDate: "",
    contact: "",
    image: null,
  })

  // Pets state
  const [userPets, setUserPets] = useState([])
  const [loadingPets, setLoadingPets] = useState(true)

  // Fetch user pets
  useEffect(() => {
    const user = auth.currentUser
    if (!user) {
      setLoadingPets(false)
      return
    }

    const petsQuery = query(
      collection(db, "pets"),
      where("ownerId", "==", user.uid)
    )

    const unsubscribe = onSnapshot(
      petsQuery,
      (querySnapshot) => {
        const pets = []
        querySnapshot.forEach((doc) => {
          pets.push({
            id: doc.id,
            ...doc.data(),
          })
        })
        setUserPets(pets)
        setLoadingPets(false)
      },
      (error) => {
        console.error("Error fetching pets:", error)
        setLoadingPets(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const handleInputChange = (field, value) => {
    setLostData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSelectPet = (pet) => {
    setLostData({
      petname: pet.petname || "",
      species: pet.species || "",
      breed: pet.breed || "",
      color: pet.color || "",
      gender: pet.gender || "",
      age: pet.age || "",
      lastSeenLocation: "",
      lastSeenDate: "",
      contact: "",
      image: pet.photoUrl ? { uri: pet.photoUrl } : null,
    })
  }

  const handleNewPet = () => {
    setLostData({
      petname: "",
      species: "",
      breed: "",
      color: "",
      gender: "",
      age: "",
      lastSeenLocation: "",
      lastSeenDate: "",
      contact: "",
      image: null,
    })
  }

  // --- LOST PET FORM ---
  const renderLostForm = () => (
    <KeyboardAvoidingView
      style={tw`flex-1`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={80} // adjust if needed for header height
    >
      <View style={tw`flex-1`}>
        <ScrollView
          style={tw`flex-1 p-4`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <CustomText weight="SemiBold" size="lg" style={tw`mb-6`}>
            Report Lost Pet
          </CustomText>

          {/* ==== PET SELECTOR ==== */}
          {loadingPets ? (
            <CustomText size="xs" color="#6b7280" style={tw`mb-4`}>
              Loading your pets...
            </CustomText>
          ) : userPets.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={tw`mb-6`}
            >
              {userPets.map((pet) => (
                <TouchableOpacity
                  key={pet.id}
                  style={tw`mr-3 bg-gray-100 rounded-2xl p-3 w-32 items-center`}
                  onPress={() => handleSelectPet(pet)}
                >
                  {pet.photoUrl ? (
                    <Image
                      source={{ uri: pet.photoUrl }}
                      style={tw`w-16 h-16 rounded-full mb-2`}
                    />
                  ) : (
                    <View
                      style={tw`w-16 h-16 rounded-full bg-gray-300 items-center justify-center mb-2`}
                    >
                      <Ionicons name="paw" size={24} color="#6b7280" />
                    </View>
                  )}
                  <CustomText size="xs" weight="Medium">
                    {pet.petname}
                  </CustomText>
                </TouchableOpacity>
              ))}

              {/* Add New Pet */}
              <TouchableOpacity
                style={tw`bg-white border border-dashed border-gray-400 rounded-2xl p-3 w-32 items-center justify-center`}
                onPress={handleNewPet}
              >
                <Ionicons name="add-circle" size={28} color="#6b7280" />
                <CustomText size="xs" color="#6b7280" style={tw`mt-2`}>
                  New Pet
                </CustomText>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <TouchableOpacity
              style={tw`bg-white border border-dashed border-gray-400 rounded-2xl p-4 items-center justify-center mb-6`}
              onPress={handleNewPet}
            >
              <Ionicons name="add-circle" size={28} color="#6b7280" />
              <CustomText size="xs" color="#6b7280" style={tw`mt-2`}>
                Add Your First Pet
              </CustomText>
            </TouchableOpacity>
          )}

          {/* ==== PET PHOTO ==== */}
          <CustomText size="xs" color="#6b7280" style={tw`mb-2 uppercase`}>
            Pet Photo *
          </CustomText>
          <TouchableOpacity
            style={tw`h-40 border-2 border-dashed border-gray-300 rounded-2xl items-center justify-center bg-gray-50 mb-6`}
            onPress={() => alert("Image picker not implemented yet")}
          >
            {lostData.image ? (
              <Image
                source={{ uri: lostData.image.uri || lostData.image }}
                style={tw`w-full h-full rounded-2xl`}
                resizeMode="cover"
              />
            ) : (
              <>
                <Ionicons name="camera-outline" size={32} color="#9ca3af" />
                <CustomText size="xs" color="#9ca3af" style={tw`mt-2 text-center`}>
                  Tap to upload{"\n"}pet photo
                </CustomText>
              </>
            )}
          </TouchableOpacity>

          {/* ==== PET INFO ==== */}
          <CustomText
            size="sm"
            weight="SemiBold"
            color="#374151"
            style={tw`mb-3`}
          >
            PET INFORMATION
          </CustomText>

          <View style={tw`mb-4`}>
            <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
              Pet Name *
            </CustomText>
            <CustomInput
              placeholder="Enter pet's name"
              value={lostData.petname}
              onChangeText={(t) => handleInputChange("petname", t)}
            />
          </View>

          <View style={tw`mb-4`}>
            <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
              Species *
            </CustomText>
            <CustomInput
              placeholder="Dog / Cat"
              value={lostData.species}
              onChangeText={(t) => handleInputChange("species", t)}
            />
          </View>

          <View style={tw`mb-4`}>
            <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
              Breed *
            </CustomText>
            <CustomInput
              placeholder="e.g. Labrador, Persian"
              value={lostData.breed}
              onChangeText={(t) => handleInputChange("breed", t)}
            />
          </View>

          <View style={tw`mb-4`}>
            <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
              Color / Markings *
            </CustomText>
            <CustomInput
              placeholder="e.g. Brown with white paws"
              value={lostData.color}
              onChangeText={(t) => handleInputChange("color", t)}
            />
          </View>

          <View style={tw`flex-row gap-3 mb-4`}>
            <View style={tw`flex-1`}>
              <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
                Gender *
              </CustomText>
              <CustomInput
                placeholder="Male / Female"
                value={lostData.gender}
                onChangeText={(t) => handleInputChange("gender", t)}
              />
            </View>

            <View style={tw`flex-1`}>
              <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
                Age *
              </CustomText>
              <CustomInput
                placeholder="e.g. 2 years"
                value={lostData.age}
                onChangeText={(t) => handleInputChange("age", t)}
              />
            </View>
          </View>

          {/* ==== LAST SEEN ==== */}
          <CustomText
            size="sm"
            weight="SemiBold"
            color="#374151"
            style={tw`mb-3 mt-4`}
          >
            LAST SEEN DETAILS
          </CustomText>

          <View style={tw`mb-4`}>
            <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
              Last Seen Location *
            </CustomText>
            <CustomInput
              placeholder="Street / Area"
              value={lostData.lastSeenLocation}
              onChangeText={(t) => handleInputChange("lastSeenLocation", t)}
            />
          </View>

          <View style={tw`mb-4`}>
            <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
              Last Seen Date & Time *
            </CustomText>
            <CustomInput
              placeholder="MM/DD/YYYY HH:MM"
              value={lostData.lastSeenDate}
              onChangeText={(t) => handleInputChange("lastSeenDate", t)}
            />
          </View>

          {/* Contact */}
          <View style={tw`mb-6`}>
            <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
              Contact Information *
            </CustomText>
            <CustomInput
              placeholder="Phone number or email"
              value={lostData.contact}
              onChangeText={(t) => handleInputChange("contact", t)}
            />
          </View>
        </ScrollView>

        {/* Sticky Submit Button */}
        <View style={tw`p-4 border-t border-gray-200 bg-white`}>
          <TouchableOpacity style={tw`bg-blue-600 py-3 rounded-lg`}>
            <CustomText color="white" weight="Medium" size="sm" style={tw`text-center`}>
              Submit Report
            </CustomText>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )

  const renderFoundForm = () => (
    <View style={tw`flex-1 items-center justify-center`}>
      <CustomText weight="SemiBold" size="lg" color="#374151">
        Report Found Pet (Coming Soon)
      </CustomText>
    </View>
  )

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {reportType === "lost" ? renderLostForm() : renderFoundForm()}
    </SafeAreaView>
  )
}
