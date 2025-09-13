import React, { useState, useEffect, useRef } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
} from "react-native";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { auth, db } from "../../firebase";
import {
  collection,
  query,
  doc,
  getDoc,
  where,
  onSnapshot,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import moment from "moment";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import CustomText from "../../components/CustomText";
import CustomInput from "../../components/CustomInput";
import CustomModal from "../../components/CustomModal";
import {
  reportLostPet,
  reportFoundPet,
  registerPet,
} from "../../utils/PetService";

export default function ReportScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { reportType } = route.params || { reportType: "lost" };

  const [lostData, setLostData] = useState({
    petname: "",
    species: "",
    breed: "",
    color: "",
    gender: "",
    age: "",
    size: "",
    features: "",
    health: "",
    behavior: "",
    reward: "",
    specialNeeds: "",
    lastSeenLocation: "",
    lastSeenDate: null,
    contact: "",
    images: [],
    isRegistered: false,
    coordinates: null, // 👈 new
  });

  const [foundData, setFoundData] = useState({
    species: "",
    breed: "",
    color: "",
    gender: "",
    age: "",
    size: "",
    features: "",
    health: "",
    behavior: "",
    foundLocation: "",
    coordinates: null,
    foundDate: null,
    contact: accountPhone || "",
    currentLocation: "",
    availability: "",
    images: [],
  });

  // Breed modal state (moved to main component level)
  const [breedModalVisible, setBreedModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCustomBreedInput, setShowCustomBreedInput] = useState(false);
  const [customBreed, setCustomBreed] = useState("");

  // Breed data (same as HomeScreen)
  const dogBreeds = [
    "Labrador Retriever",
    "German Shepherd",
    "Golden Retriever",
    "Bulldog",
    "Beagle",
    "Poodle",
    "Rottweiler",
    "Yorkshire Terrier",
    "Dachshund",
    "Boxer",
    "Siberian Husky",
    "Doberman Pinscher",
    "Great Dane",
    "Shih Tzu",
    "Chihuahua",
    "Pomeranian",
    "Australian Shepherd",
    "Border Collie",
    "Cocker Spaniel",
    "Maltese",
    "French Bulldog",
    "Boston Terrier",
    "Pug",
    "Akita",
    "Basset Hound",
    "Saint Bernard",
    "Bernese Mountain Dog",
    "Cavalier King Charles Spaniel",
    "English Springer Spaniel",
    "Welsh Corgi",
    "Dalmatian",
    "Samoyed",
    "Bullmastiff",
    "Newfoundland",
    "Alaskan Malamute",
    "Irish Setter",
    "Weimaraner",
    "Papillon",
    "Whippet",
    "Scottish Terrier",
    "Jack Russell Terrier",
    "Staffordshire Bull Terrier",
    "American Pit Bull Terrier",
    "Havanese",
    "Shiba Inu",
    "Lhasa Apso",
    "Collie",
    "Chow Chow",
    "Bloodhound",
    "Vizsla",
  ];

  const catBreeds = [
    "Persian",
    "Siamese",
    "Maine Coon",
    "Bengal",
    "Ragdoll",
    "British Shorthair",
    "Sphynx",
    "Abyssinian",
    "Scottish Fold",
    "Birman",
    "Russian Blue",
    "Oriental Shorthair",
    "Norwegian Forest Cat",
    "Savannah",
    "American Shorthair",
    "Devon Rex",
    "Exotic Shorthair",
    "Turkish Angora",
    "Tonkinese",
    "Egyptian Mau",
    "Cornish Rex",
    "Balinese",
    "Himalayan",
    "Japanese Bobtail",
    "Manx",
    "Chartreux",
    "Singapura",
    "Turkish Van",
    "Somali",
    "Burmese",
    "Ocicat",
    "Selkirk Rex",
    "American Curl",
    "Bombay",
    "Snowshoe",
    "Pixie-Bob",
    "LaPerm",
    "Korat",
    "Nebelung",
    "Colorpoint Shorthair",
    "Peterbald",
    "Cymric",
    "British Longhair",
    "Havana Brown",
    "Oriental Longhair",
    "Serengeti",
    "Chausie",
    "Highlander",
    "Ragamuffin",
  ];

  useEffect(() => {
    const getUserLocation = async () => {
      try {
        setLocating(true);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Location permission not granted");
          setLocating(false);
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        handleInputChange("coordinates", { latitude, longitude });
      } catch (error) {
        console.error("Error getting location:", error);
      } finally {
        setLocating(false);
      }
    };

    if (!lostData.coordinates) {
      getUserLocation();
    }
  }, []);

  // Compute filtered breeds safely
  const filteredBreeds = (
    lostData.species === "Dog" ? dogBreeds : catBreeds
  ).filter((breed) => breed.toLowerCase().includes(searchQuery.toLowerCase()));

  // Function to handle breed selection (moved to main component level)
  const handleBreedSelection = (breed, formType) => {
    if (formType === "lost") {
      handleInputChange("breed", breed);
    } else {
      // For found form, we need to update foundData
      setFoundData((prev) => ({ ...prev, breed: breed }));
    }
    setBreedModalVisible(false);
    setSearchQuery("");
    setShowCustomBreedInput(false);
    setCustomBreed("");
  };

  const handleCustomBreedSubmit = (formType) => {
    if (customBreed.trim()) {
      handleBreedSelection(customBreed.trim(), formType);
    }
  };

  const [accountPhone, setAccountPhone] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const fetchPhone = async () => {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setAccountPhone(userDoc.data().phone || "");
        }
      };
      fetchPhone();
    }
  }, []);

  const [userPets, setUserPets] = useState([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("success");

  const checkIfPetIsRegistered = async (petName) => {
    const user = auth.currentUser;
    if (!user) return false;

    const petsRef = collection(db, "pets");
    const q = query(
      petsRef,
      where("ownerId", "==", user.uid),
      where("petname", "==", petName)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty; // true if at least 1 match found
  };

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
          pets.push({ id: doc.id, ...doc.data() });
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

  const handleInputChange = (field, value) => {
    setLostData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSelectPet = (pet) => {
    // Generate a unique filename for the image to avoid Cloudinary duplicates
    const timestamp = Date.now();
    const uniqueSuffix = Math.random().toString(36).substring(2, 9);

    let modifiedImageUri = pet.photoUrl;
    if (pet.photoUrl) {
      // Add query parameters to make the URI unique
      const separator = pet.photoUrl.includes("?") ? "&" : "?";
      modifiedImageUri = `${pet.photoUrl}${separator}timestamp=${timestamp}&uid=${uniqueSuffix}`;
    }

    setLostData((prev) => ({
      ...prev,
      petname: pet.petname || "",
      species: pet.species || "",
      breed: pet.breed || "",
      color: pet.color || "",
      gender: pet.gender || "",
      age: pet.age || "",
      size: pet.size || "",
      features: pet.features || "",
      health: pet.health || "",
      behavior: pet.behavior || "",
      specialNeeds: pet.specialNeeds || "",
      images: pet.photoUrl ? [{ uri: modifiedImageUri }] : [],
      isRegistered: true,
    }));
  };

  const pickImages = async () => {
    if (lostData.images.length >= 3) {
      alert("Maximum 3 images allowed");
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission required to access photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setLostData((prev) => ({
        ...prev,
        images: [...prev.images, result.assets[0]],
      }));
    }
  };

  const removeImage = (index) => {
    setLostData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const errors = {};
    if (!lostData.petname.trim()) errors.petname = "Pet name is required";
    if (!lostData.species) errors.species = "Species is required";
    if (!lostData.breed.trim()) errors.breed = "Breed is required";
    if (!lostData.color.trim()) errors.color = "Color/markings is required";
    if (!lostData.gender) errors.gender = "Gender is required";
    if (!lostData.lastSeenLocation.trim())
      errors.lastSeenLocation = "Location is required";
    if (!lostData.lastSeenDate) errors.lastSeenDate = "Date is required";
    if (!lostData.contact.trim())
      errors.contact = "Contact information is required";
    if (lostData.images.length === 0)
      errors.images = "At least one photo is required";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setModalType("error");
      setErrorMessage("Please fill in all required fields before submitting.");
      setShowModal(true);
      return;
    }

    if (submitting) return;

    try {
      setSubmitting(true);

      const isActuallyRegistered = await checkIfPetIsRegistered(
        lostData.petname
      );

      const dataToSubmit = {
        ...lostData,
        lastSeenDate: Timestamp.fromDate(lostData.lastSeenDate),
      };

      await reportLostPet(dataToSubmit);

      // ✅ If no duplicate was thrown, continue as normal
      if (isActuallyRegistered) {
        setModalType("finalSuccess");
      } else {
        setModalType("reminder");
      }

      setShowModal(true);
    } catch (error) {
      if (error.message === "DUPLICATE_REPORT") {
        // 🚨 Special handling for duplicate reports
        setModalType("duplicate");
        setShowModal(true);
      } else {
        setModalType("error");
        setErrorMessage(
          error.message || "Failed to submit report. Please try again."
        );
        setShowModal(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterNow = async () => {
    try {
      const petData = {
        ...lostData,
        image: lostData.images[0],
      };
      await registerPet(petData);
      setModalType("finalSuccess");
    } catch (error) {
      alert(error.message || "Failed to register pet");
    }
  };

  const renderPetCard = (pet) => (
    <TouchableOpacity
      key={pet.id}
      style={tw`w-40 mr-4`}
      onPress={() => handleSelectPet(pet)}
    >
      <View style={tw`bg-gray-800 rounded-2xl p-4 flex-row items-center`}>
        {/* Left: Pet Image */}
        {pet.photoUrl ? (
          <Image
            source={{ uri: pet.photoUrl }}
            style={tw`w-12 h-12 rounded-full mr-4`}
            resizeMode="cover"
          />
        ) : (
          <View
            style={tw`w-16 h-16 rounded-full bg-gray-600 items-center justify-center mr-4`}
          >
            <Ionicons name="paw" size={24} color="#9ca3af" />
          </View>
        )}

        {/* Right: Pet Info */}
        <View style={tw`flex-1`}>
          <CustomText size="xs" color="#9ca3af" style={tw`mb-1`}>
            Your {pet.species?.toLowerCase()}
          </CustomText>
          <CustomText size="xs" weight="SemiBold" color="white">
            {pet.petname}
          </CustomText>
        </View>
      </View>
    </TouchableOpacity>
  );

  const statusBarHeight =
    Platform.OS === "android" ? StatusBar.currentHeight : 0;

  const renderLostForm = () => (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Header */}
      <View
        style={[
          tw`flex-row items-center justify-between px-4 py-3 mt-1`,
          { paddingTop: statusBarHeight || 12 },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw`w-8 h-8 rounded-full bg-gray-800 items-center justify-center`}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={tw`flex-1 items-center`}>
          <CustomText size="base" weight="Medium" color="#1f2937">
            Report Lost Pet
          </CustomText>
        </View>
        <View style={tw`w-10`} />
      </View>

      {/* Main Content */}
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0} // adjust this to match header height
      >
        <ScrollView
          style={tw`flex-1 p-4`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={tw`pb-32`} // space for button
        >
          {/* Select Your Pet Section */}
          {!loadingPets && userPets.length > 0 && (
            <View style={tw`mb-6`}>
              <CustomText
                weight="SemiBold"
                size="sm"
                color="#1f2937"
                style={tw`mb-4`}
              >
                Select Your Pet
              </CustomText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw`pr-4`}
              >
                {userPets.map(renderPetCard)}
              </ScrollView>
            </View>
          )}

          {/* Pet Photos Section */}
          <View style={tw`mb-6 mt-4`}>
            <CustomText
              weight="SemiBold"
              size="sm"
              color="#1f2937"
              style={tw`mb-4`}
            >
              Pet Photos
            </CustomText>
            <View style={tw`p-4 bg-white rounded-2xl border border-gray-200`}>
              <View style={tw`flex-row flex-wrap gap-3 mb-3`}>
                {lostData.images.map((img, index) => (
                  <View key={index} style={tw`relative`}>
                    <Image
                      source={{ uri: img.uri }}
                      style={tw`w-24 h-24 rounded-xl`}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={tw`absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm`}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                {lostData.images.length < 3 && (
                  <TouchableOpacity
                    style={tw`w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl items-center justify-center bg-gray-50`}
                    onPress={pickImages}
                  >
                    <Ionicons name="camera-outline" size={24} color="#9ca3af" />
                    <CustomText size="2.5" color="#9ca3af" style={tw`mt-1`}>
                      Add
                    </CustomText>
                  </TouchableOpacity>
                )}
              </View>

              <CustomText size="xs" color="#6b7280">
                Add up to 3 recent photos of your pet
              </CustomText>
              {validationErrors.images && (
                <CustomText size="xs" color="#ef4444" style={tw`mt-1`}>
                  {validationErrors.images}
                </CustomText>
              )}
            </View>
          </View>

          {/* Pet Information Section */}
          <View style={tw`mb-6`}>
            <CustomText
              weight="SemiBold"
              size="sm"
              color="#1f2937"
              style={tw`mb-4`}
            >
              Pet Information
            </CustomText>
            <View style={tw`p-4 bg-white rounded-2xl border border-gray-200`}>
              {/* Pet Name */}
              <View style={tw`mb-4`}>
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-2 uppercase`}
                >
                  Pet Name *
                </CustomText>
                <CustomInput
                  placeholder="Enter pet's name"
                  value={lostData.petname}
                  onChangeText={(text) => handleInputChange("petname", text)}
                  error={validationErrors.petname}
                />
              </View>

              {/* Species */}
              <View style={tw`mb-4`}>
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-2 uppercase`}
                >
                  Species *
                </CustomText>
                <View style={tw`flex-row gap-3`}>
                  {["Dog", "Cat"].map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => handleInputChange("species", option)}
                      style={[
                        tw`flex-1 py-3 rounded-xl border-2 items-center justify-center`,
                        {
                          borderColor:
                            lostData.species === option ? "#2A80FD" : "#e5e7eb",
                          backgroundColor:
                            lostData.species === option ? "#eff6ff" : "#f9fafb",
                        },
                      ]}
                    >
                      <CustomText
                        size="xs"
                        weight={
                          lostData.species === option ? "SemiBold" : "Medium"
                        }
                        color={
                          lostData.species === option ? "#2A80FD" : "#6b7280"
                        }
                      >
                        {option}
                      </CustomText>
                    </TouchableOpacity>
                  ))}
                </View>
                {validationErrors.species && (
                  <CustomText size="xs" color="#ef4444" style={tw`mt-1`}>
                    {validationErrors.species}
                  </CustomText>
                )}
              </View>

              {/* Breed Selector */}
              <View style={tw`mb-4`}>
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-2 uppercase`}
                >
                  BREED *
                </CustomText>
                {validationErrors.breed && (
                  <CustomText size="xs" color="red" style={tw`mb-1`}>
                    {validationErrors.breed}
                  </CustomText>
                )}
                <TouchableOpacity
                  onPress={() => lostData.species && setBreedModalVisible(true)}
                  style={[
                    tw`p-4 rounded-xl flex-row items-center justify-between`,
                    {
                      backgroundColor: !lostData.species
                        ? "#f3f4f6"
                        : "#f9fafb",
                      borderWidth: 1,
                      borderColor: validationErrors.breed ? "red" : "#e5e7eb",
                    },
                  ]}
                  disabled={!lostData.species}
                >
                  <CustomText
                    size="xs"
                    color={lostData.breed ? "#1f2937" : "#9ca3af"}
                    weight={lostData.breed ? "Medium" : "Regular"}
                  >
                    {lostData.breed ||
                      (lostData.species
                        ? `Select ${lostData.species.toLowerCase()} breed`
                        : "Select species first")}
                  </CustomText>
                  <Ionicons name="create-outline" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Color + Features */}
              {[
                ["color", "Color / Markings *", "e.g. Brown with white paws"],
                [
                  "features",
                  "Distinguishing Features",
                  "e.g. Scar on ear, collar details",
                ],
                [
                  "specialNeeds",
                  "Special Needs",
                  "e.g. Needs medication, allergic to fish food",
                ],
              ].map(([field, label, placeholder]) => (
                <View style={tw`mb-4`} key={field}>
                  <CustomText
                    size="xs"
                    color="#6b7280"
                    style={tw`mb-2 uppercase`}
                  >
                    {label}
                  </CustomText>
                  <CustomInput
                    placeholder={placeholder}
                    value={lostData[field]}
                    onChangeText={(text) => handleInputChange(field, text)}
                    error={validationErrors[field]}
                    multiline={field === "features"}
                    numberOfLines={field === "features" ? 3 : 1}
                  />
                </View>
              ))}

              {/* Gender */}
              <View style={tw`mb-4`}>
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-2 uppercase`}
                >
                  Gender *
                </CustomText>
                <View style={tw`flex-row gap-3`}>
                  {["Male", "Female"].map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => handleInputChange("gender", option)}
                      style={[
                        tw`flex-1 py-3 rounded-xl border-2 items-center justify-center`,
                        {
                          borderColor:
                            lostData.gender === option ? "#2A80FD" : "#e5e7eb",
                          backgroundColor:
                            lostData.gender === option ? "#eff6ff" : "#f9fafb",
                        },
                      ]}
                    >
                      <CustomText
                        size="xs"
                        weight={
                          lostData.gender === option ? "SemiBold" : "Medium"
                        }
                        color={
                          lostData.gender === option ? "#2A80FD" : "#6b7280"
                        }
                      >
                        {option}
                      </CustomText>
                    </TouchableOpacity>
                  ))}
                </View>
                {validationErrors.gender && (
                  <CustomText size="xs" color="#ef4444" style={tw`mt-1`}>
                    {validationErrors.gender}
                  </CustomText>
                )}
              </View>

              {/* Age & Size */}
              <View style={tw`flex-row gap-3 mb-4`}>
                <View style={tw`flex-1`}>
                  <CustomText
                    size="xs"
                    color="#6b7280"
                    style={tw`mb-2 uppercase`}
                  >
                    Age
                  </CustomText>
                  <View style={tw`gap-2`}>
                    {["Puppy/Kitten", "Adult", "Senior"].map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => handleInputChange("age", option)}
                        style={[
                          tw`px-3 py-2 rounded-lg border`,
                          {
                            borderColor:
                              lostData.age === option ? "#2A80FD" : "#e5e7eb",
                            backgroundColor:
                              lostData.age === option ? "#eff6ff" : "#f9fafb",
                          },
                        ]}
                      >
                        <CustomText
                          size="xs"
                          weight={
                            lostData.age === option ? "SemiBold" : "Medium"
                          }
                          color={
                            lostData.age === option ? "#2A80FD" : "#6b7280"
                          }
                          style={tw`text-center`}
                        >
                          {option}
                        </CustomText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={tw`flex-1`}>
                  <CustomText
                    size="xs"
                    color="#6b7280"
                    style={tw`mb-2 uppercase`}
                  >
                    Size
                  </CustomText>
                  <View style={tw`gap-2`}>
                    {["Small", "Medium", "Large"].map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => handleInputChange("size", option)}
                        style={[
                          tw`px-3 py-2 rounded-lg border`,
                          {
                            borderColor:
                              lostData.size === option ? "#2A80FD" : "#e5e7eb",
                            backgroundColor:
                              lostData.size === option ? "#eff6ff" : "#f9fafb",
                          },
                        ]}
                      >
                        <CustomText
                          size="xs"
                          weight={
                            lostData.size === option ? "SemiBold" : "Medium"
                          }
                          color={
                            lostData.size === option ? "#2A80FD" : "#6b7280"
                          }
                          style={tw`text-center`}
                        >
                          {option}
                        </CustomText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Behavior */}
              <View style={tw`mb-4`}>
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-2 uppercase`}
                >
                  Pet Behavior
                </CustomText>
                <View style={tw`flex-row flex-wrap gap-2`}>
                  {["Friendly", "Aggressive", "Energetic", "Shy", "Calm"].map(
                    (option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => handleInputChange("behavior", option)}
                        style={[
                          tw`px-3 py-2 rounded-lg border`,
                          {
                            borderColor:
                              lostData.behavior === option
                                ? "#2A80FD"
                                : "#e5e7eb",
                            backgroundColor:
                              lostData.behavior === option
                                ? "#eff6ff"
                                : "#f9fafb",
                          },
                        ]}
                      >
                        <CustomText
                          size="xs"
                          weight={
                            lostData.behavior === option ? "SemiBold" : "Medium"
                          }
                          color={
                            lostData.behavior === option ? "#2A80FD" : "#6b7280"
                          }
                          style={tw`text-center`}
                        >
                          {option}
                        </CustomText>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>

              {/* Reward */}
              <View>
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-2 uppercase text-orange-500`}
                >
                  Reward (Optional)
                </CustomText>
                <CustomInput
                  placeholder="Enter reward amount or leave blank"
                  value={lostData.reward}
                  onChangeText={(text) => handleInputChange("reward", text)}
                  keyboardType="phone-pad" // 👈 opens phone keypad
                />
                <CustomText
                  size="2.7"
                  color="#6b7280"
                  style={tw`mb-2 text-gray-400 px-2`}
                >
                  You can add a reward to motivate other finder, finding your
                  pet.
                </CustomText>
              </View>
            </View>
          </View>

          {/* Last Seen Section */}
          <View style={tw`mb-6`}>
            <CustomText
              weight="SemiBold"
              size="sm"
              color="#1f2937"
              style={tw`mb-4`}
            >
              Last Seen Details
            </CustomText>

            <View style={tw`p-4 bg-white rounded-2xl border border-red-200`}>
              {/* Header */}
              <View style={tw`flex-row items-center mb-3`}>
                <View
                  style={tw`w-8 h-8 bg-red-500 rounded-full items-center justify-center mr-3`}
                >
                  <Ionicons name="location-outline" size={16} color="white" />
                </View>
                <CustomText weight="Medium" size="sm" color="#dc2626">
                  Critical Information
                </CustomText>
              </View>

              {/* Manual Input */}
              <View style={tw`mb-4`}>
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-2 uppercase`}
                >
                  Location *
                </CustomText>
                <CustomInput
                  placeholder="Provide specific street address or landmark"
                  value={lostData.lastSeenLocation}
                  onChangeText={(text) =>
                    handleInputChange("lastSeenLocation", text)
                  }
                  containerStyle={tw`mb-0`}
                  error={validationErrors.lastSeenLocation}
                />
              </View>

              {/* Map Picker */}
              <CustomText size="xs" color="#6b7280" style={tw`mb-2 uppercase`}>
                Pin Location on Map *
              </CustomText>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={tw`w-full h-60 rounded-xl`}
                region={
                  lostData.coordinates
                    ? {
                        latitude: lostData.coordinates.latitude,
                        longitude: lostData.coordinates.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }
                    : null
                }
                showsUserLocation={true}
                onPress={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  handleInputChange("coordinates", { latitude, longitude });
                }}
              >
                {lostData.coordinates && (
                  <Marker
                    coordinate={lostData.coordinates}
                    draggable
                    onDragEnd={(e) =>
                      handleInputChange("coordinates", e.nativeEvent.coordinate)
                    }
                  />
                )}
              </MapView>

              {!lostData.coordinates && (
                <CustomText size="xs" color="#ef4444" style={tw`mt-2`}>
                  Please drop a pin on the map
                </CustomText>
              )}

              {/* Date & Time */}
              <View style={tw`mt-4`}>
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-2 uppercase`}
                >
                  Date & Time *
                </CustomText>
                <TouchableOpacity onPress={() => setDatePickerVisibility(true)}>
                  <CustomInput
                    placeholder="Select date and time"
                    value={
                      lostData.lastSeenDate
                        ? moment(lostData.lastSeenDate).format(
                            "MMM D YYYY, h:mm A"
                          )
                        : ""
                    }
                    editable={false}
                    error={validationErrors.lastSeenDate}
                  />
                </TouchableOpacity>

                <DateTimePickerModal
                  isVisible={isDatePickerVisible}
                  mode="datetime"
                  maximumDate={new Date()}
                  onConfirm={(date) => {
                    setLostData((prev) => ({ ...prev, lastSeenDate: date }));
                    setDatePickerVisibility(false);
                  }}
                  onCancel={() => setDatePickerVisibility(false)}
                />
              </View>
            </View>
          </View>

          {/* Contact Section */}
          <View style={tw`mb-6`}>
            <CustomText
              weight="SemiBold"
              size="sm"
              color="#1f2937"
              style={tw`mb-4`}
            >
              Contact Information
            </CustomText>
            <View
              style={tw`p-4 bg-white rounded-2xl border border-blue-200 mb-4`}
            >
              <View style={tw`flex-row items-center mb-3`}>
                <View
                  style={tw`w-8 h-8 bg-blue-500 rounded-full items-center justify-center mr-3`}
                >
                  <Ionicons name="call-outline" size={16} color="white" />
                </View>
                <CustomText weight="Medium" size="sm" color="#618effff">
                  How can finder contact you?
                </CustomText>
              </View>
              <CustomText size="xs" color="#6b7280" style={tw`mb-2 uppercase`}>
                Phone Number *
              </CustomText>
              <CustomInput
                placeholder="Enter phone number"
                value={lostData.contact}
                onChangeText={(text) => handleInputChange("contact", text)}
                error={validationErrors.contact}
                keyboardType="phone-pad" // 👈 opens phone keypad
              />
              {accountPhone ? (
                <TouchableOpacity
                  onPress={() => handleInputChange("contact", accountPhone)}
                  style={tw`mt-2 py-3 w-100% rounded-lg border border-blue-100 items-center`}
                >
                  <CustomText size="xs" weight="Medium" color="#618effff">
                    Use Current Phone ({accountPhone})
                  </CustomText>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </ScrollView>

        {/* Fixed Submit Button */}
        <View style={tw`p-4 border-t border-gray-200 bg-white`}>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[
              tw`bg-red-500 p-4 rounded-2xl items-center`,
              submitting && tw`opacity-50`,
            ]}
            activeOpacity={0.85}
            disabled={submitting}
          >
            {submitting ? (
              <CustomText weight="Medium" color="white" size="sm">
                Submitting Report...
              </CustomText>
            ) : (
              <View style={tw`flex-row items-center`}>
                <Ionicons
                  name="megaphone"
                  size={16}
                  color="white"
                  style={tw`mr-2`}
                />
                <CustomText weight="Medium" color="white" size="sm">
                  Submit Lost Report
                </CustomText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ==== BREED SELECTION MODAL ==== */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={breedModalVisible}
        onRequestClose={() => {
          setBreedModalVisible(false);
          setShowCustomBreedInput(false);
          setCustomBreed("");
          setSearchQuery("");
        }}
      >
        <View style={tw`flex-1 justify-end bg-black/50`}>
          <TouchableWithoutFeedback
            onPress={() => {
              setBreedModalVisible(false);
              setShowCustomBreedInput(false);
              setCustomBreed("");
              setSearchQuery("");
            }}
          >
            <View style={tw`flex-1`} />
          </TouchableWithoutFeedback>

          <SafeAreaView
            style={tw`bg-white rounded-t-3xl overflow-hidden h-2/3`}
          >
            {/* Header */}
            <View
              style={tw`flex-row items-center justify-between p-4 border-b border-gray-100`}
            >
              <CustomText size="sm" weight="Medium">
                Select Breed
              </CustomText>
              <TouchableOpacity
                onPress={() => {
                  setBreedModalVisible(false);
                  setShowCustomBreedInput(false);
                  setCustomBreed("");
                  setSearchQuery("");
                }}
                style={tw`p-2 rounded-full`}
              >
                <Ionicons name="chevron-down" size={22} color="#016AFE" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={tw`px-4 py-2`}>
              <CustomInput
                placeholder={`Search ${
                  lostData.species?.toLowerCase() || ""
                } breeds`}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setShowCustomBreedInput(false);
                }}
                iconName="search"
                style={tw`mb-0`}
                containerStyle={tw`mb-0`}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    setShowCustomBreedInput(false);
                  }}
                  style={tw`absolute right-6 top-6 z-10`}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color="#9ca3af"
                    style={tw`mr-2`}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Breed List or Custom Breed Input */}
            <ScrollView
              style={tw`flex-1 px-4`}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={true}
              contentContainerStyle={tw`pb-6`}
              nestedScrollEnabled={true}
            >
              {showCustomBreedInput ? (
                // Custom Breed Input
                <View style={tw`mb-6`}>
                  <CustomText size="xs" weight="Medium" style={tw`mb-3`}>
                    Enter custom breed:
                  </CustomText>
                  <CustomInput
                    placeholder="Enter breed name"
                    value={customBreed}
                    onChangeText={setCustomBreed}
                    autoFocus={true}
                    style={tw`mb-4`}
                  />
                  <View style={tw`flex-row gap-3`}>
                    <TouchableOpacity
                      onPress={() => {
                        setShowCustomBreedInput(false);
                        setCustomBreed("");
                      }}
                      style={tw`flex-1 py-3 rounded-xl border border-gray-300 items-center`}
                    >
                      <CustomText size="xs" weight="Medium">
                        Cancel
                      </CustomText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleCustomBreedSubmit("lost")} // Pass form type
                      style={[
                        tw`flex-1 py-3 rounded-xl items-center`,
                        customBreed.trim() ? tw`bg-blue-500` : tw`bg-gray-300`,
                      ]}
                      disabled={!customBreed.trim()}
                    >
                      <CustomText size="xs" weight="Medium" color="white">
                        Add Breed
                      </CustomText>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : filteredBreeds.length > 0 ? (
                // Breed List
                <>
                  {filteredBreeds.map((breed, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleBreedSelection(breed, "lost")} // Pass form type
                      style={[
                        tw`p-4 mb-3 rounded-xl border`,
                        {
                          borderColor:
                            lostData.breed === breed ? "#2A80FD" : "#e5e7eb",
                          backgroundColor:
                            lostData.breed === breed ? "#eff6ff" : "#f9fafb",
                        },
                      ]}
                    >
                      <CustomText
                        size="xs"
                        weight={
                          lostData.breed === breed ? "SemiBold" : "Medium"
                        }
                        color={lostData.breed === breed ? "#2A80FD" : "#374151"}
                      >
                        {breed}
                      </CustomText>
                    </TouchableOpacity>
                  ))}

                  {/* Add Custom Breed Option */}
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setShowCustomBreedInput(true)}
                      style={tw`p-4 mb-3 rounded-xl border border-dashed border-gray-300 items-center`}
                    >
                      <View style={tw`flex-row items-center`}>
                        <Ionicons
                          name="add-circle-outline"
                          size={20}
                          color="#6b7280"
                          style={tw`mr-2`}
                        />
                        <CustomText size="xs" color="#6b7280">
                          Add "{searchQuery}" as custom breed
                        </CustomText>
                      </View>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                // No breeds found
                <View style={tw`items-center mt-10`}>
                  <Ionicons name="paw-outline" size={40} color="#9ca3af" />
                  <CustomText
                    size="sm"
                    color="#9ca3af"
                    style={tw`mt-2 mb-6 text-center`}
                  >
                    {searchQuery.length > 0
                      ? `No "${searchQuery}" breed found`
                      : "No breeds available"}
                  </CustomText>

                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setShowCustomBreedInput(true)}
                      style={tw`bg-blue-500 px-6 py-3 rounded-xl`}
                    >
                      <CustomText size="sm" weight="Medium" color="white">
                        Add "{searchQuery}" as custom breed
                      </CustomText>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <CustomModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        type={
          modalType === "finalSuccess"
            ? "success"
            : modalType === "error"
            ? "error"
            : modalType === "duplicate"
            ? "info"
            : "info"
        }
        description={
          modalType === "finalSuccess"
            ? "Lost pet report submitted successfully. Your report has been shared with the community."
            : modalType === "error"
            ? errorMessage
            : modalType === "duplicate"
            ? "You already created a report for this pet. Please check your existing reports."
            : `Would you like to register ${lostData.petname || "this pet"}?`
        }
        customButtons={
          modalType === "duplicate" ? (
            <TouchableOpacity
              style={tw`bg-blue-600 py-3 rounded-xl`}
              onPress={() => {
                setShowModal(false);
                navigation.navigate("MainTabs", { screen: "Community" }); // or "MyReports"
              }}
            >
              <CustomText
                weight="Medium"
                style={tw`text-white text-center text-xs`}
              >
                View My Reports
              </CustomText>
            </TouchableOpacity>
          ) : modalType === "reminder" ? (
            <>
              <TouchableOpacity
                style={tw`bg-blue-600 py-3 rounded-xl mb-3`}
                onPress={handleRegisterNow}
              >
                <CustomText
                  weight="Medium"
                  style={tw`text-white text-center text-xs`}
                >
                  Register Now
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`border border-blue-600 py-3 rounded-xl`}
                onPress={() => setModalType("finalSuccess")}
              >
                <CustomText
                  style={tw`text-blue-600 text-center text-xs font-semibold`}
                >
                  Maybe Later
                </CustomText>
              </TouchableOpacity>
            </>
          ) : modalType === "finalSuccess" ? (
            <TouchableOpacity
              style={tw`bg-green-600 py-4 rounded-xl`}
              onPress={() => {
                setShowModal(false);
                navigation.navigate("MainTabs", { screen: "Community" });
              }}
            >
              <CustomText
                weight="Medium"
                style={tw`text-white text-center text-xs`}
              >
                View Report
              </CustomText>
            </TouchableOpacity>
          ) : null
        }
      />
    </SafeAreaView>
  );

  const renderFoundForm = () => {
    const handleBreedFieldPress = () => {
      if (foundData.species) {
        setBreedModalVisible(true);
      }
    };

    const [validationErrors, setValidationErrors] = useState({});
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [locating, setLocating] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleInputChange = (field, value) => {
      setFoundData((prev) => ({ ...prev, [field]: value }));
      if (validationErrors[field]) {
        setValidationErrors((prev) => ({ ...prev, [field]: null }));
      }
    };

    const pickImages = async () => {
      if (foundData.images.length >= 3) {
        alert("Maximum 3 images allowed");
        return;
      }

      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        alert("Permission required to access photos");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setFoundData((prev) => ({
          ...prev,
          images: [...prev.images, result.assets[0]],
        }));
      }
    };

    const removeImage = (index) => {
      setFoundData((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
    };

    const getCurrentLocation = async () => {
      try {
        setLocating(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          alert("Location permission not granted");
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        handleInputChange("coordinates", { latitude, longitude });
      } catch (error) {
        console.error("Error getting location:", error);
      } finally {
        setLocating(false);
      }
    };

    const validateForm = () => {
      const errors = {};
      if (!foundData.species) errors.species = "Species is required";
      if (!foundData.breed.trim())
        errors.breed = "Breed/description is required";
      if (!foundData.color.trim()) errors.color = "Color is required";
      if (!foundData.foundLocation.trim())
        errors.foundLocation = "Found location is required";
      if (!foundData.foundDate) errors.foundDate = "Found date is required";
      if (!foundData.contact.trim())
        errors.contact = "Contact information is required";
      if (!foundData.currentLocation.trim())
        errors.currentLocation = "Current pet location is required";
      if (!foundData.coordinates)
        errors.coordinates = "Please drop a pin on the map";
      if (foundData.images.length === 0)
        errors.images = "At least one photo is required";

      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
      if (!validateForm()) {
        setModalType("error");
        setErrorMessage(
          "Please fill in all required fields before submitting."
        );
        setShowModal(true);
        return;
      }

      try {
        setSubmitting(true);
        await reportFoundPet(foundData);
        setModalType("success");
        setShowModal(true);
      } catch (error) {
        setModalType("error");
        setErrorMessage(error.message || "Failed to submit found pet report.");
        setShowModal(true);
      } finally {
        setSubmitting(false);
      }
    };
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        {/* Header */}
        <View
          style={[
            tw`flex-row items-center justify-between px-4 py-3 mt-1`,
            { paddingTop: statusBarHeight || 12 },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`w-8 h-8 rounded-full bg-gray-800 items-center justify-center`}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={tw`flex-1 items-center`}>
            <CustomText size="base" weight="Medium" color="#1f2937">
              Report Found Pet
            </CustomText>
          </View>
          <View style={tw`w-10`} />
        </View>

        {/* Main Content */}
        <KeyboardAvoidingView
          style={tw`flex-1`}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          <ScrollView
            style={tw`flex-1 p-4`}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={tw`pb-32`}
          >
            {/* Pet Photos Section */}
            <View style={tw`mb-6`}>
              <CustomText
                weight="SemiBold"
                size="sm"
                color="#1f2937"
                style={tw`mb-4`}
              >
                Pet Photos
              </CustomText>
              <View style={tw`p-4 bg-white rounded-2xl border border-gray-200`}>
                <View style={tw`flex-row flex-wrap gap-3 mb-3`}>
                  {foundData.images.map((img, index) => (
                    <View key={index} style={tw`relative`}>
                      <Image
                        source={{ uri: img.uri }}
                        style={tw`w-24 h-24 rounded-xl`}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={tw`absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm`}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {foundData.images.length < 3 && (
                    <TouchableOpacity
                      style={tw`w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl items-center justify-center bg-gray-50`}
                      onPress={pickImages}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={24}
                        color="#9ca3af"
                      />
                      <CustomText size="2.5" color="#9ca3af" style={tw`mt-1`}>
                        Add
                      </CustomText>
                    </TouchableOpacity>
                  )}
                </View>

                <CustomText size="xs" color="#6b7280">
                  Add up to 3 clear photos of the found pet
                </CustomText>
                {validationErrors.images && (
                  <CustomText size="xs" color="#ef4444" style={tw`mt-1`}>
                    {validationErrors.images}
                  </CustomText>
                )}
              </View>
            </View>

            {/* Pet Information Section */}
            <View style={tw`mb-6`}>
              <CustomText
                weight="SemiBold"
                size="sm"
                color="#1f2937"
                style={tw`mb-4`}
              >
                Pet Information
              </CustomText>
              <View style={tw`p-4 bg-white rounded-2xl border border-gray-200`}>
                {/* Species */}
                <View style={tw`mb-4`}>
                  <CustomText
                    size="xs"
                    color="#6b7280"
                    style={tw`mb-2 uppercase`}
                  >
                    Species *
                  </CustomText>
                  <View style={tw`flex-row gap-3`}>
                    {["Dog", "Cat"].map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => handleInputChange("species", option)}
                        style={[
                          tw`flex-1 py-3 rounded-xl border-2 items-center justify-center`,
                          {
                            borderColor:
                              foundData.species === option
                                ? "#2A80FD"
                                : "#e5e7eb",
                            backgroundColor:
                              foundData.species === option
                                ? "#eff6ff"
                                : "#f9fafb",
                          },
                        ]}
                      >
                        <CustomText
                          size="xs"
                          weight={
                            foundData.species === option ? "SemiBold" : "Medium"
                          }
                          color={
                            foundData.species === option ? "#2A80FD" : "#6b7280"
                          }
                        >
                          {option}
                        </CustomText>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {validationErrors.species && (
                    <CustomText size="xs" color="#ef4444" style={tw`mt-1`}>
                      {validationErrors.species}
                    </CustomText>
                  )}
                </View>
                {/* Breed Selector in found form */}
                <View style={tw`mb-4`}>
                  <CustomText
                    size="xs"
                    color="#6b7280"
                    style={tw`mb-2 uppercase`}
                  >
                    Breed/Description *
                  </CustomText>
                  {validationErrors.breed && (
                    <CustomText size="xs" color="red" style={tw`mb-1`}>
                      {validationErrors.breed}
                    </CustomText>
                  )}
                  <TouchableOpacity
                    onPress={handleBreedFieldPress} // Use the new handler
                    style={[
                      tw`p-4 rounded-xl flex-row items-center justify-between`,
                      {
                        backgroundColor: !foundData.species
                          ? "#f3f4f6"
                          : "#f9fafb",
                        borderWidth: 1,
                        borderColor: validationErrors.breed ? "red" : "#e5e7eb",
                      },
                    ]}
                    disabled={!foundData.species}
                  >
                    <CustomText
                      size="xs"
                      color={foundData.breed ? "#1f2937" : "#9ca3af"}
                      weight={foundData.breed ? "Medium" : "Regular"}
                    >
                      {foundData.breed ||
                        (foundData.species
                          ? `Select ${foundData.species.toLowerCase()} breed`
                          : "Select species first")}
                    </CustomText>
                    <Ionicons name="create-outline" size={18} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* Color + Features */}
                {[
                  ["color", "Color / Markings *", "e.g. Brown with white paws"],
                  [
                    "features",
                    "Distinguishing Features",
                    "e.g. Collar, tags, scars, injuries",
                  ],
                ].map(([field, label, placeholder]) => (
                  <View style={tw`mb-4`} key={field}>
                    <CustomText
                      size="xs"
                      color="#6b7280"
                      style={tw`mb-2 uppercase`}
                    >
                      {label}
                    </CustomText>
                    <CustomInput
                      placeholder={placeholder}
                      value={foundData[field]}
                      onChangeText={(text) => handleInputChange(field, text)}
                      error={validationErrors[field]}
                      multiline={field === "features"}
                      numberOfLines={field === "features" ? 3 : 1}
                    />
                  </View>
                ))}
                {/* Gender */}
                <View style={tw`mb-4`}>
                  <CustomText
                    size="xs"
                    color="#6b7280"
                    style={tw`mb-2 uppercase`}
                  >
                    Gender
                  </CustomText>
                  <View style={tw`flex-row gap-3`}>
                    {["Male", "Female", "Unknown"].map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => handleInputChange("gender", option)}
                        style={[
                          tw`flex-1 py-3 rounded-xl border-2 items-center justify-center`,
                          {
                            borderColor:
                              foundData.gender === option
                                ? "#2A80FD"
                                : "#e5e7eb",
                            backgroundColor:
                              foundData.gender === option
                                ? "#eff6ff"
                                : "#f9fafb",
                          },
                        ]}
                      >
                        <CustomText
                          size="xs"
                          weight={
                            foundData.gender === option ? "SemiBold" : "Medium"
                          }
                          color={
                            foundData.gender === option ? "#2A80FD" : "#6b7280"
                          }
                        >
                          {option}
                        </CustomText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                {/* Age & Size */}
                <View style={tw`flex-row gap-3 mb-4`}>
                  <View style={tw`flex-1`}>
                    <CustomText
                      size="xs"
                      color="#6b7280"
                      style={tw`mb-2 uppercase`}
                    >
                      Age
                    </CustomText>
                    <View style={tw`gap-2`}>
                      {["Puppy/Kitten", "Adult", "Senior"].map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => handleInputChange("age", option)}
                          style={[
                            tw`px-3 py-2 rounded-lg border`,
                            {
                              borderColor:
                                foundData.age === option
                                  ? "#2A80FD"
                                  : "#e5e7eb",
                              backgroundColor:
                                foundData.age === option
                                  ? "#eff6ff"
                                  : "#f9fafb",
                            },
                          ]}
                        >
                          <CustomText
                            size="xs"
                            weight={
                              foundData.age === option ? "SemiBold" : "Medium"
                            }
                            color={
                              foundData.age === option ? "#2A80FD" : "#6b7280"
                            }
                            style={tw`text-center`}
                          >
                            {option}
                          </CustomText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={tw`flex-1`}>
                    <CustomText
                      size="xs"
                      color="#6b7280"
                      style={tw`mb-2 uppercase`}
                    >
                      Size
                    </CustomText>
                    <View style={tw`gap-2`}>
                      {["Small", "Medium", "Large"].map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => handleInputChange("size", option)}
                          style={[
                            tw`px-3 py-2 rounded-lg border`,
                            {
                              borderColor:
                                foundData.size === option
                                  ? "#2A80FD"
                                  : "#e5e7eb",
                              backgroundColor:
                                foundData.size === option
                                  ? "#eff6ff"
                                  : "#f9fafb",
                            },
                          ]}
                        >
                          <CustomText
                            size="xs"
                            weight={
                              foundData.size === option ? "SemiBold" : "Medium"
                            }
                            color={
                              foundData.size === option ? "#2A80FD" : "#6b7280"
                            }
                            style={tw`text-center`}
                          >
                            {option}
                          </CustomText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
                {/* Behavior */}
                <View style={tw`mb-4`}>
                  <CustomText
                    size="xs"
                    color="#6b7280"
                    style={tw`mb-2 uppercase`}
                  >
                    Pet Behavior
                  </CustomText>
                  <View style={tw`flex-row flex-wrap gap-2`}>
                    {[
                      "Friendly",
                      "Aggressive",
                      "Energetic",
                      "Shy",
                      "Calm",
                      "Scared",
                    ].map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => handleInputChange("behavior", option)}
                        style={[
                          tw`px-3 py-2 rounded-lg border`,
                          {
                            borderColor:
                              foundData.behavior === option
                                ? "#2A80FD"
                                : "#e5e7eb",
                            backgroundColor:
                              foundData.behavior === option
                                ? "#eff6ff"
                                : "#f9fafb",
                          },
                        ]}
                      >
                        <CustomText
                          size="xs"
                          weight={
                            foundData.behavior === option
                              ? "SemiBold"
                              : "Medium"
                          }
                          color={
                            foundData.behavior === option
                              ? "#2A80FD"
                              : "#6b7280"
                          }
                          style={tw`text-center`}
                        >
                          {option}
                        </CustomText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                {/* Health Condition */}
                <View style={tw`mb-4`}>
                  <CustomText
                    size="xs"
                    color="#6b7280"
                    style={tw`mb-2 uppercase`}
                  >
                    Health Condition
                  </CustomText>
                  <CustomInput
                    placeholder="e.g. Healthy, Injured, Needs medical attention"
                    value={foundData.health}
                    onChangeText={(text) => handleInputChange("health", text)}
                  />
                </View>
              </View>
            </View>
            {/* Found Details Section */}
            <View style={tw`mb-6`}>
              <CustomText
                weight="SemiBold"
                size="sm"
                color="#1f2937"
                style={tw`mb-4`}
              >
                Found Details
              </CustomText>
              <View
                style={tw`p-4 bg-white rounded-2xl border border-green-200`}
              >
                {/* Header */}
                <View style={tw`flex-row items-center mb-3`}>
                  <View
                    style={tw`w-8 h-8 bg-green-500 rounded-full items-center justify-center mr-3`}
                  >
                    <Ionicons name="location-outline" size={16} color="white" />
                  </View>
                  <CustomText weight="Medium" size="sm" color="#16a34a">
                    Where You Found the Pet
                  </CustomText>
                </View>

                {/* Manual Input */}
                <View style={tw`mb-4`}>
                  <CustomText
                    size="xs"
                    color="#6b7280"
                    style={tw`mb-2 uppercase`}
                  >
                    Found Location *
                  </CustomText>
                  <CustomInput
                    placeholder="Exact street address or landmark where found"
                    value={foundData.foundLocation}
                    onChangeText={(text) =>
                      handleInputChange("foundLocation", text)
                    }
                    containerStyle={tw`mb-0`}
                    error={validationErrors.foundLocation}
                  />
                </View>

                {/* Map Picker */}
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-2 uppercase`}
                >
                  Pin Found Location on Map *
                </CustomText>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={tw`w-full h-60 rounded-xl`}
                  region={
                    foundData.coordinates
                      ? {
                          latitude: foundData.coordinates.latitude,
                          longitude: foundData.coordinates.longitude,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        }
                      : null
                  }
                  showsUserLocation={true}
                  onPress={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    handleInputChange("coordinates", { latitude, longitude });
                  }}
                >
                  {foundData.coordinates && (
                    <Marker
                      coordinate={foundData.coordinates}
                      draggable
                      onDragEnd={(e) =>
                        handleInputChange(
                          "coordinates",
                          e.nativeEvent.coordinate
                        )
                      }
                    />
                  )}
                </MapView>

                {!foundData.coordinates && (
                  <CustomText size="xs" color="#ef4444" style={tw`mt-2`}>
                    Please drop a pin on the map
                  </CustomText>
                )}

                {/* Date & Time */}
                <View style={tw`mt-4`}>
                  <CustomText
                    size="xs"
                    color="#6b7280"
                    style={tw`mb-2 uppercase`}
                  >
                    Date & Time Found *
                  </CustomText>
                  <TouchableOpacity
                    onPress={() => setDatePickerVisibility(true)}
                  >
                    <CustomInput
                      placeholder="Select date and time found"
                      value={
                        foundData.foundDate
                          ? moment(foundData.foundDate).format(
                              "MMM D YYYY, h:mm A"
                            )
                          : ""
                      }
                      editable={false}
                      error={validationErrors.foundDate}
                    />
                  </TouchableOpacity>

                  <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    mode="datetime"
                    maximumDate={new Date()}
                    onConfirm={(date) => {
                      setFoundData((prev) => ({ ...prev, foundDate: date }));
                      setDatePickerVisibility(false);
                    }}
                    onCancel={() => setDatePickerVisibility(false)}
                  />
                </View>
              </View>
            </View>
            {/* Current Situation Section */}
            <View style={tw`mb-6`}>
              <CustomText
                weight="SemiBold"
                size="sm"
                color="#1f2937"
                style={tw`mb-4`}
              >
                Current Situation
              </CustomText>
              <View style={tw`p-4 bg-white rounded-2xl border border-blue-200`}>
                <View style={tw`flex-row items-center mb-3`}>
                  <View
                    style={tw`w-8 h-8 bg-blue-500 rounded-full items-center justify-center mr-3`}
                  >
                    <Ionicons name="home-outline" size={16} color="white" />
                  </View>
                  <CustomText weight="Medium" size="sm" color="#2563eb">
                    Where is the pet now?
                  </CustomText>
                </View>

                {/* Current Location */}
                <View style={tw`mb-4`}>
                  <CustomText
                    size="xs"
                    color="#6b7280"
                    style={tw`mb-2 uppercase`}
                  >
                    Current Pet Location *
                  </CustomText>
                  <CustomInput
                    placeholder="e.g. With me, at animal shelter, at vet clinic"
                    value={foundData.currentLocation}
                    onChangeText={(text) =>
                      handleInputChange("currentLocation", text)
                    }
                    error={validationErrors.currentLocation}
                  />
                </View>

                {/* Availability */}
                <View style={tw`mb-4`}>
                  <CustomText
                    size="xs"
                    color="#6b7280"
                    style={tw`mb-2 uppercase`}
                  >
                    Your Availability
                  </CustomText>
                  <CustomInput
                    placeholder="e.g. Available evenings, weekends only, contact anytime"
                    value={foundData.availability}
                    onChangeText={(text) =>
                      handleInputChange("availability", text)
                    }
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </View>
            {/* Contact Section */}
            <View style={tw`mb-6`}>
              <CustomText
                weight="SemiBold"
                size="sm"
                color="#1f2937"
                style={tw`mb-4`}
              >
                Contact Information
              </CustomText>
              <View style={tw`p-4 bg-white rounded-2xl border border-blue-200`}>
                <View style={tw`flex-row items-center mb-3`}>
                  <View
                    style={tw`w-8 h-8 bg-blue-500 rounded-full items-center justify-center mr-3`}
                  >
                    <Ionicons name="call-outline" size={16} color="white" />
                  </View>
                  <CustomText weight="Medium" size="sm" color="#2563eb">
                    How can owner contact you?
                  </CustomText>
                </View>

                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-2 uppercase`}
                >
                  Phone Number *
                </CustomText>
                <CustomInput
                  placeholder="Enter phone number"
                  value={foundData.contact}
                  onChangeText={(text) => handleInputChange("contact", text)}
                  error={validationErrors.contact}
                  keyboardType="phone-pad"
                />

                {accountPhone && (
                  <TouchableOpacity
                    onPress={() => handleInputChange("contact", accountPhone)}
                    style={tw`mt-2 py-3 rounded-lg border border-blue-100 items-center`}
                  >
                    <CustomText size="xs" weight="Medium" color="#2563eb">
                      Use My Phone ({accountPhone})
                    </CustomText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
          {/* Fixed Submit Button */}
          <View style={tw`p-4 border-t border-gray-200 bg-white`}>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[
                tw`bg-green-500 p-4 rounded-2xl items-center`,
                submitting && tw`opacity-50`,
              ]}
              activeOpacity={0.85}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <View style={tw`flex-row items-center`}>
                  <Ionicons
                    name="heart"
                    size={16}
                    color="white"
                    style={tw`mr-2`}
                  />
                  <CustomText weight="Medium" color="white" size="sm">
                    Submit Found Report
                  </CustomText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        {/* ==== BREED SELECTION MODAL ==== */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={breedModalVisible}
          onRequestClose={() => {
            setBreedModalVisible(false);
            setShowCustomBreedInput(false);
            setCustomBreed("");
            setSearchQuery("");
          }}
        >
          <View style={tw`flex-1 justify-end bg-black/50`}>
            <TouchableWithoutFeedback
              onPress={() => {
                setBreedModalVisible(false);
                setShowCustomBreedInput(false);
                setCustomBreed("");
                setSearchQuery("");
              }}
            >
              <View style={tw`flex-1`} />
            </TouchableWithoutFeedback>

            <SafeAreaView
              style={tw`bg-white rounded-t-3xl overflow-hidden h-2/3`}
            >
              {/* Header */}
              <View
                style={tw`flex-row items-center justify-between p-4 border-b border-gray-100`}
              >
                <CustomText size="sm" weight="Medium">
                  Select Breed
                </CustomText>
                <TouchableOpacity
                  onPress={() => {
                    setBreedModalVisible(false);
                    setShowCustomBreedInput(false);
                    setCustomBreed("");
                    setSearchQuery("");
                  }}
                  style={tw`p-2 rounded-full`}
                >
                  <Ionicons name="chevron-down" size={22} color="#016AFE" />
                </TouchableOpacity>
              </View>

              {/* Search Input */}
              <View style={tw`px-4 py-2`}>
                <CustomInput
                  placeholder={`Search ${
                    lostData.species?.toLowerCase() || ""
                  } breeds`}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setShowCustomBreedInput(false);
                  }}
                  iconName="search"
                  style={tw`mb-0`}
                  containerStyle={tw`mb-0`}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery("");
                      setShowCustomBreedInput(false);
                    }}
                    style={tw`absolute right-6 top-6 z-10`}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color="#9ca3af"
                      style={tw`mr-2`}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Breed List or Custom Breed Input */}
              <ScrollView
                style={tw`flex-1 px-4`}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={true}
                contentContainerStyle={tw`pb-6`}
                nestedScrollEnabled={true}
              >
                {showCustomBreedInput ? (
                  // Custom Breed Input
                  <View style={tw`mb-6`}>
                    <CustomText size="xs" weight="Medium" style={tw`mb-3`}>
                      Enter custom breed:
                    </CustomText>
                    <CustomInput
                      placeholder="Enter breed name"
                      value={customBreed}
                      onChangeText={setCustomBreed}
                      autoFocus={true}
                      style={tw`mb-4`}
                    />
                    <View style={tw`flex-row gap-3`}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowCustomBreedInput(false);
                          setCustomBreed("");
                        }}
                        style={tw`flex-1 py-3 rounded-xl border border-gray-300 items-center`}
                      >
                        <CustomText size="xs" weight="Medium">
                          Cancel
                        </CustomText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleCustomBreedSubmit("found")} // Pass form type
                        style={[
                          tw`flex-1 py-3 rounded-xl items-center`,
                          customBreed.trim()
                            ? tw`bg-blue-500`
                            : tw`bg-gray-300`,
                        ]}
                        disabled={!customBreed.trim()}
                      >
                        <CustomText size="xs" weight="Medium" color="white">
                          Add Breed
                        </CustomText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : filteredBreeds.length > 0 ? (
                  // Breed List
                  <>
                    {filteredBreeds.map((breed, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleBreedSelection(breed, "found")} // Pass form type
                        style={[
                          tw`p-4 mb-3 rounded-xl border`,
                          {
                            borderColor:
                              foundData.breed === breed ? "#2A80FD" : "#e5e7eb",
                            backgroundColor:
                              foundData.breed === breed ? "#eff6ff" : "#f9fafb",
                          },
                        ]}
                      >
                        <CustomText
                          size="xs"
                          weight={
                            lostData.breed === breed ? "SemiBold" : "Medium"
                          }
                          color={
                            lostData.breed === breed ? "#2A80FD" : "#374151"
                          }
                        >
                          {breed}
                        </CustomText>
                      </TouchableOpacity>
                    ))}

                    {/* Add Custom Breed Option */}
                    {searchQuery.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setShowCustomBreedInput(true)}
                        style={tw`p-4 mb-3 rounded-xl border border-dashed border-gray-300 items-center`}
                      >
                        <View style={tw`flex-row items-center`}>
                          <Ionicons
                            name="add-circle-outline"
                            size={20}
                            color="#6b7280"
                            style={tw`mr-2`}
                          />
                          <CustomText size="xs" color="#6b7280">
                            Add "{searchQuery}" as custom breed
                          </CustomText>
                        </View>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  // No breeds found
                  <View style={tw`items-center mt-10`}>
                    <Ionicons name="paw-outline" size={40} color="#9ca3af" />
                    <CustomText
                      size="sm"
                      color="#9ca3af"
                      style={tw`mt-2 mb-6 text-center`}
                    >
                      {searchQuery.length > 0
                        ? `No "${searchQuery}" breed found`
                        : "No breeds available"}
                    </CustomText>

                    {searchQuery.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setShowCustomBreedInput(true)}
                        style={tw`bg-blue-500 px-6 py-3 rounded-xl`}
                      >
                        <CustomText size="sm" weight="Medium" color="white">
                          Add "{searchQuery}" as custom breed
                        </CustomText>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>
        {/* Success Modal */}
        <CustomModal
          visible={showModal && modalType === "success"}
          onClose={() => {
            setShowModal(false);
            navigation.navigate("MainTabs", { screen: "Community" });
          }}
          type="success"
          description="Found pet report submitted successfully! Your report has been shared with the community to help reunite this pet with its owner."
          customButtons={
            <TouchableOpacity
              style={tw`bg-green-600 py-4 rounded-xl`}
              onPress={() => {
                setShowModal(false);
                navigation.navigate("MainTabs", { screen: "Community" });
              }}
            >
              <CustomText
                weight="Medium"
                style={tw`text-white text-center text-xs`}
              >
                View Report
              </CustomText>
            </TouchableOpacity>
          }
        />

        {/* Error Modal */}
        <CustomModal
          visible={showModal && modalType === "error"}
          onClose={() => setShowModal(false)}
          type="error"
          description={errorMessage}
        />
      </SafeAreaView>
    );
  };

  return reportType === "lost" ? renderLostForm() : renderFoundForm();
}
