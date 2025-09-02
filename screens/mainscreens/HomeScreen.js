import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  SafeAreaView,
  View,
  TouchableOpacity,
  StatusBar,
  Platform,
  Animated,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from "react-native";
import tw from "twrnc";
import CustomText from "../../components/CustomText";
import CustomInput from "../../components/CustomInput";
import ErrorModal from "../../components/CustomModal";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from 'expo-image-picker';
import { registerPet } from "../../utils/PetService"; // adjust path


export default function HomeScreen() {
  const [firstName, setFirstName] = useState("Friend");
  const [greeting, setGreeting] = useState("");
  const [greetingDesc, setGreetingDesc] = useState("");
  const navigation = useNavigation();

  const [modalVisible, setModalVisible] = useState(false);
  const [breedModalVisible, setBreedModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCustomBreedInput, setShowCustomBreedInput] = useState(false);
  const [customBreed, setCustomBreed] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Function to handle breed selection
  const handleBreedSelection = (breed) => {
    handleInputChange("breed", breed);
    setBreedModalVisible(false);
    setSearchQuery("");
    setShowCustomBreedInput(false);
    setCustomBreed("");
  };

  const handleCustomBreedSubmit = () => {
    if (customBreed.trim()) {
      handleBreedSelection(customBreed.trim());
    }
  };

  // Pet registration form state
  const [petData, setPetData] = useState({
    petname: "",
    species: "",
    breed: "",
    color: "",
    age: "",
    size: "",
    features: "",
    health: "",
    behavior: "",
    specialNeeds: "",
    gender: "",
    image: null, // Added image field
  });

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({});

  // 🔹 Modal state
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("error");

  const showModal = (msg, type = "error") => {
    setModalMessage(msg);
    setModalType(type);
    setErrorModalVisible(true);
  };

  // Example data (replace with full list)
  const dogBreeds = [
    "Labrador Retriever",
    "German Shepherd",
    "Bulldog",
    "Golden Retriever",
  ];
  const catBreeds = ["Persian", "Siamese", "Maine Coon", "Bengal"];

  // Compute filtered breeds safely
  const filteredBreeds = (
    petData.species === "Dog" ? dogBreeds : catBreeds
  ).filter((breed) => breed.toLowerCase().includes(searchQuery.toLowerCase()));

  // Animation setup
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const descriptions = [
    "Let's help pets find home",
    "Together, let's reunite pets & families",
    "Caring for pets, caring for families",
    "Every pet deserves a loving home",
  ];
  const descIndex = useRef(0);

  // Fetch user first name
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const fullName = docSnap.data().fullName || "Friend";
          const first = fullName.split(" ")[0];
          setFirstName(first);
        }
      } catch (error) {
        console.log("Error fetching user name:", error);
      }
    };
    fetchUserName();
  }, []);

  // Greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting("Good Morning");
    } else if (hour >= 12 && hour < 18) {
      setGreeting("Good Afternoon");
    } else {
      setGreeting("Good Evening");
    }
  }, []);

  // Greeting description cycle
  useEffect(() => {
    const cycleDescriptions = () => {
      descIndex.current = (descIndex.current + 1) % descriptions.length;
      setGreetingDesc(descriptions[descIndex.current]);

      fadeAnim.setValue(0);
      slideAnim.setValue(-20);
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
      ]).start();
    };

    setGreetingDesc(descriptions[0]);
    fadeAnim.setValue(1);
    slideAnim.setValue(0);

    const interval = setInterval(cycleDescriptions, 7000);
    return () => clearInterval(interval);
  }, []);

  const statusBarHeight =
    Platform.OS === "android" ? StatusBar.currentHeight : 0;

  // Update pet form fields
  const handleInputChange = (field, value) => {
    setPetData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error when field is updated
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Image picker function
  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showModal('Sorry, we need camera roll permissions to upload images!');
        return;
      }

      // Launch image picker
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        handleInputChange("image", result.assets[0]);
      }
    } catch (error) {
      console.log("Error picking image:", error);
      showModal('Failed to pick image. Please try again.');
    }
  };

  // Remove image function
  const removeImage = () => {
    handleInputChange("image", null);
  };

  // Validate pet registration form
  const validatePetInputs = useCallback(() => {
    const errors = {};
    
    if (!petData.petname.trim()) {
      errors.petname = "Please enter your pet's name";
    }
    
    if (!petData.species) {
      errors.species = "Please select a species";
    }
    
    if (!petData.breed) {
      errors.breed = "Please select a breed";
    }
    
    if (!petData.color.trim()) {
      errors.color = "Please enter color/markings";
    }
    
    if (!petData.gender) {
      errors.gender = "Please select a gender";
    }
    
    if (!petData.age) {
      errors.age = "Please select an age group";
    }
    
    if (!petData.size) {
      errors.size = "Please select a size";
    }
    
    if (!petData.health) {
      errors.health = "Please select health status";
    }
    
    if (!petData.behavior) {
      errors.behavior = "Please select behavior";
    }

    if (!petData.image) {
      errors.image = "Please upload an image of your pet";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [petData]);

  // Save pet handler
  const handleSavePet = async () => {
    if (!validatePetInputs()) {
      showModal("Please fill all required fields correctly", "warning");
      return;
    }

    if (isSaving) return; // Prevent multiple clicks

    setIsSaving(true); // Start loading

    try {
      const savedPet = await registerPet(petData);
      console.log("Pet registered:", savedPet);

      showModal("Pet registered successfully!", "success");

      // Reset form
      setPetData({
        petname: "",
        species: "",
        breed: "",
        color: "",
        age: "",
        size: "",
        features: "",
        health: "",
        behavior: "",
        specialNeeds: "",
        gender: "",
        image: null,
      });

      setTimeout(() => setModalVisible(false), 1500);
    } catch (error) {
      console.error("Failed to register pet:", error);
      showModal(error.message || "Failed to register pet", "error");
    } finally {
      setIsSaving(false); // Stop loading
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* HEADER */}
      <View
        style={[
          tw`flex-row justify-between items-center px-4`,
          { paddingTop: statusBarHeight || 16 },
        ]}
      >
        <View style={tw`mt-3`}>
          <CustomText style={tw`text-gray-800`} size="4.5" weight="Medium">
            {greeting}, {firstName} 👋
          </CustomText>
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

        <TouchableOpacity
          style={tw`w-12 h-12 rounded-full bg-gray-100 items-center justify-center mt-3`}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Ionicons name="notifications" size={20} color="#313131ff" />
        </TouchableOpacity>
      </View>

      {/* MAIN CONTENT */}
      <View style={tw`flex-1 justify-center items-center`}>
        <CustomText style={tw`text-base text-gray-600 mt-2`}>
          Welcome to your app!
        </CustomText>

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={tw`mt-6 flex-row items-center bg-blue-500 px-4 py-2 rounded-lg`}
          activeOpacity={0.8}
        >
          <Ionicons
            name="paw-outline"
            size={20}
            color="white"
            style={tw`mr-2`}
          />
          <CustomText weight="Medium" color="white">
            Register a Pet
          </CustomText>
        </TouchableOpacity>
      </View>

      {/* ==== PET REGISTRATION MODAL ==== */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={tw`flex-1 bg-white`}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={tw`flex-1`}>
              {/* Header */}
              <View
                style={tw`flex-row items-center justify-between p-4 border-b border-gray-200`}
              >
                <CustomText size="lg" weight="Medium">
                  Register a Pet
                </CustomText>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={tw`p-2 rounded-full bg-gray-100`}
                >
                  <Ionicons name="close" size={22} color="black" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={tw`flex-1 p-4`} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* ========== PET IMAGE UPLOAD ========== */}
                <View style={tw`mb-6`}>
                  <CustomText size="xs" color="#6b7280" style={tw`mb-3 uppercase`}>
                    PET PHOTO *
                  </CustomText>
                  
                  {petData.image ? (
                    <View style={tw`relative w-full`}> 
                      <Image
                        source={{ uri: petData.image.uri }}
                        style={tw`w-full h-55 rounded-2xl`} 
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        onPress={removeImage}
                        style={tw`absolute -top-2 -right-2 bg-red-500 rounded-full p-1`}
                      >
                        <Ionicons name="close" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={pickImage}
                      style={tw`w-full h-55 border-2 border-dashed border-gray-300 rounded-2xl items-center justify-center bg-gray-50`}
                    >
                      <Ionicons name="camera-outline" size={32} color="#9ca3af" />
                      <CustomText size="xs" color="#9ca3af" style={tw`mt-2 text-center`}>
                        Tap to upload{'\n'}pet photo
                      </CustomText>
                    </TouchableOpacity>
                  )}
                  
                  {validationErrors.image && (
                    <CustomText size="xs" color="red" style={tw`mt-2`}>
                      {validationErrors.image}
                    </CustomText>
                  )}
                </View>
                {/* ========== PET INFORMATION SECTION ========== */}
                <CustomText
                  size="sm"
                  weight="SemiBold"
                  color="#374151"
                  style={tw`mb-3`}
                >
                  PET INFORMATION
                </CustomText>

                {/* PET NAME */}
                <View style={tw`mb-4`}>
                  <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
                    PET NAME *
                  </CustomText>
                  <CustomInput
                    placeholder="Enter your pet's name"
                    value={petData.petname}
                    onChangeText={(text) => handleInputChange("petname", text)}
                    error={validationErrors.petname}
                  />
                </View>

                {/* SPECIES */}
                <View style={tw`mb-4`}>
                  <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
                    SPECIES *
                  </CustomText>
                  {validationErrors.species && (
                    <CustomText size="xs" color="red" style={tw`mb-1`}>
                      {validationErrors.species}
                    </CustomText>
                  )}
                  <View style={tw`flex-row gap-3`}>
                    {["Dog", "Cat"].map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => handleInputChange("species", option)}
                        style={[
                          tw`flex-1 py-3 rounded-xl border-2 items-center justify-center`,
                          {
                            borderColor:
                              petData.species === option ? "#2A80FD" : "#e5e7eb",
                            backgroundColor:
                              petData.species === option ? "#eff6ff" : "#f9fafb",
                          },
                        ]}
                      >
                        <CustomText
                          size="sm"
                          weight={
                            petData.species === option ? "SemiBold" : "Medium"
                          }
                          color={petData.species === option ? "#2A80FD" : "#6b7280"}
                        >
                          {option}
                        </CustomText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* BREED */}
                <View style={tw`mb-4`}>
                  <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
                    BREED *
                  </CustomText>
                  {validationErrors.breed && (
                    <CustomText size="xs" color="red" style={tw`mb-1`}>
                      {validationErrors.breed}
                    </CustomText>
                  )}
                  <TouchableOpacity
                    onPress={() => petData.species && setBreedModalVisible(true)}
                    style={[
                      tw`p-4 rounded-xl flex-row items-center justify-between`,
                      {
                        backgroundColor: !petData.species ? "#f3f4f6" : "#f9fafb",
                        borderWidth: 1,
                        borderColor: validationErrors.breed ? "red" : "#e5e7eb",
                      },
                    ]}
                    disabled={!petData.species}
                  >
                    <CustomText
                      size="sm"
                      color={petData.breed ? "#1f2937" : "#9ca3af"}
                      weight={petData.breed ? "Medium" : "Regular"}
                    >
                      {petData.breed ||
                        (petData.species
                          ? `Select ${petData.species.toLowerCase()} breed`
                          : "Select species first")}
                    </CustomText>
                    <Ionicons name="create-outline" size={18} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* COLOR / MARKINGS */}
                <View style={tw`mb-4`}>
                  <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
                    COLOR / MARKINGS *
                  </CustomText>
                  <CustomInput
                    placeholder="e.g. Brown with white paws"
                    value={petData.color}
                    onChangeText={(text) => handleInputChange("color", text)}
                    error={validationErrors.color}
                  />
                </View>

                {/* GENDER */}
                <View style={tw`mb-4`}>
                  <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
                    GENDER *
                  </CustomText>
                  {validationErrors.gender && (
                    <CustomText size="xs" color="red" style={tw`mb-1`}>
                      {validationErrors.gender}
                    </CustomText>
                  )}
                  <View style={tw`flex-row gap-3`}>
                    {["Male", "Female"].map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => handleInputChange("gender", option)}
                        style={[
                          tw`flex-1 py-3 rounded-xl border-2 items-center justify-center`,
                          {
                            borderColor:
                              petData.gender === option ? "#2A80FD" : "#e5e7eb",
                            backgroundColor:
                              petData.gender === option ? "#eff6ff" : "#f9fafb",
                          },
                        ]}
                      >
                        <CustomText
                          size="sm"
                          weight={petData.gender === option ? "SemiBold" : "Medium"}
                          color={petData.gender === option ? "#2A80FD" : "#6b7280"}
                        >
                          {option}
                        </CustomText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* AGE + SIZE */}
                <View style={tw`flex-row gap-3 mb-4`}>
                  {/* AGE */}
                  <View style={tw`flex-1`}>
                    <CustomText
                      size="xs"
                      color="#6b7280"
                      style={tw`mb-1 uppercase`}
                    >
                      AGE GROUP *
                    </CustomText>
                    {validationErrors.age && (
                      <CustomText size="xs" color="red" style={tw`mb-1`}>
                        {validationErrors.age}
                      </CustomText>
                    )}
                    {["Puppy/Kitten", "Adult", "Senior"].map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => handleInputChange("age", option)}
                        style={[
                          tw`px-3 py-2 rounded-lg border mb-1`,
                          {
                            borderColor:
                              petData.age === option ? "#2A80FD" : "#e5e7eb",
                            backgroundColor:
                              petData.age === option ? "#eff6ff" : "#f9fafb",
                          },
                        ]}
                      >
                        <CustomText
                          size="xs"
                          weight={petData.age === option ? "SemiBold" : "Medium"}
                          color={petData.age === option ? "#2A80FD" : "#6b7280"}
                          style={tw`text-center`}
                        >
                          {option}
                        </CustomText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* SIZE */}
                  <View style={tw`flex-1`}>
                    <CustomText
                      size="xs"
                      color="#6b7280"
                      style={tw`mb-1 uppercase`}
                    >
                      SIZE *
                    </CustomText>
                    {validationErrors.size && (
                      <CustomText size="xs" color="red" style={tw`mb-1`}>
                        {validationErrors.size}
                      </CustomText>
                    )}
                    {["Small", "Medium", "Large"].map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => handleInputChange("size", option)}
                        style={[
                          tw`px-3 py-2 rounded-lg border mb-1`,
                          {
                            borderColor:
                              petData.size === option ? "#2A80FD" : "#e5e7eb",
                            backgroundColor:
                              petData.size === option ? "#eff6ff" : "#f9fafb",
                          },
                        ]}
                      >
                        <CustomText
                          size="xs"
                          weight={petData.size === option ? "SemiBold" : "Medium"}
                          color={petData.size === option ? "#2A80FD" : "#6b7280"}
                          style={tw`text-center`}
                        >
                          {option}
                        </CustomText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* DISTINGUISHING FEATURES */}
                <View style={tw`mb-4`}>
                  <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
                    DISTINGUISHING FEATURES
                  </CustomText>
                  <CustomInput
                    placeholder="e.g. Scar on left ear"
                    value={petData.features}
                    onChangeText={(text) => handleInputChange("features", text)}
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                  />
                </View>

                {/* ========== CONDITION / BEHAVIOR SECTION ========== */}
                <CustomText
                  size="sm"
                  weight="SemiBold"
                  color="#374151"
                  style={tw`mb-3`}
                >
                  CONDITION / BEHAVIOR
                </CustomText>

                {/* HEALTH STATUS */}
                <View style={tw`mb-4`}>
                  <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
                    HEALTH STATUS *
                  </CustomText>
                  {validationErrors.health && (
                    <CustomText size="xs" color="red" style={tw`mb-1`}>
                      {validationErrors.health}
                    </CustomText>
                  )}
                  <View style={tw`flex-row flex-wrap gap-2`}>
                    {["Healthy", "Injured", "Recovering", "Sick"].map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() => handleInputChange("health", option)}
                        style={[
                          tw`px-4 py-2 rounded-lg border`,
                          {
                            borderColor:
                              petData.health === option ? "#2A80FD" : "#e5e7eb",
                            backgroundColor:
                              petData.health === option ? "#eff6ff" : "#f9fafb",
                          },
                        ]}
                      >
                        <CustomText
                          size="xs"
                          weight={petData.health === option ? "SemiBold" : "Medium"}
                          color={petData.health === option ? "#2A80FD" : "#6b7280"}
                        >
                          {option}
                        </CustomText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* BEHAVIOR */}
                <View style={tw`mb-4`}>
                  <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
                    BEHAVIOR *
                  </CustomText>
                  {validationErrors.behavior && (
                    <CustomText size="xs" color="red" style={tw`mb-1`}>
                      {validationErrors.behavior}
                    </CustomText>
                  )}
                  <View style={tw`flex-row flex-wrap gap-2`}>
                    {["Friendly", "Aggressive", "Energetic", "Shy", "Calm"].map(
                      (option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => handleInputChange("behavior", option)}
                          style={[
                            tw`px-4 py-2 rounded-lg border`,
                            {
                              borderColor:
                                petData.behavior === option ? "#2A80FD" : "#e5e7eb",
                              backgroundColor:
                                petData.behavior === option ? "#eff6ff" : "#f9fafb",
                            },
                          ]}
                        >
                          <CustomText
                            size="xs"
                            weight={
                              petData.behavior === option ? "SemiBold" : "Medium"
                            }
                            color={
                              petData.behavior === option ? "#2A80FD" : "#6b7280"
                            }
                          >
                            {option}
                          </CustomText>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>

                {/* SPECIAL NEEDS */}
                <View style={tw`mb-6`}>
                  <CustomText size="xs" color="#6b7280" style={tw`mb-1 uppercase`}>
                    SPECIAL NEEDS
                  </CustomText>
                  <CustomInput
                    placeholder="e.g. Daily heart medication"
                    value={petData.specialNeeds}
                    onChangeText={(text) => handleInputChange("specialNeeds", text)}
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                  />
                </View>
              </ScrollView>
              
              {/* Fixed SAVE BUTTON at bottom */}
              <View style={tw`p-4 border-t border-gray-200 bg-white`}>
                <TouchableOpacity
                  onPress={handleSavePet}
                  style={[tw`bg-blue-500 p-4 rounded-2xl items-center`, isSaving && tw`opacity-50`]}
                  activeOpacity={0.85}
                  disabled={isSaving} // Disable button while saving
                >
                  {isSaving ? (
                    <CustomText weight="Medium" color="white">
                      Saving...
                    </CustomText>
                  ) : (
                    <CustomText weight="Medium" color="white">
                      Save Pet
                    </CustomText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

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
          <TouchableWithoutFeedback onPress={() => {
            setBreedModalVisible(false);
            setShowCustomBreedInput(false);
            setCustomBreed("");
            setSearchQuery("");
          }}>
            <View style={tw`flex-1`} />
          </TouchableWithoutFeedback>
          
          <View style={tw`bg-white rounded-t-3xl overflow-hidden h-2/3`}>
            {/* Header */}
            <View
              style={tw`flex-row items-center justify-between p-4`}
            >
              <CustomText size="lg" weight="Medium">
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
            <View style={tw`px-4`}>
              <CustomInput
                placeholder={`Search ${petData.species?.toLowerCase() || ""} breeds`}
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
                  style={tw`absolute right-6 top-4 z-10`}
                >
                  <Ionicons name="close-circle" size={18} color="#9ca3af" style={tw`mr-2`}/>
                </TouchableOpacity>
              )}
            </View>

            {/* Breed List or Custom Breed Input */}
            <ScrollView
              style={tw`flex-1 p-4`}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {showCustomBreedInput ? (
                // Custom Breed Input
                <View style={tw`mb-6`}>
                  <CustomText size="sm" weight="Medium" style={tw`mb-3`}>
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
                      <CustomText size="sm" weight="Medium">
                        Cancel
                      </CustomText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleCustomBreedSubmit}
                      style={[
                        tw`flex-1 py-3 rounded-xl items-center`,
                        customBreed.trim() 
                          ? tw`bg-blue-500` 
                          : tw`bg-gray-300`
                      ]}
                      disabled={!customBreed.trim()}
                    >
                      <CustomText size="sm" weight="Medium" color="white">
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
                      onPress={() => handleBreedSelection(breed)}
                      style={[
                        tw`p-4 mb-3 rounded-xl border`,
                        {
                          borderColor:
                            petData.breed === breed ? "#2A80FD" : "#e5e7eb",
                          backgroundColor:
                            petData.breed === breed ? "#eff6ff" : "#f9fafb",
                        },
                      ]}
                    >
                      <CustomText
                        size="sm"
                        weight={petData.breed === breed ? "SemiBold" : "Medium"}
                        color={petData.breed === breed ? "#2A80FD" : "#374151"}
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
                      <Ionicons name="add-circle-outline" size={20} color="#6b7280" style={tw`mr-2`} />
                      <CustomText size="sm" color="#6b7280">
                        Add "{searchQuery}" as custom breed
                      </CustomText>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                // No breeds found
                <View style={tw`items-center mt-10`}>
                  <Ionicons name="paw-outline" size={40} color="#9ca3af" />
                  <CustomText size="sm" color="#9ca3af" style={tw`mt-2 mb-6 text-center`}>
                    {searchQuery.length > 0 
                      ? `No "${searchQuery}" breed found`
                      : "No breeds available"
                    }
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
          </View>
        </View>
      </Modal>

      {/* 🔹 Error Modal */}
      <ErrorModal
        visible={errorModalVisible}
        onClose={() => setErrorModalVisible(false)}
        description={modalMessage}
        type={modalType}
      />
    </SafeAreaView>
  );
}