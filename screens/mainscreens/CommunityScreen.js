import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
} from "react-native";
import tw from "twrnc";
import CustomText from "../../components/CustomText";
import CustomInput from "../../components/CustomInput";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { db, auth } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import moment from "moment";
import {
  reportSighting,
  getUserNotifications,
  markSightingAsFalse,
  submitPetClaim,
} from "../../utils/PetService";
import ErrorModal from "../../components/CustomModal";
import PagerView from "react-native-pager-view";
import MapView, { Marker } from "react-native-maps";

const CommunityScreen = () => {
  const navigation = useNavigation();
  const [communityPosts, setCommunityPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = auth.currentUser?.uid;

  const [selectedPost, setSelectedPost] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const pagerRef = useRef(null);

  const [showMap, setShowMap] = useState(false);
  const coordinates = selectedPost?.coordinates || null;

  const [showSightingForm, setShowSightingForm] = useState(false);
  const [sightingData, setSightingData] = useState({
    images: [],
    location: "",
    coordinates: null,
    dateTime: new Date(),
    notes: "",
    condition: "",
    contact: "",
  });
  const [sightingErrors, setSightingErrors] = useState({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmittingSighting, setIsSubmittingSighting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const [hasNewNotification, setHasNewNotification] = useState(false);

  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimData, setClaimData] = useState({
    proofImages: [],
    contact: "",
    additionalInfo: "",
  });
  const [claimErrors, setClaimErrors] = useState({});

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

  const statusBarHeight =
    Platform.OS === "android" ? StatusBar.currentHeight : 0;

  const formatDateTime = (date) => {
    if (!date) return "Unknown date";
    try {
      let jsDate;
      if (date.toDate && typeof date.toDate === "function") {
        jsDate = date.toDate();
      } else {
        jsDate = new Date(date);
      }
      const month = jsDate.toLocaleString("en-US", { month: "short" });
      const day = jsDate.getDate();
      const year = jsDate.getFullYear();
      const time = jsDate.toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${month} ${day} ${year}, at ${time}`;
    } catch {
      return "Invalid date";
    }
  };

  useEffect(() => {
    const fetchUserData = async (ownerId) => {
      try {
        const userDoc = await getDoc(doc(db, "users", ownerId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          return {
            firstName: data.firstName || "",
            fullName: data.fullName || "",
          };
        }
      } catch {
        return { firstName: "", fullName: "" };
      }
      return { firstName: "", fullName: "" };
    };

    const lostQuery = query(
      collection(db, "lostPets"),
      orderBy("createdAt", "desc")
    );
    const foundQuery = query(
      collection(db, "foundPets"),
      orderBy("createdAt", "desc")
    );

    const unsubLost = onSnapshot(lostQuery, async (snapshot) => {
      const lostReports = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          if (data.ownerId === currentUserId) {
            return {
              id: docSnap.id,
              type: "lost",
              ...data,
              displayName: "You",
            };
          }
          try {
            const userData = await fetchUserData(data.ownerId);
            return {
              id: docSnap.id,
              type: "lost",
              ...data,
              displayName:
                userData.firstName || userData.fullName || "Anonymous",
            };
          } catch {
            return {
              id: docSnap.id,
              type: "lost",
              ...data,
              displayName: "Anonymous",
            };
          }
        })
      );
      setCommunityPosts((prev) => {
        const foundReports = prev.filter((p) => p.type === "found");
        return [...lostReports, ...foundReports].sort(
          (a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.()
        );
      });
      setLoading(false);
    });

    const unsubFound = onSnapshot(foundQuery, async (snapshot) => {
      const foundReports = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          if (data.ownerId === currentUserId) {
            return {
              id: docSnap.id,
              type: "found",
              ...data,
              displayName: "You",
            };
          }
          try {
            const userData = await fetchUserData(data.ownerId);
            return {
              id: docSnap.id,
              type: "found",
              ...data,
              displayName:
                userData.firstName || userData.fullName || "Anonymous",
            };
          } catch {
            return {
              id: docSnap.id,
              type: "found",
              ...data,
              displayName: "Anonymous",
            };
          }
        })
      );
      setCommunityPosts((prev) => {
        const lostReports = prev.filter((p) => p.type === "lost");
        return [...lostReports, ...foundReports].sort(
          (a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.()
        );
      });
      setLoading(false);
    });

    return () => {
      unsubLost();
      unsubFound();
    };
  }, [currentUserId]);

  const openDetails = (post) => {
    setSelectedPost(post);
    setCurrentImageIndex(0);
    setDetailsModalVisible(true);
    setShowSightingForm(false);
    setShowClaimForm(false);
    resetSightingForm();
    resetClaimForm();
  };

  const closeDetails = () => {
    setSelectedPost(null);
    setDetailsModalVisible(false);
    setShowSightingForm(false);
    setShowClaimForm(false);
    resetSightingForm();
    resetClaimForm();
  };

  const handlePageSelected = (e) => {
    setCurrentImageIndex(e.nativeEvent.position);
  };

  const resetSightingForm = () => {
    setSightingData({
      images: [],
      location: "",
      coordinates: null,
      dateTime: new Date(),
      notes: "",
      condition: "",
      contact: "",
    });
    setSightingErrors({});
  };

  const resetClaimForm = () => {
    setClaimData({
      proofImages: [],
      contact: "",
      additionalInfo: "",
    });
    setClaimErrors({});
  };

  const handleReportSighting = () => {
    setShowSightingForm(true);
  };

  const handleClaimPet = () => {
    setShowClaimForm(true);
  };

  const handleSightingImagePicker = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setErrorMessage("Camera roll permission is required to add photos");
        setShowErrorModal(true);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map((asset) => ({
          uri: asset.uri,
          type: "image/jpeg",
          name: `sighting_${Date.now()}.jpg`,
        }));

        setSightingData((prev) => ({
          ...prev,
          images: [...prev.images, ...newImages].slice(0, 5), // Max 5 images
        }));

        if (sightingErrors.images) {
          setSightingErrors((prev) => ({ ...prev, images: null }));
        }
      }
    } catch (error) {
      setErrorMessage("Failed to select images. Please try again.");
      setShowErrorModal(true);
    }
  };

  const removeSightingImage = (index) => {
    setSightingData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleClaimImagePicker = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setErrorMessage(
          "Camera roll permission is required to add proof photos"
        );
        setShowErrorModal(true);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map((asset) => ({
          uri: asset.uri,
          type: "image/jpeg",
          name: `proof_${Date.now()}.jpg`,
        }));

        setClaimData((prev) => ({
          ...prev,
          proofImages: [...prev.proofImages, ...newImages].slice(0, 5),
        }));

        if (claimErrors.proofImages) {
          setClaimErrors((prev) => ({ ...prev, proofImages: null }));
        }
      }
    } catch (error) {
      setErrorMessage("Failed to select images. Please try again.");
      setShowErrorModal(true);
    }
  };

  const removeClaimImage = (index) => {
    setClaimData((prev) => ({
      ...prev,
      proofImages: prev.proofImages.filter((_, i) => i !== index),
    }));
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setErrorMessage(
          "Location permission is required to get current location"
        );
        setShowErrorModal(true);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const locationString = `${address.street || ""} ${address.city || ""} ${
          address.region || ""
        }`.trim();

        setSightingData((prev) => ({
          ...prev,
          location: locationString,
          coordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        }));

        if (sightingErrors.location) {
          setSightingErrors((prev) => ({ ...prev, location: null }));
        }
      }
    } catch (error) {
      setErrorMessage("Failed to get current location. Please enter manually.");
      setShowErrorModal(true);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const validateSightingForm = () => {
    const errors = {};

    if (!sightingData.images || sightingData.images.length === 0) {
      errors.images = "At least one photo is required";
    }

    if (!sightingData.location.trim()) {
      errors.location = "Location is required";
    }

    if (!sightingData.condition.trim()) {
      errors.condition = "Pet condition is required";
    }

    if (!sightingData.contact.trim()) {
      errors.contact = "Contact information is required";
    }

    setSightingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateClaimForm = () => {
    const errors = {};

    if (!claimData.contact?.trim()) {
      errors.contact = "Contact information is required";
    }

    if (!claimData.proofImages || claimData.proofImages.length === 0) {
      errors.proofImages = "At least one proof image is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddProofImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.8,
      });

      if (!result.didCancel && result.assets && result.assets.length > 0) {
        const newImage = {
          uri: result.assets[0].uri,
          type: result.assets[0].type || "image/jpeg",
          name: result.assets[0].fileName || `proof_${Date.now()}.jpg`,
        };

        setClaimData((prev) => ({
          ...prev,
          proofImages: [...(prev.proofImages || []), newImage],
        }));
      }
    } catch (error) {
      console.error("Error selecting image:", error);
      setErrorMessage("Failed to select image");
      setShowErrorModal(true);
    }
  };

  const handleRemoveProofImage = (index) => {
    setClaimData((prev) => ({
      ...prev,
      proofImages: prev.proofImages.filter((_, i) => i !== index),
    }));
  };

  const handleSubmitSighting = async () => {
    if (!validateSightingForm()) {
      return;
    }

    try {
      setIsSubmittingSighting(true);

      await reportSighting(sightingData, selectedPost.id);

      setShowSuccessModal(true);
      setShowSightingForm(false);
      resetSightingForm();
    } catch (error) {
      setErrorMessage(error.message || "Failed to submit sighting report");
      setShowErrorModal(true);
    } finally {
      setIsSubmittingSighting(false);
    }
  };

  // Update the handleSubmitClaim function
  const handleSubmitClaim = async () => {
    if (!validateClaimForm()) {
      return;
    }

    try {
      setIsSubmittingSighting(true); // Reuse loading state

      await submitPetClaim(selectedPost.id, claimData);

      setShowSuccessModal(true);
      setShowClaimForm(false);
      resetClaimForm();

      setSuccessMessage(
        "Claim submitted successfully! The finder will review your request."
      );
    } catch (error) {
      setErrorMessage(error.message || "Failed to submit claim request");
      setShowErrorModal(true);
    } finally {
      setIsSubmittingSighting(false);
    }
  };

  const handleDateTimeConfirm = (date) => {
    setSightingData((prev) => ({ ...prev, dateTime: date }));
    setShowDatePicker(false);
  };

  const renderPostCard = (post) => (
    <TouchableOpacity
      key={post.id}
      activeOpacity={0.9}
      onPress={() => openDetails(post)}
    >
      <View style={tw`bg-white rounded-xl mb-6 shadow-sm overflow-hidden`}>
        {/* User Info */}
        <View style={tw`flex-row items-center justify-between p-4`}>
          <View style={tw`flex-row items-center`}>
            <Image
              source={{
                uri: post.userAvatar || post.photoUrls?.[0] || post.photoUrl,
              }}
              style={tw`w-10 h-10 rounded-full mr-2 bg-gray-200`}
            />
            <View>
              <CustomText weight="Medium" size="sm" color="#1f2937">
                {(post.displayName || "Anonymous")
                  .split(" ")
                  .slice(0, 2)
                  .join(" ")}
              </CustomText>
              <CustomText size="xs" color="#6b7280">
                {post.type === "lost"
                  ? post.lastSeenLocation || post.location || "Unknown Location"
                  : post.foundLocation || post.location || "Unknown Location"}
              </CustomText>
            </View>
          </View>
          <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
        </View>

        {/* Pet Images with Swiping */}
        {post.photoUrls && post.photoUrls.length > 0 && (
          <View style={tw`relative`}>
            <PagerView style={tw`w-full h-50`} initialPage={0}>
              {post.photoUrls.map((uri, index) => (
                <View key={index} style={tw`flex-1`}>
                  <Image
                    source={{ uri }}
                    style={tw`w-full h-full`}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </PagerView>

            {/* Image Indicator Dots */}
            {post.photoUrls.length > 1 && (
              <View
                style={tw`absolute bottom-3 w-full flex-row justify-center`}
              >
                {post.photoUrls.map((_, index) => (
                  <View
                    key={index}
                    style={tw`w-2 h-2 rounded-full mx-1 bg-white opacity-80`}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Pet Info */}
        <View style={tw`flex-row items-center justify-between px-4 pt-3 pb-4`}>
          <View>
            <CustomText weight="SemiBold" size="sm" color="#1f2937">
              {post.petname || "Unknown Pet"}
            </CustomText>
            <CustomText size="xs" color="#6b7280">
              {post.species} | {post.breed}
            </CustomText>
          </View>
          <View
            style={tw.style(
              "px-3 py-1.5 rounded-full rounded-lg",
              post.type === "lost" ? "bg-red-100" : "bg-blue-100"
            )}
          >
            <CustomText
              weight="SemiBold"
              size="sm"
              color={post.type === "lost" ? "#dc2626" : "#2563eb"}
            >
              {post.type === "lost" ? "LOST" : "FOUND"}
            </CustomText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View
        style={[
          tw`flex-row justify-between items-center px-4 mb-4`,
          {
            paddingTop: statusBarHeight || 16,
          },
        ]}
      >
        <View style={tw`mt-3`}>
          <CustomText style={tw`text-gray-800`} size="base" weight="Medium">
            Community
          </CustomText>
          <CustomText style={tw`text-xs text-gray-600`}>
            Together we find them
          </CustomText>
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

      {/* Posts */}
      <ScrollView
        style={tw`flex-1 px-4`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-8`}
      >
        <View style={tw`mt-2 mb-18`}>
          {loading ? (
            <View style={tw`flex-1 justify-center items-center py-20`}>
              <ActivityIndicator size="large" color="#f97316" />
              <CustomText size="sm" color="#6b7280" style={tw`mt-4`}>
                Loading community posts...
              </CustomText>
            </View>
          ) : communityPosts.length === 0 ? (
            <View style={tw`flex-1 justify-center items-center py-20`}>
              <Ionicons name="people-outline" size={48} color="#d1d5db" />
              <CustomText
                weight="SemiBold"
                size="sm"
                color="#9ca3af"
                style={tw`mt-4`}
              >
                No posts yet
              </CustomText>
              <CustomText
                size="xs"
                color="#9ca3af"
                style={tw`mt-2 text-center`}
              >
                Be the first to share a lost or found pet
              </CustomText>
            </View>
          ) : (
            communityPosts.map(renderPostCard)
          )}
        </View>
      </ScrollView>

      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        onRequestClose={closeDetails}
      >
        <SafeAreaView style={tw`flex-1 bg-white`}>
          {/* Header */}
          <View
            style={tw`flex-row items-center px-4 py-3 border-b border-gray-200`}
          >
            <TouchableOpacity
              onPress={closeDetails}
              style={tw`bg-gray-800 p-2 rounded-full`}
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <CustomText
              size="sm"
              weight="Medium"
              color="#1f2937"
              style={tw`flex-1 text-center`}
            >
              {showSightingForm
                ? "Report Sighting"
                : showClaimForm
                ? "Claim Pet"
                : "Report Details"}
            </CustomText>
            <View style={tw`w-6`} />
          </View>

          {selectedPost && !showSightingForm && !showClaimForm && (
            <ScrollView
              style={tw`flex-1 bg-gray-50`}
              showsVerticalScrollIndicator={false}
            >
              {/* Pet Images with Swiping */}
              {selectedPost.photoUrls && selectedPost.photoUrls.length > 0 && (
                <View style={tw`relative bg-white`}>
                  {!showMap ? (
                    <PagerView
                      ref={pagerRef}
                      style={tw`w-full h-70`}
                      initialPage={0}
                      onPageSelected={handlePageSelected}
                    >
                      {selectedPost.photoUrls.map((uri, index) => (
                        <View key={index} style={tw`flex-1`}>
                          <Image
                            source={{ uri }}
                            style={tw`w-full h-full`}
                            resizeMode="cover"
                          />
                        </View>
                      ))}
                    </PagerView>
                  ) : coordinates ? (
                    <MapView
                      style={tw`w-full h-70`}
                      initialRegion={{
                        latitude: coordinates.latitude,
                        longitude: coordinates.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                    >
                      <Marker
                        coordinate={coordinates}
                        title={selectedPost.petname || "Pet Location"}
                        description={selectedPost.location}
                      />
                    </MapView>
                  ) : (
                    <View style={tw`w-full h-70 items-center justify-center`}>
                      <CustomText>No coordinates available</CustomText>
                    </View>
                  )}

                  {/* Show dots only when images are visible */}
                  {!showMap && selectedPost.photoUrls.length > 1 && (
                    <View
                      style={tw`absolute bottom-4 w-full flex-row justify-center`}
                    >
                      {selectedPost.photoUrls.map((_, index) => (
                        <View
                          key={index}
                          style={tw`w-2 h-2 rounded-full mx-1 ${
                            index === currentImageIndex
                              ? "bg-white"
                              : "bg-white opacity-50"
                          }`}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Pet Info Section */}
              <View style={tw`bg-white px-4 py-4 flex-row justify-between`}>
                <View style={tw`flex-1`}>
                  {/* Reward Badge */}
                  {selectedPost.reward && (
                    <View
                      style={tw`self-start py-1 rounded-full flex-row items-center`}
                    >
                      <Ionicons
                        name="gift"
                        size={12}
                        color="#ffcb21ff"
                        style={tw`mb-1`}
                      />
                      <CustomText
                        size="2.8"
                        weight="Medium"
                        color="#ffcb21ff"
                        style={tw`ml-1`}
                      >
                        Reward offered
                      </CustomText>
                    </View>
                  )}

                  {/* Pet Name */}
                  <CustomText
                    style={tw`text-base`}
                    weight="SemiBold"
                    color="#1f2937"
                  >
                    {selectedPost.petname || "Unknown Pet"}
                  </CustomText>

                  {/* Species & Breed */}
                  <CustomText size="xs" color="#6b7280" style={tw`mt-1`}>
                    {selectedPost.species} | {selectedPost.breed}
                  </CustomText>

                  {/* Lost/Found Badge */}
                  <View
                    style={tw`mt-2 self-start px-4 py-1.5 rounded-lg ${
                      selectedPost.type === "lost"
                        ? "bg-[#FE0101]"
                        : "bg-green-600"
                    }`}
                  >
                    <CustomText weight="Bold" size="xs" color="white">
                      {selectedPost.type === "lost" ? "LOST" : "FOUND"}
                    </CustomText>
                  </View>
                </View>

                {/* Show Map Button */}
                <TouchableOpacity
                  style={tw`ml-4 bg-blue-500 px-3 py-2 h-9 rounded-lg flex-row items-center self-start`}
                  onPress={() => setShowMap(!showMap)}
                >
                  <Ionicons name="map-outline" size={14} color="white" />
                  <CustomText
                    size="xs"
                    weight="Medium"
                    color="white"
                    style={tw`ml-1`}
                  >
                    {showMap ? "Show Photos" : "Show Map"}
                  </CustomText>
                </TouchableOpacity>
              </View>

              {/* Reporter Section */}
              <View style={tw`bg-white px-4 py-4`}>
                <CustomText
                  weight="SemiBold"
                  size="xs"
                  color="#1f2937"
                  style={tw`mb-3`}
                >
                  Reported By
                </CustomText>
                <View style={tw`flex-row items-center`}>
                  <Image
                    source={{
                      uri:
                        selectedPost.userAvatar || selectedPost.photoUrls?.[0],
                    }}
                    style={tw`w-10 h-10 rounded-full mr-3 bg-gray-200`}
                  />
                  <View style={tw`flex-1`}>
                    <CustomText weight="Medium" size="sm" color="#1f2937">
                      {selectedPost.displayName || "Anonymous"}
                    </CustomText>
                    <CustomText size="xs" color="#6b7280">
                      {selectedPost.type === "lost" ? "Owner" : "Finder"}
                    </CustomText>
                  </View>
                  <TouchableOpacity style={tw`p-2`}>
                    <Ionicons
                      name="ellipsis-vertical"
                      size={20}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Last Seen / Found Section */}
              <View style={tw`bg-white px-4 py-4`}>
                <CustomText
                  weight="SemiBold"
                  size="xs"
                  color="#1f2937"
                  style={tw`mb-3`}
                >
                  {selectedPost.type === "lost"
                    ? "Last Seen"
                    : "Found Location"}
                </CustomText>

                <View style={tw`mb-3`}>
                  <CustomText
                    weight="Medium"
                    size="xs"
                    color="#6b7280"
                    style={tw`mb-1`}
                  >
                    LOCATION
                  </CustomText>
                  <View style={tw`flex-row items-start`}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={
                        selectedPost.type === "lost" ? "#ef4444" : "#10b981"
                      }
                      style={tw`mt-0.5 mr-2`}
                    />
                    <CustomText size="sm" color="#1f2937">
                      {selectedPost.lastSeenLocation ||
                        selectedPost.foundLocation ||
                        selectedPost.location ||
                        "Unknown location"}
                    </CustomText>
                  </View>
                </View>

                {(selectedPost.lastSeenDate || selectedPost.foundDate) && (
                  <View>
                    <CustomText
                      weight="Medium"
                      size="xs"
                      color="#6b7280"
                      style={tw`mb-1`}
                    >
                      DATE & TIME
                    </CustomText>
                    <View style={tw`flex-row items-center`}>
                      <Ionicons
                        name="calendar-outline"
                        size={15}
                        color={
                          selectedPost.type === "lost" ? "#ef4444" : "#10b981"
                        }
                        style={tw`mr-2`}
                      />
                      <CustomText size="sm" color="#1f2937">
                        {formatDateTime(
                          selectedPost.lastSeenDate || selectedPost.foundDate
                        )}
                      </CustomText>
                    </View>
                  </View>
                )}
              </View>

              {/* Found Details Section for Found Reports */}
              {selectedPost.type === "found" && (
                <View style={tw`bg-white px-4 py-4`}>
                  <CustomText
                    weight="SemiBold"
                    size="xs"
                    color="#1f2937"
                    style={tw`mb-3`}
                  >
                    Found Details
                  </CustomText>

                  {/* Current Location */}
                  {selectedPost.currentLocation && (
                    <View style={tw`mb-3`}>
                      <CustomText
                        weight="Medium"
                        size="xs"
                        color="#6b7280"
                        style={tw`mb-1`}
                      >
                        CURRENT LOCATION
                      </CustomText>
                      <View style={tw`flex-row items-start`}>
                        <Ionicons
                          name="home-outline"
                          size={16}
                          color="#10b981"
                          style={tw`mt-0.5 mr-2`}
                        />
                        <CustomText size="sm" color="#1f2937">
                          {selectedPost.currentLocation}
                        </CustomText>
                      </View>
                    </View>
                  )}

                  {/* Availability */}
                  {selectedPost.availability && (
                    <View style={tw`mb-3`}>
                      <CustomText
                        weight="Medium"
                        size="xs"
                        color="#6b7280"
                        style={tw`mb-1`}
                      >
                        AVAILABILITY
                      </CustomText>
                      <View style={tw`flex-row items-start`}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#10b981"
                          style={tw`mt-0.5 mr-2`}
                        />
                        <CustomText size="sm" color="#1f2937">
                          {selectedPost.availability}
                        </CustomText>
                      </View>
                    </View>
                  )}

                  {/* Contact Information */}
                  {selectedPost.contact && (
                    <View>
                      <CustomText
                        weight="Medium"
                        size="xs"
                        color="#6b7280"
                        style={tw`mb-1`}
                      >
                        CONTACT INFORMATION
                      </CustomText>
                      <View style={tw`flex-row items-start`}>
                        <Ionicons
                          name="call-outline"
                          size={16}
                          color="#10b981"
                          style={tw`mt-0.5 mr-2`}
                        />
                        <CustomText size="sm" color="#1f2937">
                          {selectedPost.contact}
                        </CustomText>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Pet Details Section */}
              <View style={tw`bg-white px-4 py-4`}>
                <CustomText
                  weight="SemiBold"
                  size="xs"
                  color="#1f2937"
                  style={tw`mb-3`}
                >
                  Pet Details
                </CustomText>

                <View style={tw`flex-row justify-between mb-4`}>
                  <View style={tw`flex-1 mr-4`}>
                    <CustomText
                      weight="Medium"
                      size="xs"
                      color="#6b7280"
                      style={tw`mb-1`}
                    >
                      GENDER
                    </CustomText>
                    <View style={tw`flex-row items-center`}>
                      <Ionicons
                        name={
                          selectedPost.gender === "Female" ? "female" : "male"
                        }
                        size={14}
                        color="#6b7280"
                        style={tw`mr-1`}
                      />
                      <CustomText size="sm" color="#1f2937">
                        {selectedPost.gender || "Unknown"}
                      </CustomText>
                    </View>
                  </View>

                  <View style={tw`flex-1 mr-4`}>
                    <CustomText
                      weight="Medium"
                      size="xs"
                      color="#6b7280"
                      style={tw`mb-1`}
                    >
                      AGE
                    </CustomText>
                    <View style={tw`flex-row items-center`}>
                      <Ionicons
                        name="time"
                        size={14}
                        color="#6b7280"
                        style={tw`mr-1`}
                      />
                      <CustomText size="sm" color="#1f2937">
                        {selectedPost.age || "Unknown"}
                      </CustomText>
                    </View>
                  </View>

                  <View style={tw`flex-1`}>
                    <CustomText
                      weight="Medium"
                      size="xs"
                      color="#6b7280"
                      style={tw`mb-1`}
                    >
                      SIZE
                    </CustomText>
                    <View style={tw`flex-row items-center`}>
                      <Ionicons
                        name="resize"
                        size={14}
                        color="#6b7280"
                        style={tw`mr-1`}
                      />
                      <CustomText size="sm" color="#1f2937">
                        {selectedPost.size || "Medium"}
                      </CustomText>
                    </View>
                  </View>
                </View>

                <View style={tw`flex-row justify-between`}>
                  <View style={tw`flex-1`}>
                    <CustomText
                      weight="Medium"
                      size="xs"
                      color="#6b7280"
                      style={tw`mb-1`}
                    >
                      BEHAVIOR
                    </CustomText>
                    <View style={tw`flex-row items-center`}>
                      <Ionicons
                        name="happy"
                        size={14}
                        color="#6b7280"
                        style={tw`mr-1`}
                      />
                      <CustomText size="sm" color="#1f2937">
                        {selectedPost.behavior || "Friendly"}
                      </CustomText>
                    </View>
                  </View>

                  <View style={tw`flex-1`}>
                    <CustomText
                      weight="Medium"
                      size="xs"
                      color="#6b7280"
                      style={tw`mb-1`}
                    >
                      CONDITION
                    </CustomText>
                    <View style={tw`flex-row items-center`}>
                      <Ionicons
                        name="fitness"
                        size={14}
                        color="#6b7280"
                        style={tw`mr-1`}
                      />
                      <CustomText size="sm" color="#1f2937">
                        {selectedPost.health || "Not Specified"}
                      </CustomText>
                    </View>
                  </View>
                </View>
              </View>

              {/* Distinguishing Features */}
              {selectedPost.features && (
                <View style={tw`bg-white px-4 py-4`}>
                  <CustomText
                    weight="SemiBold"
                    size="xs"
                    color="#1f2937"
                    style={tw`mb-3`}
                  >
                    Distinguishing Features
                  </CustomText>
                  <View style={tw`flex-row items-start`}>
                    <Ionicons
                      name="finger-print-outline"
                      size={16}
                      color="#6b7280"
                      style={tw`mt-0.5 mr-2`}
                    />
                    <CustomText size="sm" color="#1f2937" style={tw`flex-1`}>
                      {selectedPost.features}
                    </CustomText>
                  </View>
                </View>
              )}

              {/* Special Needs */}
              {selectedPost.specialNeeds && (
                <View style={tw`bg-white px-4 py-4`}>
                  <CustomText
                    weight="SemiBold"
                    size="xs"
                    color="#1f2937"
                    style={tw`mb-3`}
                  >
                    Special Needs
                  </CustomText>
                  <View style={tw`flex-row items-start`}>
                    <Ionicons
                      name="medkit-outline"
                      size={16}
                      color="#ef4444"
                      style={tw`mt-0.5 mr-2`}
                    />
                    <CustomText size="sm" color="#1f2937" style={tw`flex-1`}>
                      {selectedPost.specialNeeds}
                    </CustomText>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {selectedPost && showSightingForm && (
            <SafeAreaView style={tw`flex-1 bg-white`}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={tw`flex-1`}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
              >
                {/* Scrollable Form Content */}
                <ScrollView
                  style={tw`flex-1`}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={tw`pb-6`}
                >
                  {/* Header Section */}
                  <View style={tw`flex-1 bg-white px-6 py-4`}>
                    <View style={tw`flex-row items-start`}>
                      <Ionicons
                        name="paw-outline"
                        size={12}
                        color="#0055ffff"
                        style={tw`mt-1 mr-2`}
                      />
                      <CustomText
                        size="2.8"
                        color="#6b7280"
                        style={tw`flex-1 leading-5`}
                      >
                        Thank you for helping {selectedPost.petname} to reunite
                        with their family. Please provide as much detail as
                        possible.
                      </CustomText>
                    </View>
                  </View>

                  <View style={tw`px-6`}>
                    {/* Photo Upload Section */}
                    <View style={tw`mb-6`}>
                      <CustomText
                        weight="Medium"
                        size="xs"
                        color="#1f2937"
                        style={tw`flex-1 mb-4`} // <-- allow text to shrink/grow, add spacing
                        numberOfLines={2} // <-- optional: prevents overflow
                      >
                        Photo of the Sighting
                        <CustomText size="base" color="#dc2626">
                          {" "}
                          *
                        </CustomText>
                      </CustomText>

                      {/* Show upload area only if no images */}
                      {sightingData.images.length === 0 && (
                        <TouchableOpacity
                          onPress={handleSightingImagePicker}
                          style={tw`border-2 border-dashed border-gray-300 rounded-2xl p-6 items-center justify-center bg-white mb-3`}
                        >
                          <View style={tw`bg-gray-50 rounded-full p-4 mb-3`}>
                            <Ionicons
                              name="camera-outline"
                              size={24}
                              color="#7b7b7bff"
                            />
                          </View>
                          <CustomText
                            weight="Regular"
                            size="xs"
                            color="#717171ff"
                            style={tw`mb-1`}
                          >
                            Tap to add photos
                          </CustomText>
                          <CustomText
                            size="xs"
                            color="#9ca3af"
                            style={tw`text-center`}
                          >
                            Up to 5 photos
                          </CustomText>
                        </TouchableOpacity>
                      )}

                      {/* Selected Images with Add More Button */}
                      {sightingData.images.length > 0 && (
                        <View>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={tw`mb-3 pt-2`}
                          >
                            {sightingData.images.map((image, index) => (
                              <View key={index} style={tw`relative mr-3`}>
                                <Image
                                  source={{ uri: image.uri }}
                                  style={tw`w-24 h-24 rounded-xl`}
                                  resizeMode="cover"
                                />
                                <TouchableOpacity
                                  onPress={() => removeSightingImage(index)}
                                  style={tw`absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center`}
                                >
                                  <Ionicons
                                    name="close"
                                    size={12}
                                    color="white"
                                  />
                                </TouchableOpacity>
                              </View>
                            ))}

                            {/* Add More Button - only show if less than 5 photos */}
                            {sightingData.images.length < 5 && (
                              <TouchableOpacity
                                onPress={handleSightingImagePicker}
                                style={tw`w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 items-center justify-center ml-1`}
                              >
                                <Ionicons
                                  name="add"
                                  size={20}
                                  color="#6b7280"
                                />
                                <CustomText
                                  size="xs"
                                  color="#6b7280"
                                  style={tw`mt-1 text-center`}
                                >
                                  Add More
                                </CustomText>
                              </TouchableOpacity>
                            )}
                          </ScrollView>
                        </View>
                      )}

                      <CustomText size="xs" color="#f97316" style={tw`mt-2`}>
                        Providing a clear picture could help the owner
                        identifying the pet
                      </CustomText>

                      {sightingErrors.images && (
                        <CustomText size="xs" color="#dc2626" style={tw`mt-2`}>
                          {sightingErrors.images}
                        </CustomText>
                      )}
                    </View>

                    {/* Location Section */}
                    <View style={tw`mb-6`}>
                      <View
                        style={tw`flex-row items-center justify-between mb-4`}
                      >
                        <CustomText
                          weight="Medium"
                          size="xs"
                          color="#1f2937"
                          style={tw`flex-1 mr-10`} // <-- allow text to shrink/grow, add spacing
                          numberOfLines={2} // <-- optional: prevents overflow
                        >
                          Location where you saw the pet
                          <CustomText size="base" color="#dc2626">
                            {" "}
                            *
                          </CustomText>
                        </CustomText>

                        <TouchableOpacity
                          onPress={getCurrentLocation}
                          disabled={isLoadingLocation}
                          style={tw`flex-row items-center px-3 py-2 bg-gray-800 rounded-xl`}
                        >
                          {isLoadingLocation ? (
                            <ActivityIndicator
                              size="small"
                              color="white"
                              style={{ transform: [{ scale: 0.6 }] }}
                            />
                          ) : (
                            <Ionicons
                              name="location-outline"
                              size={14}
                              color="white"
                            />
                          )}
                          <CustomText
                            size="xs"
                            color="white"
                            style={tw`ml-1 font-medium`}
                          >
                            Use Current
                          </CustomText>
                        </TouchableOpacity>
                      </View>

                      <View style={tw`bg-white rounded-2xl`}>
                        <CustomInput
                          placeholder="Enter the location where you saw the pet"
                          value={sightingData.location}
                          onChangeText={(text) =>
                            setSightingData((prev) => ({
                              ...prev,
                              location: text,
                            }))
                          }
                          style={tw`bg-transparent text-base`}
                          placeholderTextColor="#9ca3af"
                        />
                      </View>

                      {sightingErrors.location && (
                        <CustomText size="xs" color="#dc2626" style={tw`mt-2`}>
                          {sightingErrors.location}
                        </CustomText>
                      )}
                    </View>

                    {/* Date and Time Section */}
                    <View style={tw`mb-6`}>
                      <CustomText
                        weight="Medium"
                        size="xs"
                        color="#1f2937"
                        style={tw`flex-1 mb-4`}
                        numberOfLines={2}
                      >
                        When did you see the pet?
                        <CustomText size="base" color="#dc2626">
                          {" "}
                          *
                        </CustomText>
                      </CustomText>

                      <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        style={tw`bg-white border border-gray-200 rounded-2xl px-4 py-4 flex-row items-center justify-between`}
                      >
                        <CustomText size="xs" color="#374151">
                          {moment(sightingData.dateTime).format(
                            "MMM DD, YYYY [at] h:mm A"
                          )}
                        </CustomText>
                        <Ionicons
                          name="calendar-outline"
                          size={20}
                          color="#6b7280"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Pet Condition Section */}
                    <View style={tw`mb-6`}>
                      <CustomText
                        weight="Medium"
                        size="xs"
                        color="#1f2937"
                        style={tw`flex-1 mb-4`}
                        numberOfLines={2}
                      >
                        Pet Condition
                        <CustomText size="base" color="#dc2626">
                          {" "}
                          *
                        </CustomText>
                      </CustomText>

                      {/* Condition Chips */}
                      <View style={tw`flex-row flex-wrap gap-2 mb-4`}>
                        {[
                          "Healthy",
                          "Injured",
                          "Hungry",
                          "Scared",
                          "Malnourished",
                          "Vomiting",
                        ].map((condition) => (
                          <TouchableOpacity
                            key={condition}
                            onPress={() =>
                              setSightingData((prev) => ({
                                ...prev,
                                condition,
                              }))
                            }
                            style={tw`px-4 py-2 rounded-lg border ${
                              sightingData.condition === condition
                                ? "bg-gray-800 border-gray-800"
                                : "bg-white border-gray-300"
                            }`}
                          >
                            <CustomText
                              size="xs"
                              color={
                                sightingData.condition === condition
                                  ? "white"
                                  : "#374151"
                              }
                              weight={
                                sightingData.condition === condition
                                  ? "Medium"
                                  : "Regular"
                              }
                            >
                              {condition}
                            </CustomText>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Custom Condition Input */}
                      <View style={tw`bg-white rounded-2xl`}>
                        <CustomInput
                          placeholder="Other condition"
                          value={
                            sightingData.condition.includes("Healthy") ||
                            sightingData.condition.includes("Injured") ||
                            sightingData.condition.includes("Hungry") ||
                            sightingData.condition.includes("Scared") ||
                            sightingData.condition.includes("Malnourished") ||
                            sightingData.condition.includes("Vomiting")
                              ? ""
                              : sightingData.condition
                          }
                          onChangeText={(text) =>
                            setSightingData((prev) => ({
                              ...prev,
                              condition: text,
                            }))
                          }
                        />
                      </View>

                      {sightingErrors.condition && (
                        <CustomText size="xs" color="#dc2626" style={tw`mt-2`}>
                          {sightingErrors.condition}
                        </CustomText>
                      )}
                    </View>

                    {/* Additional Notes Section */}
                    <View style={tw`mb-6`}>
                      <CustomText
                        weight="Medium"
                        size="xs"
                        color="#1f2937"
                        style={tw`flex-1 mb-4`}
                        numberOfLines={2}
                      >
                        Additional Notes
                      </CustomText>

                      <View style={tw`bg-white rounded-2xl`}>
                        <CustomInput
                          placeholder="Any other details that might help (direction heading, behavior, etc.)"
                          value={sightingData.notes}
                          onChangeText={(text) =>
                            setSightingData((prev) => ({
                              ...prev,
                              notes: text,
                            }))
                          }
                          multiline
                          numberOfLines={4}
                          placeholderTextColor="#9ca3af"
                          textAlignVertical="top"
                        />
                      </View>
                    </View>

                    {/* Contact Information Section */}
                    <View style={tw`mb-8`}>
                      <View
                        style={tw`flex-row items-center justify-between mb-3`}
                      >
                        <CustomText
                          weight="Medium"
                          size="xs"
                          color="#1f2937"
                          style={tw`flex-1 mr-10`}
                          numberOfLines={2}
                        >
                          Your Contact Information
                          <CustomText size="base" color="#dc2626">
                            {" "}
                            *
                          </CustomText>
                        </CustomText>
                        <TouchableOpacity
                          style={tw`flex-row items-center px-3 py-2 bg-gray-800 rounded-xl`}
                        >
                          <Ionicons
                            name="call-outline"
                            size={14}
                            color="white"
                          />
                          <CustomText
                            size="xs"
                            color="white"
                            style={tw`ml-1 font-medium`}
                          >
                            Use Phone Number
                          </CustomText>
                        </TouchableOpacity>
                      </View>

                      <View style={tw`bg-white rounded-2xl`}>
                        <CustomInput
                          placeholder="Phone number or email for the owner to reach you"
                          value={sightingData.contact}
                          onChangeText={(text) =>
                            setSightingData((prev) => ({
                              ...prev,
                              contact: text,
                            }))
                          }
                          keyboardType="phone-pad"
                        />
                      </View>

                      {sightingErrors.contact && (
                        <CustomText size="xs" color="#dc2626" style={tw`mt-2`}>
                          {sightingErrors.contact}
                        </CustomText>
                      )}
                    </View>
                  </View>
                </ScrollView>

                {/* Fixed Submit Button */}
                <View style={tw`p-4 border-t border-gray-200 bg-white`}>
                  <TouchableOpacity
                    onPress={handleSubmitSighting}
                    disabled={isSubmittingSighting}
                    style={tw`bg-[#FE8C01] rounded-2xl py-4 items-center justify-center flex-row shadow-sm ${
                      isSubmittingSighting ? "opacity-50" : ""
                    }`}
                  >
                    {isSubmittingSighting ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Ionicons
                          name="eye-outline"
                          size={18}
                          color="white"
                          style={tw`mr-2`}
                        />
                        <CustomText weight="Medium" size="sm" color="white">
                          Submit Sighting
                        </CustomText>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </SafeAreaView>
          )}

          {/* Claim Pet Form */}
          {selectedPost && showClaimForm && (
            <SafeAreaView style={tw`flex-1 bg-white`}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={tw`flex-1`}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
              >
                <ScrollView
                  style={tw`flex-1`}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={tw`pb-6`}
                >
                  {/* Header Section */}
                  <View style={tw`flex-1 bg-white px-6 py-4`}>
                    <View style={tw`flex-row items-start`}>
                      <Ionicons
                        name="heart-outline"
                        size={12}
                        color="#dc2626"
                        style={tw`mt-1 mr-2`}
                      />
                      <CustomText
                        size="2.8"
                        color="#6b7280"
                        style={tw`flex-1 leading-5`}
                      >
                        To claim this pet, please provide proof of ownership and
                        contact information.
                      </CustomText>
                    </View>
                  </View>

                  <View style={tw`px-6`}>
                    {/* Proof Images Section */}
                    <View style={tw`mb-6`}>
                      <CustomText
                        weight="Medium"
                        size="xs"
                        color="#1f2937"
                        style={tw`flex-1 mb-4`}
                      >
                        Proof of Ownership
                        <CustomText size="base" color="#dc2626">
                          {" "}
                          *
                        </CustomText>
                      </CustomText>

                      {claimData.proofImages.length === 0 && (
                        <TouchableOpacity
                          onPress={handleClaimImagePicker}
                          style={tw`border-2 border-dashed border-gray-300 rounded-2xl p-6 items-center justify-center bg-white mb-3`}
                        >
                          <View style={tw`bg-gray-50 rounded-full p-4 mb-3`}>
                            <Ionicons
                              name="camera-outline"
                              size={24}
                              color="#7b7b7bff"
                            />
                          </View>
                          <CustomText
                            weight="Regular"
                            size="xs"
                            color="#717171ff"
                            style={tw`mb-1`}
                          >
                            Tap to add proof photos
                          </CustomText>
                          <CustomText
                            size="xs"
                            color="#9ca3af"
                            style={tw`text-center`}
                          >
                            Photos of you with the pet, vet records, etc.
                          </CustomText>
                        </TouchableOpacity>
                      )}

                      {claimData.proofImages.length > 0 && (
                        <View>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={tw`mb-3 pt-2`}
                          >
                            {claimData.proofImages.map((image, index) => (
                              <View key={index} style={tw`relative mr-3`}>
                                <Image
                                  source={{ uri: image.uri }}
                                  style={tw`w-24 h-24 rounded-xl`}
                                  resizeMode="cover"
                                />
                                <TouchableOpacity
                                  onPress={() => removeClaimImage(index)}
                                  style={tw`absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center`}
                                >
                                  <Ionicons
                                    name="close"
                                    size={12}
                                    color="white"
                                  />
                                </TouchableOpacity>
                              </View>
                            ))}

                            {claimData.proofImages.length < 5 && (
                              <TouchableOpacity
                                onPress={handleClaimImagePicker}
                                style={tw`w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 items-center justify-center ml-1`}
                              >
                                <Ionicons
                                  name="add"
                                  size={20}
                                  color="#6b7280"
                                />
                                <CustomText
                                  size="xs"
                                  color="#6b7280"
                                  style={tw`mt-1 text-center`}
                                >
                                  Add More
                                </CustomText>
                              </TouchableOpacity>
                            )}
                          </ScrollView>
                        </View>
                      )}

                      {claimErrors.proofImages && (
                        <CustomText size="xs" color="#dc2626" style={tw`mt-2`}>
                          {claimErrors.proofImages}
                        </CustomText>
                      )}
                    </View>

                    {/* Contact Information Section */}
                    <View style={tw`mb-6`}>
                      <CustomText
                        weight="Medium"
                        size="xs"
                        color="#1f2937"
                        style={tw`flex-1 mb-4`}
                      >
                        Your Contact Information
                        <CustomText size="base" color="#dc2626">
                          {" "}
                          *
                        </CustomText>
                      </CustomText>

                      <View style={tw`bg-white rounded-2xl`}>
                        <CustomInput
                          placeholder="Phone number or email for the finder to contact you"
                          value={claimData.contact}
                          onChangeText={(text) =>
                            setClaimData((prev) => ({ ...prev, contact: text }))
                          }
                          keyboardType="phone-pad"
                        />
                      </View>

                      {claimErrors.contact && (
                        <CustomText size="xs" color="#dc2626" style={tw`mt-2`}>
                          {claimErrors.contact}
                        </CustomText>
                      )}
                    </View>

                    {/* Additional Information Section */}
                    <View style={tw`mb-8`}>
                      <CustomText
                        weight="Medium"
                        size="xs"
                        color="#1f2937"
                        style={tw`flex-1 mb-4`}
                      >
                        Additional Information
                      </CustomText>

                      <View style={tw`bg-white rounded-2xl`}>
                        <CustomInput
                          placeholder="Any additional information that can help verify your ownership"
                          value={claimData.additionalInfo}
                          onChangeText={(text) =>
                            setClaimData((prev) => ({
                              ...prev,
                              additionalInfo: text,
                            }))
                          }
                          multiline
                          numberOfLines={4}
                          placeholderTextColor="#9ca3af"
                          textAlignVertical="top"
                        />
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {/* Fixed Submit Button */}
                <View style={tw`p-4 border-t border-gray-200 bg-white`}>
                  <TouchableOpacity
                    onPress={handleSubmitClaim}
                    style={tw`bg-green-600 rounded-2xl py-4 items-center justify-center flex-row shadow-sm`}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color="white"
                      style={tw`mr-2`}
                    />
                    <CustomText weight="Medium" size="sm" color="white">
                      Submit Claim
                    </CustomText>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </SafeAreaView>
          )}

          {/* Bottom Buttons */}
          {selectedPost &&
            !showSightingForm &&
            !showClaimForm &&
            selectedPost.ownerId !== currentUserId && (
              <View
                style={tw`absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4`}
              >
                {selectedPost.type === "lost" ? (
                  <TouchableOpacity
                    onPress={handleReportSighting}
                    style={tw`bg-[#FE8C01] rounded-xl py-4 items-center justify-center flex-row`}
                  >
                    <Ionicons
                      name="eye-outline"
                      size={18}
                      color="white"
                      style={tw`mr-2`}
                    />
                    <CustomText weight="Medium" size="sm" color="white">
                      Report Sighting
                    </CustomText>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleClaimPet}
                    style={tw`bg-green-600 rounded-xl py-4 items-center justify-center flex-row`}
                  >
                    <Ionicons
                      name="heart-outline"
                      size={18}
                      color="white"
                      style={tw`mr-2`}
                    />
                    <CustomText weight="Medium" size="sm" color="white">
                      This is my pet
                    </CustomText>
                  </TouchableOpacity>
                )}
              </View>
            )}
        </SafeAreaView>
      </Modal>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="datetime"
        onConfirm={handleDateTimeConfirm}
        onCancel={() => setShowDatePicker(false)}
        maximumDate={new Date()}
      />

      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        description={errorMessage}
        type="error"
      />

      <ErrorModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          closeDetails();
        }}
        description={
          showSightingForm
            ? "Sighting reported successfully! Thank you for helping reunite pets with their families."
            : "Claim submitted successfully! The finder will review your request."
        }
        type="success"
      />
    </SafeAreaView>
  );
};

export default CommunityScreen;
