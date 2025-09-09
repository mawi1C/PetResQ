import React, { useEffect, useState, useRef, useCallback} from "react";
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
  Alert,
  ActivityIndicator,
} from "react-native";
import tw from "twrnc";
import CustomText from "../../components/CustomText";
import CustomInput from "../../components/CustomInput";
import ErrorModal from "../../components/CustomModal";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebase";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { registerPet, getUserNotifications } from "../../utils/PetService";

export default function HomeScreen() {
  const [firstName, setFirstName] = useState("Friend");
  const [greeting, setGreeting] = useState("");
  const [greetingDesc, setGreetingDesc] = useState("");
  const [userPets, setUserPets] = useState([]); // Added state for user pets
  const [loadingPets, setLoadingPets] = useState(true); // Loading state for pets
  const navigation = useNavigation();

  const [modalVisible, setModalVisible] = useState(false);
  const [breedModalVisible, setBreedModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCustomBreedInput, setShowCustomBreedInput] = useState(false);
  const [customBreed, setCustomBreed] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [recentActivities, setRecentActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  const [hasNewNotification, setHasNewNotification] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const checkNotifications = async () => {
        try {
          const userNotifications = await getUserNotifications();
          // check if any notification is unread
          const hasUnread = userNotifications.some((n) => !n.read);
          setHasNewNotification(hasUnread);
        } catch (error) {
          console.error("Error checking notifications:", error);
        }
      };

      checkNotifications();
    }, [])
  );

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoadingActivities(false);
      return;
    }

    // Fetch user's recent sightings - limit to 2
    const sightingsQuery = query(
      collection(db, "sightings"),
      where("reporterId", "==", user.uid), // This should filter by current user
      orderBy("createdAt", "desc"),
      limit(2)
    );

    const unsubscribeSightings = onSnapshot(
      sightingsQuery,
      async (querySnapshot) => {
        const activities = [];

        for (const docSnap of querySnapshot.docs) {
          const sightingData = docSnap.data();

          // Get the lost pet details for this sighting
          let petName = "a pet";
          try {
            const lostPetDoc = await getDoc(
              doc(db, "lostPets", sightingData.lostPetId)
            );
            if (lostPetDoc.exists()) {
              petName = lostPetDoc.data().petname || "a pet";
            }
          } catch (error) {
            console.log("Error fetching pet details:", error);
          }

          // Format the date as "Sept 7 2025"
          let formattedDate = "Recently";
          if (sightingData.createdAt && sightingData.createdAt.seconds) {
            const date = new Date(sightingData.createdAt.seconds * 1000);
            formattedDate = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          }

          activities.push({
            id: docSnap.id,
            type: "sighting",
            title: "Sighting Reported",
            description: `You reported a sighting of ${petName}`,
            timestamp: sightingData.createdAt,
            petName: petName,
            date: formattedDate,
          });
        }

        setRecentActivities(activities);
        setLoadingActivities(false);
      },
      (error) => {
        console.error("Error fetching activities:", error);
        setLoadingActivities(false);
      }
    );

    return () => {
      unsubscribeSightings();
    };
  }, []);

  // You can also create a helper function for date formatting if you want to use it elsewhere
  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return "Recently";

    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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
    image: null,
  });

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({});

  // Modal state
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("error");
  const [reportTypeModalVisible, setReportTypeModalVisible] = useState(false);

  const showModal = (msg, type = "error") => {
    setModalMessage(msg);
    setModalType(type);
    setErrorModalVisible(true);
  };

  // Example data (replace with full list)
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

  const [aiSearchModalVisible, setAiSearchModalVisible] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [editingPetData, setEditingPetData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleAiSearchPress = () => {
    if (userPets.length === 0) {
      showModal("Please register a pet before using AI search", "warning");
      return;
    }
    setAiSearchModalVisible(true);
  };

  // Function to select a pet for AI analysis
  const handlePetSelect = (pet) => {
    setSelectedPet(pet);
    setEditingPetData({ ...pet }); // Create a copy for editing
    setIsEditing(false);
  };

  // Function to handle editing pet data
  const handleEditPetData = (field, value) => {
    setEditingPetData((prev) => ({ ...prev, [field]: value }));
  };

  // Function to save edited pet data
  const handleSavePetEdits = async () => {
    try {
      const petRef = doc(db, "pets", selectedPet.id);
      await updateDoc(petRef, editingPetData);

      // Update local state
      setUserPets((prev) =>
        prev.map((pet) =>
          pet.id === selectedPet.id ? { ...pet, ...editingPetData } : pet
        )
      );

      setSelectedPet(editingPetData);
      setIsEditing(false);
      showModal("Pet details updated successfully!", "success");
    } catch (error) {
      console.error("Error updating pet:", error);
      showModal("Failed to update pet details", "error");
    }
  };

  // Function to start AI analysis with selected pet
  const handleStartAiAnalysis = () => {
    if (!selectedPet) {
      showModal("Please select a pet to analyze", "warning");
      return;
    }

    // Close modal and navigate to AI analysis screen with pet data
    setAiSearchModalVisible(false);
    navigation.navigate("AIPetSearchScreen", { petData: selectedPet });
  };

  // Compute filtered breeds safely
  const filteredBreeds = (
    petData.species === "Dog" ? dogBreeds : catBreeds
  ).filter((breed) => breed.toLowerCase().includes(searchQuery.toLowerCase()));

  // Animation setup
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const descriptions = [
    "Let's help reunite pets with their families",
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

  // Greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting("Good morning");
    } else if (hour >= 12 && hour < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
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
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showModal("Sorry, we need camera roll permissions to upload images!");
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
      showModal("Failed to pick image. Please try again.");
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

    if (isSaving) return;

    setIsSaving(true);

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
      setIsSaving(false);
    }
  };

  // Render pet card component
  const renderPetCard = (pet) => (
    <View key={pet.id} style={tw`w-42`}>
      <View style={tw`bg-gray-800 rounded-2xl p-4 flex-row items-center mr-4`}>
        <Image
          source={{ uri: pet.photoUrl }}
          style={tw`w-12 h-12 rounded-full mr-3`}
          resizeMode="cover"
        />
        <View style={tw`flex-1`}>
          <CustomText size="xs" color="#9ca3af" style={tw`mb-1`}>
            Your {pet.species?.toLowerCase()}
          </CustomText>
          <CustomText size="sm" weight="Medium" color="white">
            {pet.petname}
          </CustomText>
        </View>
      </View>
    </View>
  );

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
          <CustomText style={tw`text-gray-800`} size="base" weight="Medium">
            {greeting} {firstName},
          </CustomText>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            }}
          >
            <CustomText style={tw`text-xs text-gray-600`}>
              {greetingDesc}
            </CustomText>
          </Animated.View>
        </View>

        <TouchableOpacity
          style={tw`w-12 h-12 rounded-full bg-gray-100 items-center justify-center mt-3 relative`}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Ionicons name="notifications" size={18} color="#313131ff" />

          {hasNewNotification && (
            <View
              style={tw`absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full`}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* MAIN CONTENT */}
      <ScrollView
        style={tw`flex-1 px-4`}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEnabled={true}
        contentContainerStyle={tw`pb-8`}
        nestedScrollEnabled={true}
      >
        {/* User Pets Section */}
        {/* Pet Section - Dynamic Layout Based on User Pets */}
        {loadingPets ? (
          <View style={tw`mt-6`}>
            <CustomText size="xs" color="#6b7280" style={tw`mb-3`}>
              Loading your pets...
            </CustomText>
          </View>
        ) : userPets.length > 0 ? (
          // Layout when user HAS pets: Pet card(s) on left, "Add another" on right
          <View style={tw`flex-row gap-3 mt-6 items-center`}>
            {/* Pet Cards - Horizontal Scroll */}
            <View style={tw`flex-1`}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw`pr-3`}
                nestedScrollEnabled={true}
              >
                {userPets.map(renderPetCard)}
              </ScrollView>
            </View>

            {/* Add Another Pet Card */}
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={tw`w-34 bg-white border border-gray-200 rounded-2xl p-4`}
              activeOpacity={0.8}
            >
              <View style={tw`flex-row items-center`}>
                <View
                  style={tw`w-10 h-10 bg-orange-500 rounded-full items-center justify-center mr-3`}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </View>
                <CustomText size="xs">Add pet</CustomText>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          // Layout when user has NO pets: Register button on left, info text on right
          <View style={tw`flex-row gap-3 mt-6 items-center`}>
            {/* Register Your Pet Card */}
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={tw`flex-1 p-4 bg-white border border-orange-200 rounded-2xl shadow-sm`}
              activeOpacity={0.8}
            >
              <View style={tw`flex-row items-center justify-center`}>
                <View
                  style={tw`w-10 h-10 bg-gray-50 rounded-full items-center justify-center mr-3`}
                >
                  <Ionicons name="paw" size={18} color="#6e6e6eff" />
                </View>
                <View>
                  <CustomText weight="Medium" size="xs" color="#565656ff">
                    Register your
                  </CustomText>
                  <CustomText weight="Medium" size="sm" color="#1f2937">
                    Pet
                  </CustomText>
                </View>
              </View>
            </TouchableOpacity>

            {/* Info Text Card */}
            <View style={tw`flex-1 p-4 rounded-2xl`}>
              <CustomText
                weight="Medium"
                size="xs"
                color="#1f2937"
                style={tw`mb-1`}
              >
                Do you have pets?
              </CustomText>
              <CustomText size="xs" color="#6b7280">
                Register your lovely pet
              </CustomText>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={tw`mt-6`}>
          <CustomText
            weight="SemiBold"
            size="sm"
            color="#1f2937"
            style={tw`mb-4`}
          >
            Quick Actions
          </CustomText>

          <View style={tw`flex-row gap-4`}>
            {/* Lost or found a pet card */}
            <TouchableOpacity
              style={tw`flex-1 p-4 bg-white rounded-2xl border border-gray-200`}
              activeOpacity={0.8}
              onPress={() => setReportTypeModalVisible(true)}
            >
              <View
                style={tw`w-10 h-10 bg-blue-500 rounded-full items-center justify-center mb-2`}
              >
                <Ionicons name="search" size={16} color="white" />
              </View>
              <CustomText
                weight="Medium"
                size="sm"
                color="#1f2937"
                style={tw`mb-2`}
              >
                Lost or found a pet?
              </CustomText>
              <CustomText size="2.5" color="#6b7280">
                Report now and share to community
              </CustomText>
            </TouchableOpacity>

            {/* Community card */}
            <TouchableOpacity
              style={tw`flex-1 p-4 bg-white rounded-2xl border border-gray-200`}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("MainTabs", { screen: "Community" })
              }
            >
              <View
                style={tw`w-10 h-10 bg-green-500 rounded-full items-center justify-center mb-2`}
              >
                <Ionicons name="people" size={16} color="white" />
              </View>
              <CustomText
                weight="Medium"
                size="sm"
                color="#1f2937"
                style={tw`mb-2`}
              >
                Community
              </CustomText>
              <CustomText size="2.5" color="#6b7280">
                Join and help others reunite with their pet
              </CustomText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Need help finding your pet section - Update the button */}
        <View style={tw`mt-6 p-6 bg-gray-50 rounded-2xl`}>
          <CustomText
            weight="Medium"
            size="sm"
            color="#1f2937"
            style={tw`mb-1`}
          >
            Need help finding your pet?
          </CustomText>
          <CustomText size="xs" color="#6b7280" style={tw`mb-4`}>
            AI guidance, just for you.
          </CustomText>

          <TouchableOpacity
            style={tw`bg-purple-600 py-3 px-4 rounded-xl flex-row items-center justify-center`}
            activeOpacity={0.8}
            onPress={handleAiSearchPress}
          >
            <Ionicons name="flash" size={16} color="white" style={tw`mr-2`} />
            <CustomText weight="Medium" size="3.3" color="white">
              Start AI Search
            </CustomText>
          </TouchableOpacity>
        </View>

        <View style={tw`mt-6 mb-14`}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <CustomText weight="SemiBold" size="sm" color="#1f2937">
              Recent Activity
            </CustomText>
            <TouchableOpacity style={tw`bg-gray-800 px-4 py-2 rounded-lg`}>
              <CustomText size="xs" color="#fff">
                View all
              </CustomText>
            </TouchableOpacity>
          </View>

          {/* Activity Items */}
          <View style={tw`gap-3`}>
            {loadingActivities ? (
              <View
                style={tw`p-4 bg-white border border-gray-200 rounded-xl items-center`}
              >
                <ActivityIndicator size="small" color="#f97316" />
                <CustomText size="xs" color="#6b7280" style={tw`mt-2`}>
                  Loading activities...
                </CustomText>
              </View>
            ) : recentActivities.length === 0 ? (
              <View
                style={tw`p-4 bg-white border border-gray-200 rounded-xl items-center`}
              >
                <Ionicons name="eye-off-outline" size={24} color="#d1d5db" />
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mt-2 text-center`}
                >
                  No recent activities yet
                </CustomText>
                <CustomText
                  size="2.5"
                  color="#9ca3af"
                  style={tw`mt-1 text-center`}
                >
                  Your sightings will appear here
                </CustomText>
              </View>
            ) : (
              <>
                {/* Display only the 2 most recent activities */}
                {recentActivities.slice(0, 2).map((activity) => (
                  <TouchableOpacity
                    key={activity.id}
                    style={tw`p-4 bg-white border border-gray-200 rounded-xl flex-row items-start`}
                    onPress={() => {
                      showModal(
                        `Sighting details for ${activity.petName}`,
                        "info"
                      );
                    }}
                  >
                    <View style={tw`w-5 h-5 items-center justify-center mr-3`}>
                      <Ionicons
                        name="eye"
                        size={18}
                        color={
                          activity.type === "sighting" ? "#f97316" : "#7c3aed"
                        }
                      />
                    </View>
                    <View style={tw`flex-1`}>
                      <CustomText
                        weight="Medium"
                        size="xs"
                        color="#1f2937"
                        style={tw`mb-0.5`}
                      >
                        {activity.title}
                      </CustomText>
                      <CustomText size="xs" color="#6b7280">
                        {activity.description}
                      </CustomText>
                      <CustomText size="2.5" color="#9ca3af" style={tw`mt-1`}>
                        {activity.date}
                      </CustomText>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Remove the AI Analysis placeholder since we only want 2 activities total */}
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ==== PET REGISTRATION MODAL ==== */}
      <Modal animationType="slide" transparent={false} visible={modalVisible}>
        <SafeAreaView style={tw`flex-1 bg-white`}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={tw`flex-1`}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            {/* Modal Header - Fixed */}
            <View
              style={tw`flex-row items-center justify-between p-4 border-b border-gray-100`}
            >
              <CustomText size="base" weight="Medium">
                Register a Pet
              </CustomText>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={tw`p-2 rounded-full bg-gray-800`}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={tw`flex-1`}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={true}
              contentContainerStyle={tw`p-4 pb-6`}
              scrollEnabled={true}
              nestedScrollEnabled={true}
            >
              {/* ========== PET IMAGE UPLOAD ========== */}
              <View style={tw`mb-6`}>
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-3 uppercase`}
                >
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
                      style={tw`absolute -top-2 -right-2 bg-white rounded-full p-1`}
                    >
                      <Ionicons name="close" size={16} color="red" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={pickImage}
                    style={tw`w-full h-55 border-2 border-dashed border-gray-300 rounded-2xl items-center justify-center bg-gray-50`}
                  >
                    <Ionicons name="camera-outline" size={32} color="#9ca3af" />
                    <CustomText
                      size="xs"
                      color="#9ca3af"
                      style={tw`mt-2 text-center`}
                    >
                      Tap to upload{"\n"}pet photo
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
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-1 uppercase`}
                >
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
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-1 uppercase`}
                >
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
                        size="xs"
                        weight={
                          petData.species === option ? "SemiBold" : "Medium"
                        }
                        color={
                          petData.species === option ? "#2A80FD" : "#6b7280"
                        }
                      >
                        {option}
                      </CustomText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* BREED */}
              <View style={tw`mb-4`}>
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-1 uppercase`}
                >
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
                    size="xs"
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
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-1 uppercase`}
                >
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
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-1 uppercase`}
                >
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
                        size="xs"
                        weight={
                          petData.gender === option ? "SemiBold" : "Medium"
                        }
                        color={
                          petData.gender === option ? "#2A80FD" : "#6b7280"
                        }
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
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-1 uppercase`}
                >
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
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-1 uppercase`}
                >
                  HEALTH STATUS *
                </CustomText>
                {validationErrors.health && (
                  <CustomText size="xs" color="red" style={tw`mb-1`}>
                    {validationErrors.health}
                  </CustomText>
                )}
                <View style={tw`flex-row flex-wrap gap-2`}>
                  {["Healthy", "Injured", "Recovering", "Sick"].map(
                    (option) => (
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
                          weight={
                            petData.health === option ? "SemiBold" : "Medium"
                          }
                          color={
                            petData.health === option ? "#2A80FD" : "#6b7280"
                          }
                        >
                          {option}
                        </CustomText>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>

              {/* BEHAVIOR */}
              <View style={tw`mb-4`}>
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-1 uppercase`}
                >
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
                              petData.behavior === option
                                ? "#2A80FD"
                                : "#e5e7eb",
                            backgroundColor:
                              petData.behavior === option
                                ? "#eff6ff"
                                : "#f9fafb",
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
              <View style={tw`mb-0`}>
                <CustomText
                  size="xs"
                  color="#6b7280"
                  style={tw`mb-1 uppercase`}
                >
                  SPECIAL NEEDS
                </CustomText>
                <CustomInput
                  placeholder="e.g. Daily heart medication"
                  value={petData.specialNeeds}
                  onChangeText={(text) =>
                    handleInputChange("specialNeeds", text)
                  }
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
                style={[
                  tw`bg-blue-500 p-4 rounded-2xl items-center`,
                  isSaving && tw`opacity-50`,
                ]}
                activeOpacity={0.85}
                disabled={isSaving}
              >
                {isSaving ? (
                  <CustomText weight="Medium" color="white" size="sm">
                    Saving...
                  </CustomText>
                ) : (
                  <CustomText weight="Medium" color="white" size="sm">
                    Save Pet
                  </CustomText>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
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
                  petData.species?.toLowerCase() || ""
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
                      onPress={handleCustomBreedSubmit}
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
                        size="xs"
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

      {/* Error Modal */}
      <ErrorModal
        visible={errorModalVisible}
        onClose={() => setErrorModalVisible(false)}
        description={modalMessage}
        type={modalType}
      />

      {/* ==== LOST/FOUND REPORT MODAL ==== */}
      <ErrorModal
        visible={reportTypeModalVisible}
        onClose={() => setReportTypeModalVisible(false)}
        description="What type of report do you want to make?"
        type="info"
        customButtons={
          <>
            {/* Row with Lost & Found */}
            <View style={tw`flex-row justify-between mb-4`}>
              {/* Lost Pet Button */}
              <TouchableOpacity
                style={tw`flex-1 bg-red-500 py-3 rounded-xl mr-2`}
                onPress={() => {
                  setReportTypeModalVisible(false);
                  navigation.navigate("ReportScreen", { reportType: "lost" });
                }}
              >
                <CustomText
                  color="white"
                  weight="Medium"
                  size="xs"
                  style={tw`text-center`}
                >
                  Lost pet
                </CustomText>
              </TouchableOpacity>

              {/* Found Pet Button */}
              <TouchableOpacity
                style={tw`flex-1 bg-green-500 py-3 rounded-xl ml-2`}
                onPress={() => {
                  setReportTypeModalVisible(false);
                  navigation.navigate("ReportScreen", { reportType: "found" });
                }}
              >
                <CustomText
                  color="white"
                  weight="Medium"
                  size="xs"
                  style={tw`text-center`}
                >
                  Found pet
                </CustomText>
              </TouchableOpacity>
            </View>

            {/* Cancel centered */}
            <TouchableOpacity onPress={() => setReportTypeModalVisible(false)}>
              <CustomText size="xs" color="#6b7280" style={tw`text-center`}>
                Cancel
              </CustomText>
            </TouchableOpacity>
          </>
        }
      />

      {/* ==== AI SEARCH MODAL ==== */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={aiSearchModalVisible}
        onRequestClose={() => {
          setAiSearchModalVisible(false);
          setSelectedPet(null);
          setEditingPetData(null);
          setIsEditing(false);
        }}
      >
        <SafeAreaView style={tw`flex-1 bg-white`}>
          {/* Modal Header */}
          <View
            style={tw`flex-row items-center justify-between p-4 border-b border-gray-100`}
          >
            <CustomText size="sm" weight="Medium">
              {selectedPet
                ? isEditing
                  ? "Edit Pet Details"
                  : "Pet Details"
                : "Select a Pet"}
            </CustomText>
            <TouchableOpacity
              onPress={() => {
                setAiSearchModalVisible(false);
                setSelectedPet(null);
                setEditingPetData(null);
                setIsEditing(false);
              }}
              style={tw`p-2 rounded-full bg-gray-800`}
            >
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={tw`flex-1`}
            contentContainerStyle={tw`p-4 pb-6`}
            showsVerticalScrollIndicator={false}
          >
            {!selectedPet ? (
              // Pet Selection View
              <>
                <View style={tw`flex-row items-start mb-6`}>
                  <Ionicons
                    name="flash"
                    size={16}
                    color="#9e00baff"
                    style={tw`mr-2 mt-0.5`}
                  />
                  <CustomText
                    size="xs"
                    weight="Regular"
                    style={tw`text-gray-500 flex-1`}
                  >
                    AI predicts your pet’s likely routes based on behavior and
                    environment. You can start AI searches for up to 2 pets
                    only.
                  </CustomText>
                </View>

                {userPets.length === 0 ? (
                  <View style={tw`items-center justify-center py-10`}>
                    <Ionicons name="paw-outline" size={40} color="#9ca3af" />
                    <CustomText
                      size="sm"
                      color="#6b7280"
                      style={tw`mt-4 text-center`}
                    >
                      No pets registered yet
                    </CustomText>
                    <CustomText
                      size="xs"
                      color="#6b7280"
                      style={tw`mt-2 text-center`}
                    >
                      Please register a pet before using AI search
                    </CustomText>
                    <TouchableOpacity
                      onPress={() => {
                        setAiSearchModalVisible(false);
                        setModalVisible(true);
                      }}
                      style={tw`bg-blue-500 px-6 py-3 rounded-xl mt-4`}
                    >
                      <CustomText size="sm" weight="Medium" color="white">
                        Register Pet
                      </CustomText>
                    </TouchableOpacity>
                  </View>
                ) : (
                  userPets.map((pet, index) => (
                    <TouchableOpacity
                      key={pet.id}
                      onPress={() => handlePetSelect(pet)}
                      style={[
                        tw`p-4 rounded-xl mb-3 flex-row items-center`,
                        index % 2 === 0 ? tw`bg-gray-800` : tw`bg-gray-100`,
                      ]}
                    >
                      <Image
                        source={{ uri: pet.photoUrl }}
                        style={tw`w-12 h-12 rounded-full mr-3`}
                        resizeMode="cover"
                      />
                      <View style={tw`flex-1`}>
                        <CustomText
                          weight="Medium"
                          size="sm"
                          style={
                            index % 2 === 0 ? tw`text-white` : tw`text-gray-900`
                          }
                        >
                          {pet.petname}
                        </CustomText>
                        <CustomText
                          size="xs"
                          style={
                            index % 2 === 0
                              ? tw`text-gray-300`
                              : tw`text-gray-600`
                          }
                        >
                          {pet.breed} • {pet.species}
                        </CustomText>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={index % 2 === 0 ? "#fff" : "#9ca3af"}
                      />
                    </TouchableOpacity>
                  ))
                )}
              </>
            ) : (
              // Pet Details View (with editing capability)
              <>
                {isEditing ? (
                  // Edit Mode
                  <>
                    <View style={tw`items-center mb-6`}>
                      <Image
                        source={{ uri: editingPetData.photoUrl }}
                        style={tw`w-24 h-24 rounded-full`}
                        resizeMode="cover"
                      />
                    </View>

                    {/* Editable Fields */}
                    <View style={tw`mb-4`}>
                      <CustomText
                        size="xs"
                        color="#6b7280"
                        style={tw`mb-1 uppercase`}
                      >
                        PET BEHAVIOR
                      </CustomText>
                      <CustomInput
                        value={editingPetData.behavior || ""}
                        onChangeText={(text) =>
                          handleEditPetData("behavior", text)
                        }
                        placeholder="Describe pet behavior"
                      />
                    </View>

                    <View style={tw`mb-4`}>
                      <CustomText
                        size="xs"
                        color="#6b7280"
                        style={tw`mb-1 uppercase`}
                      >
                        HEALTH CONDITION
                      </CustomText>
                      <CustomInput
                        value={editingPetData.health || ""}
                        onChangeText={(text) =>
                          handleEditPetData("health", text)
                        }
                        placeholder="Describe health condition"
                      />
                    </View>

                    <View style={tw`mb-4`}>
                      <CustomText
                        size="xs"
                        color="#6b7280"
                        style={tw`mb-1 uppercase`}
                      >
                        SPECIAL NEEDS
                      </CustomText>
                      <CustomInput
                        value={editingPetData.specialNeeds || ""}
                        onChangeText={(text) =>
                          handleEditPetData("specialNeeds", text)
                        }
                        placeholder="Any special needs or requirements"
                        multiline
                        numberOfLines={3}
                      />
                    </View>

                    <View style={tw`mb-4`}>
                      <CustomText
                        size="xs"
                        color="#6b7280"
                        style={tw`mb-1 uppercase`}
                      >
                        DISTINGUISHING FEATURES
                      </CustomText>
                      <CustomInput
                        value={editingPetData.features || ""}
                        onChangeText={(text) =>
                          handleEditPetData("features", text)
                        }
                        placeholder="Unique features or markings"
                        multiline
                        numberOfLines={3}
                      />
                    </View>

                    <View style={tw`flex-row gap-3 mt-4`}>
                      <TouchableOpacity
                        onPress={() => setIsEditing(false)}
                        style={tw`flex-1 py-3 rounded-xl border border-gray-300 items-center`}
                      >
                        <CustomText size="sm" weight="Medium">
                          Cancel
                        </CustomText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSavePetEdits}
                        style={tw`flex-1 bg-blue-500 py-3 rounded-xl items-center`}
                      >
                        <CustomText size="sm" weight="Medium" color="white">
                          Save Changes
                        </CustomText>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  // View Mode
                  <>
                    <View style={tw`items-center mb-6`}>
                      <Image
                        source={{ uri: selectedPet.photoUrl }}
                        style={tw`w-24 h-24 rounded-full`}
                        resizeMode="cover"
                      />
                      <CustomText weight="Bold" size="base" style={tw`mt-2`}>
                        {selectedPet.petname}
                      </CustomText>
                      <CustomText size="sm" style={tw`text-gray-500`}>
                        {selectedPet.breed} | {selectedPet.species}
                      </CustomText>
                    </View>

                    {/* Display Pet Details */}
                    <View style={tw`mb-4 p-4 bg-gray-100 rounded-xl`}>
                      <CustomText
                        size="xs"
                        color="#6b7280"
                        style={tw`mb-1 uppercase`}
                      >
                        BEHAVIOR
                      </CustomText>
                      <CustomText size="sm">
                        {selectedPet.behavior || "Not specified"}
                      </CustomText>
                    </View>

                    <View style={tw`mb-4 p-4 bg-gray-100 rounded-xl`}>
                      <CustomText
                        size="xs"
                        color="#6b7280"
                        style={tw`mb-1 uppercase`}
                      >
                        HEALTH CONDITION
                      </CustomText>
                      <CustomText size="sm">
                        {selectedPet.health || "Not specified"}
                      </CustomText>
                    </View>

                    <View style={tw`mb-4 p-4 bg-gray-100 rounded-xl`}>
                      <CustomText
                        size="xs"
                        color="#6b7280"
                        style={tw`mb-1 uppercase`}
                      >
                        SPECIAL NEEDS
                      </CustomText>
                      <CustomText size="sm">
                        {selectedPet.specialNeeds || "None"}
                      </CustomText>
                    </View>

                    <View style={tw`mb-6 p-4 bg-gray-100 rounded-xl`}>
                      <CustomText
                        size="xs"
                        color="#6b7280"
                        style={tw`mb-1 uppercase`}
                      >
                        DISTINGUISHING FEATURES
                      </CustomText>
                      <CustomText size="sm">
                        {selectedPet.features || "Not specified"}
                      </CustomText>
                    </View>

                    <View style={tw`flex-row gap-3`}>
                      <TouchableOpacity
                        onPress={() => setIsEditing(true)}
                        style={tw`flex-1 py-3 rounded-xl border border-gray-300 items-center`}
                      >
                        <CustomText size="sm" weight="Medium">
                          Edit Details
                        </CustomText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleStartAiAnalysis}
                        style={tw`flex-1 bg-purple-600 py-3 rounded-xl items-center`}
                      >
                        <CustomText size="sm" weight="Medium" color="white">
                          Start AI Analysis
                        </CustomText>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={() => setSelectedPet(null)}
                      style={tw`py-3 mt-4 items-center`}
                    >
                      <CustomText size="sm" color="#6b7280">
                        ← Back to pet selection
                      </CustomText>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
