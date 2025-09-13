import React, { useState, useEffect, useRef } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  Image,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PagerView from "react-native-pager-view";
import tw from "twrnc";
import CustomText from "../../components/CustomText";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  getUserNotifications,
  markNotificationAsRead,
  confirmSightingAsOwner,
  confirmSightingAsOwnerEnhanced,
  markSightingAsFalse,
  sendThankYouMessage,
  updateClaimStatus,
  getClaimDetails,
  submitAdditionalClaimInfo,
} from "../../utils/PetService";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import ErrorModal from "../../components/CustomModal";
import CustomInput from "../../components/CustomInput";

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  // Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({});

  const [confirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // New modals for enhanced flow
  const [markAsFoundModalVisible, setMarkAsFoundModalVisible] = useState(false);
  const [thankYouModalVisible, setThankYouModalVisible] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState("");

  const [selectedSighting, setSelectedSighting] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const pagerRef = useRef();

  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [claimAction, setClaimAction] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [moreInfoRequest, setMoreInfoRequest] = useState("");
  const [additionalInfoModalVisible, setAdditionalInfoModalVisible] =
    useState(false);
  const [additionalClaimInfo, setAdditionalClaimInfo] = useState("");
  const [additionalClaimImages, setAdditionalClaimImages] = useState([]);

  const handlePageSelected = (e) => {
    setCurrentImageIndex(e.nativeEvent.position);
  };

  const loadNotifications = async () => {
    try {
      const userNotifications = await getUserNotifications();
      setNotifications(userNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
      setModalContent({
        type: "error",
        description: "Failed to load notifications",
      });
      setModalVisible(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
    }, [])
  );

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {
      loadNotifications();
    });
    return () => subscription.remove();
  }, []);

  const handleNotificationPress = async (notification) => {
    try {
      if (!notification.read) {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
      }

      if (notification.type.includes("claim")) {
        await handleClaimNotificationPress(notification);
        return;
      }

      if (notification.type === "sighting") {
        const sightingDoc = await getDoc(
          doc(db, "sightings", notification.data.sightingId)
        );
        if (!sightingDoc.exists()) throw new Error("Sighting not found");
        const sightingData = sightingDoc.data();

        let reporterName = "Anonymous";
        let reporterAvatar = null;
        if (sightingData.reporterId) {
          const reporterDoc = await getDoc(
            doc(db, "users", sightingData.reporterId)
          );
          if (reporterDoc.exists()) {
            const userData = reporterDoc.data();
            reporterName =
              userData.fullName || userData.displayName || "Anonymous";
            reporterAvatar = userData.photoURL || userData.avatar;
          }
        }

        setSelectedSighting({
          sightingId: sightingDoc.id,
          images: sightingData.photoUrls || [],
          location: sightingData.location || "",
          dateTime: sightingData.dateTime
            ? new Date(
                sightingData.dateTime.toDate
                  ? sightingData.dateTime.toDate()
                  : sightingData.dateTime
              )
            : new Date(),
          notes: sightingData.notes || "",
          condition: sightingData.condition || "",
          reporterName,
          reporterAvatar,
          contact: sightingData.contact || "",
          confirmedByOwner: sightingData.confirmedByOwner || false,
          falsePositive: sightingData.falsePositive || false,
        });

        setCurrentImageIndex(0);
        setDetailsModalVisible(true);
      }
    } catch (error) {
      console.error("Error handling notification press:", error);
      setModalContent({
        type: "error",
        description: "Failed to process notification",
      });
      setModalVisible(true);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return "";
    const now = new Date();
    const notifTime = timestamp.toDate ? timestamp.toDate() : timestamp;
    const diffInMinutes = Math.floor((now - notifTime) / (1000 * 60));
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const formatDateTime = (date) => {
    if (!date) return "Unknown";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const closeDetails = () => {
    setDetailsModalVisible(false);
    setSelectedSighting(null);
    setCurrentImageIndex(0);
  };

  const hasActionBeenTaken = () => {
    return (
      selectedSighting?.confirmedByOwner || selectedSighting?.falsePositive
    );
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "sighting":
        return { name: "eye", color: "#10B981" };
      case "sighting_confirmed":
        return { name: "checkmark-circle", color: "#10B981" };
      case "sighting_false_positive": // Add this new case
        return { name: "close-circle", color: "#ef4444" };
      case "pet_found":
        return { name: "heart", color: "#ef4444" };
      case "thank_you":
        return { name: "heart-outline", color: "#f59e0b" };
      case "pet_claim":
        return { name: "person-add", color: "#FAA617" };
      case "claim_accepted":
        return { name: "checkmark-circle", color: "#10B981" };
      case "claim_rejected":
        return { name: "close-circle", color: "#ef4444" };
      case "claim_more_info":
        return { name: "information-circle", color: "#F59E0B" };
      case "claim_additional_info":
        return { name: "document-text", color: "#3B82F6" };
      default:
        return { name: "notifications", color: "#FAA617" };
    }
  };

  // Add handler for claim notification press
  const handleClaimNotificationPress = async (notification) => {
    try {
      if (!notification.read) {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
      }

      const claimDetails = await getClaimDetails(notification.data.claimId);
      setSelectedClaim(claimDetails);

      if (notification.type === "claim_more_info") {
        setAdditionalInfoModalVisible(true);
      } else {
        setClaimModalVisible(true);
      }
    } catch (error) {
      console.error("Error handling claim notification:", error);
      setModalContent({
        type: "error",
        description: "Failed to load claim details",
      });
      setModalVisible(true);
    }
  };

  // Add claim action handlers
  const handleClaimAction = async (action) => {
    try {
      let result;

      switch (action) {
        case "accept":
          result = await updateClaimStatus(selectedClaim.id, "accepted");
          setSuccessMessage("Claim accepted! The owner has been notified.");
          break;
        case "reject":
          result = await updateClaimStatus(selectedClaim.id, "rejected", {
            rejectionReason: rejectionReason,
          });
          setSuccessMessage("Claim rejected. The claimant has been notified.");
          break;
        case "request_info":
          result = await updateClaimStatus(
            selectedClaim.id,
            "needs_more_info",
            {
              moreInfoRequest: moreInfoRequest,
            }
          );
          setSuccessMessage("Information request sent to claimant.");
          break;
      }

      setClaimModalVisible(false);
      setSuccessModalVisible(true);
      setRejectionReason("");
      setMoreInfoRequest("");
    } catch (error) {
      console.error("Error handling claim action:", error);
      setModalContent({
        type: "error",
        description: error.message || "Failed to process claim action",
      });
      setModalVisible(true);
    }
  };

  const handleSubmitAdditionalInfo = async () => {
    try {
      await submitAdditionalClaimInfo(
        selectedClaim.id,
        additionalClaimInfo,
        additionalClaimImages
      );

      setAdditionalInfoModalVisible(false);
      setAdditionalClaimInfo("");
      setAdditionalClaimImages([]);
      setSuccessMessage("Additional information submitted successfully!");
      setSuccessModalVisible(true);
    } catch (error) {
      console.error("Error submitting additional info:", error);
      setModalContent({
        type: "error",
        description: error.message || "Failed to submit additional information",
      });
      setModalVisible(true);
    }
  };

  const renderNotificationItem = ({ item }) => {
    const icon = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        style={tw`bg-white border border-gray-200 rounded-2xl p-4 pb-0 mb-3 flex-row items-start shadow-sm ${
          !item.read ? "border-orange-300" : ""
        } ${
          item.type === "pet_found"
            ? "border-gray-50 bg-white"
            : item.type === "thank_you"
            ? "border-gray-50 bg-white"
            : item.type === "sighting_false_positive" // Add this line
            ? "border-gray-50 bg-white"
            : ""
        }`}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={tw`mr-3 mt-1 relative`}>
          <View
            style={tw`p-2 rounded-full ${
              item.type === "pet_found"
                ? "bg-green-100"
                : item.type === "thank_you"
                ? "bg-yellow-100"
                : item.type === "sighting_false_positive" // Add this
                ? "bg-red-100"
                : "bg-gray-100"
            }`}
          >
            <Ionicons name={icon.name} size={18} color={icon.color} />
          </View>
          {!item.read && (
            <View
              style={tw`absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white`}
            />
          )}
        </View>

        <View style={tw`flex-1 pb-4`}>
          <View style={tw`flex-row items-center justify-between mb-1`}>
            <CustomText
              style={tw`text-gray-800 flex-1 ${
                item.type === "pet_found" || item.type === "thank_you" ? "" : ""
              }`}
              size="xs"
              weight="Medium"
            >
              {item.title}
            </CustomText>
            <CustomText style={tw`text-gray-400 text-2.5 ml-2`}>
              {formatNotificationTime(item.createdAt)}
            </CustomText>
          </View>

          <CustomText
            style={tw`text-gray-600 text-2.8 leading-5 ${
              item.type === "pet_found" || item.type === "thank_you"
                ? "font-medium"
                : ""
            }`}
          >
            {item.body}
          </CustomText>

          {/* Show reward info if available */}
          {item.data?.reward && (
            <View
              style={tw`mt-2 bg-green-100 border border-green-300 rounded-lg p-2`}
            >
              <View style={tw`flex-row items-center`}>
                <Ionicons name="gift" size={14} color="#10b981" />
                <CustomText
                  size="xs"
                  weight="Medium"
                  color="#10b981"
                  style={tw`ml-1`}
                >
                  Reward: {item.data.reward}
                </CustomText>
              </View>
            </View>
          )}

          {/* Action buttons for specific notification types */}
          {item.type === "pet_found" && !item.read && (
            <View style={tw`mt-3 flex-row gap-2`}>
              <TouchableOpacity
                style={tw`flex-1 bg-green-500 py-2 px-3 rounded-lg flex-row items-center justify-center`}
                onPress={() => {
                  markNotificationAsRead(item.id);
                  setNotifications((prev) =>
                    prev.map((n) =>
                      n.id === item.id ? { ...n, read: true } : n
                    )
                  );
                }}
              >
                <Ionicons name="heart" size={14} color="white" />
                <CustomText
                  size="xs"
                  weight="Medium"
                  color="white"
                  style={tw`ml-1`}
                >
                  Celebrate! 🎉
                </CustomText>
              </TouchableOpacity>
            </View>
          )}

          {item.type === "thank_you" && !item.read && (
            <View style={tw`mt-3`}>
              <TouchableOpacity
                style={tw`bg-yellow-500 py-2 px-3 rounded-lg flex-row items-center justify-center`}
                onPress={() => {
                  markNotificationAsRead(item.id);
                  setNotifications((prev) =>
                    prev.map((n) =>
                      n.id === item.id ? { ...n, read: true } : n
                    )
                  );
                }}
              >
                <Ionicons name="heart-outline" size={14} color="white" />
                <CustomText
                  size="xs"
                  weight="Medium"
                  color="white"
                  style={tw`ml-1`}
                >
                  You're awesome! ❤️
                </CustomText>
              </TouchableOpacity>
            </View>
          )}

          {/* Add this section for sighting_false_positive notifications */}
          {item.type === "sighting_false_positive" && !item.read && (
            <View style={tw`mt-3`}>
              <TouchableOpacity
                style={tw`bg-gray-500 py-2 px-3 rounded-lg flex-row items-center justify-center`}
                onPress={() => {
                  markNotificationAsRead(item.id);
                  setNotifications((prev) =>
                    prev.map((n) =>
                      n.id === item.id ? { ...n, read: true } : n
                    )
                  );
                }}
              >
                <Ionicons name="checkmark" size={14} color="white" />
                <CustomText
                  size="xs"
                  weight="Medium"
                  color="white"
                  style={tw`ml-1`}
                >
                  Acknowledged
                </CustomText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top"]}>
      {/* Header */}
      <View
        style={tw`flex-row items-center justify-between px-4 py-3 bg-white`}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw`p-2 rounded-full bg-gray-800 items-center justify-center`}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={tw`flex-1 items-center`}>
          <CustomText size="base" weight="Medium" color="#1f2937">
            Notifications
          </CustomText>
        </View>
        <View style={tw`w-10`} />
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={tw`flex-grow p-5`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={tw`flex-1 items-center justify-center`}>
            <Ionicons
              name="notifications-off-outline"
              size={50}
              color="#d1d5db"
            />
            <CustomText style={tw`mt-4 text-gray-500 text-sm text-center`}>
              {loading ? "Loading notifications..." : "No notifications yet"}
            </CustomText>
          </View>
        }
        renderItem={renderNotificationItem}
      />

      {/* Sighting Details Modal */}
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
              Sighting Details
            </CustomText>
            <View style={tw`w-6`} />
          </View>

          {selectedSighting && (
            <ScrollView
              style={tw`flex-1 bg-gray-50`}
              showsVerticalScrollIndicator={false}
            >
              {/* Images */}
              {selectedSighting.images?.length > 0 && (
                <View style={tw`relative bg-white`}>
                  <PagerView
                    ref={pagerRef}
                    style={tw`w-full h-70`}
                    initialPage={0}
                    onPageSelected={handlePageSelected}
                  >
                    {selectedSighting.images.map((uri, index) => (
                      <View key={index} style={tw`flex-1`}>
                        <Image
                          source={{ uri }}
                          style={tw`w-full h-full`}
                          resizeMode="cover"
                        />
                      </View>
                    ))}
                  </PagerView>
                  {selectedSighting.images.length > 1 && (
                    <View
                      style={tw`absolute bottom-4 w-full flex-row justify-center`}
                    >
                      {selectedSighting.images.map((_, index) => (
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

              {/* Pet Spotted Badge */}
              <View
                style={tw`bg-white px-4 py-4 flex-row justify-between items-start`}
              >
                <View style={tw`flex-1`}>
                  {/* Status indicator */}
                  {hasActionBeenTaken() && (
                    <View style={tw`flex-row items-center mb-2`}>
                      <Ionicons
                        name={
                          selectedSighting.confirmedByOwner
                            ? "checkmark-circle"
                            : "close-circle"
                        }
                        size={18}
                        color={
                          selectedSighting.confirmedByOwner
                            ? "#10b981"
                            : "#ef4444"
                        }
                        style={tw`mr-1`}
                      />
                      <CustomText
                        size="xs"
                        color={
                          selectedSighting.confirmedByOwner
                            ? "#10b981"
                            : "#ef4444"
                        }
                        weight="Medium"
                      >
                        {selectedSighting.confirmedByOwner
                          ? "Confirmed"
                          : "Not Your Pet"}
                      </CustomText>
                    </View>
                  )}
                  <CustomText size="base" weight="SemiBold" color="#1f2937">
                    Pet Spotted
                  </CustomText>
                  <CustomText size="xs" color="#6b7280" style={tw`mt-1`}>
                    Someone has reported seeing your pet
                  </CustomText>
                </View>
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
                  {selectedSighting.reporterAvatar ? (
                    <Image
                      source={{ uri: selectedSighting.reporterAvatar }}
                      style={tw`w-10 h-10 rounded-full mr-3 bg-gray-200`}
                    />
                  ) : (
                    <View
                      style={tw`w-12 h-12 rounded-full mr-3 bg-gray-200 items-center justify-center`}
                    >
                      <Ionicons name="person" size={20} color="#6b7280" />
                    </View>
                  )}
                  <View style={tw`flex-1 pr-2`}>
                    <CustomText weight="Medium" size="sm" color="#1f2937">
                      {selectedSighting.reporterName}
                    </CustomText>
                    <CustomText size="xs" color="#6b7280">
                      {selectedSighting.contact}
                    </CustomText>
                  </View>
                  {selectedSighting.contact && (
                    <View style={tw`flex-row space-x-3`}>
                      <TouchableOpacity
                        style={tw`bg-gray-800 p-3 rounded-full mr-2`}
                      >
                        <Ionicons name="call-outline" size={18} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={tw`bg-green-500 p-3 rounded-full`}
                      >
                        <Ionicons
                          name="chatbox-ellipses-outline"
                          size={18}
                          color="white"
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Location & Time */}
              <View style={tw`bg-white px-4 py-4`}>
                <CustomText
                  weight="SemiBold"
                  size="xs"
                  color="#1f2937"
                  style={tw`mb-3`}
                >
                  Sighting Information
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
                      color="#ef4444"
                      style={tw`mt-0.5 mr-2`}
                    />
                    <CustomText size="sm" color="#1f2937">
                      {selectedSighting.location}
                    </CustomText>
                  </View>
                </View>

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
                      color="#ef4444"
                      style={tw`mr-2`}
                    />
                    <CustomText size="sm" color="#1f2937">
                      {formatDateTime(selectedSighting.dateTime)}
                    </CustomText>
                  </View>
                </View>
              </View>

              {/* Pet Condition */}
              <View style={tw`bg-white px-4 py-4`}>
                <CustomText
                  weight="SemiBold"
                  size="xs"
                  color="#1f2937"
                  style={tw`mb-3`}
                >
                  Pet Condition
                </CustomText>
                <View style={tw`flex-row items-center`}>
                  <View
                    style={tw`w-10 h-10 rounded-full bg-gray-50 items-center justify-center mr-3`}
                  >
                    <Ionicons
                      name={
                        selectedSighting.condition === "Injured"
                          ? "medical"
                          : "heart"
                      }
                      size={18}
                      color={
                        selectedSighting.condition === "Injured"
                          ? "#ef4444"
                          : "#10b981"
                      }
                    />
                  </View>
                  <View style={tw`flex-1`}>
                    <CustomText weight="Medium" size="sm" color="#1f2937">
                      {selectedSighting.condition}
                    </CustomText>
                    <CustomText size="xs" color="#6b7280">
                      Condition when spotted
                    </CustomText>
                  </View>
                </View>
              </View>

              {/* Additional Notes */}
              {selectedSighting.notes && (
                <View style={tw`bg-white px-4 py-4`}>
                  <CustomText
                    weight="SemiBold"
                    size="xs"
                    color="#1f2937"
                    style={tw`mb-3`}
                  >
                    Additional Notes
                  </CustomText>
                  <View style={tw`flex-row items-start`}>
                    <Ionicons
                      name="document-text-outline"
                      size={16}
                      color="#6b7280"
                      style={tw`mt-0.5 mr-2`}
                    />
                    <CustomText
                      size="sm"
                      color="#1f2937"
                      style={tw`flex-1 leading-5`}
                    >
                      {selectedSighting.notes}
                    </CustomText>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* Action Buttons - Only show if no action has been taken */}
          {selectedSighting && !hasActionBeenTaken() && (
            <View style={tw`bg-white border-t border-gray-200 px-4 py-4`}>
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  style={tw`flex-1 bg-red-500 rounded-xl py-3 items-center justify-center flex-row`}
                  onPress={() => {
                    setConfirmationAction("notMyPet");
                    setConfirmationModalVisible(true);
                  }}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color="white"
                    style={tw`mr-2`}
                  />
                  <CustomText weight="Medium" size="sm" color="white">
                    Not My Pet
                  </CustomText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={tw`flex-1 bg-green-500 rounded-xl py-3 items-center justify-center flex-row`}
                  onPress={() => {
                    setConfirmationAction("myPet");
                    setConfirmationModalVisible(true);
                  }}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="white"
                    style={tw`mr-2`}
                  />
                  <CustomText weight="Medium" size="sm" color="white">
                    My Pet
                  </CustomText>
                </TouchableOpacity>
              </View>
              <CustomText
                size="2.8"
                color="#6b7280"
                style={tw`text-center mt-3`}
              >
                Help us improve by confirming if this is your pet
              </CustomText>
            </View>
          )}

          {/* Show message if action has already been taken */}
          {selectedSighting && hasActionBeenTaken() && (
            <View style={tw`bg-white border-t border-gray-200 px-4 py-4`}>
              <View style={tw`flex-row items-center justify-center`}>
                <Ionicons
                  name={
                    selectedSighting.confirmedByOwner
                      ? "checkmark-circle"
                      : "close-circle"
                  }
                  size={24}
                  color={
                    selectedSighting.confirmedByOwner ? "#10b981" : "#ef4444"
                  }
                />
                <CustomText
                  size="xs"
                  color={
                    selectedSighting.confirmedByOwner ? "#10b981" : "#ef4444"
                  }
                  weight="Medium"
                  style={tw`ml-2`}
                >
                  {selectedSighting.confirmedByOwner
                    ? "You confirmed this is your pet"
                    : "You marked this as not your pet"}
                </CustomText>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Claim Action Modal */}
      <Modal
        visible={claimModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setClaimModalVisible(false)}
      >
        <View
          style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center p-4`}
        >
          <View style={tw`bg-white rounded-2xl p-6 w-full max-w-md`}>
            <CustomText
              size="sm"
              weight="Bold"
              color="#1f2937"
              style={tw`mb-4 text-center`}
            >
              Manage Pet Claim
            </CustomText>

            {claimAction === "reject" && (
              <View style={tw`mb-4`}>
                <CustomText size="xs" color="#6b7280" style={tw`mb-2`}>
                  Reason for rejection:
                </CustomText>
                <TextInput
                  style={tw`border border-gray-300 rounded-lg p-3 text-sm`}
                  placeholder="Please provide a reason for rejection"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            {claimAction === "request_info" && (
              <View style={tw`mb-4`}>
                <CustomText size="xs" color="#6b7280" style={tw`mb-2`}>
                  What information do you need?
                </CustomText>
                <TextInput
                  style={tw`border border-gray-300 rounded-lg p-3 text-sm`}
                  placeholder="Please specify what additional information you need"
                  value={moreInfoRequest}
                  onChangeText={setMoreInfoRequest}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            <View style={tw`flex-row justify-between gap-2`}>
              <TouchableOpacity
                style={tw`flex-1 bg-gray-200 py-3 rounded-lg items-center`}
                onPress={() => setClaimModalVisible(false)}
              >
                <CustomText size="xs" weight="Medium" color="#1f2937">
                  Cancel
                </CustomText>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`flex-1 bg-blue-500 py-3 rounded-lg items-center`}
                onPress={() => handleClaimAction(claimAction)}
              >
                <CustomText size="xs" weight="Medium" color="white">
                  Confirm
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Additional Information Modal */}
      <Modal
        visible={additionalInfoModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAdditionalInfoModalVisible(false)}
      >
        <View
          style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center p-4`}
        >
          <View style={tw`bg-white rounded-2xl p-6 w-full max-w-md`}>
            <CustomText
              size="sm"
              weight="Bold"
              color="#1f2937"
              style={tw`mb-4 text-center`}
            >
              Additional Information Requested
            </CustomText>

            <CustomText size="xs" color="#6b7280" style={tw`mb-4`}>
              The finder needs more information to verify your ownership:
            </CustomText>

            <CustomText size="xs" color="#1f2937" style={tw`mb-4 italic`}>
              "{selectedClaim?.moreInfoRequest}"
            </CustomText>

            <TextInput
              style={tw`border border-gray-300 rounded-lg p-3 text-sm mb-4`}
              placeholder="Provide additional information here..."
              value={additionalClaimInfo}
              onChangeText={setAdditionalClaimInfo}
              multiline
              numberOfLines={4}
            />

            <View style={tw`flex-row justify-between gap-2`}>
              <TouchableOpacity
                style={tw`flex-1 bg-gray-200 py-3 rounded-lg items-center`}
                onPress={() => setAdditionalInfoModalVisible(false)}
              >
                <CustomText size="xs" weight="Medium" color="#1f2937">
                  Cancel
                </CustomText>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`flex-1 bg-blue-500 py-3 rounded-lg items-center`}
                onPress={handleSubmitAdditionalInfo}
              >
                <CustomText size="xs" weight="Medium" color="white">
                  Submit
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <ErrorModal
        visible={confirmationModalVisible}
        onClose={() => setConfirmationModalVisible(false)}
        type="warning"
        description={
          confirmationAction === "myPet"
            ? "Are you sure you want to confirm this is your pet?"
            : "Are you sure you want to mark this as not your pet?"
        }
        customButtons={
          <View style={tw`flex-row justify-between mt-2`}>
            <TouchableOpacity
              style={tw`flex-1 bg-gray-100 py-3 rounded-lg items-center`}
              onPress={() => setConfirmationModalVisible(false)}
            >
              <CustomText size="xs" weight="Medium" color="#1f2937">
                Cancel
              </CustomText>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`flex-1 bg-blue-500 py-3 rounded-lg ml-2 items-center`}
              onPress={async () => {
                setConfirmationModalVisible(false);
                if (!selectedSighting?.sightingId) return;
                try {
                  if (confirmationAction === "myPet") {
                    // Show the enhanced modal for "My Pet" confirmation
                    setMarkAsFoundModalVisible(true);
                  } else {
                    await markSightingAsFalse(selectedSighting.sightingId);
                    setSuccessMessage("Marked as not your pet.");
                    setSelectedSighting((prev) => ({
                      ...prev,
                      falsePositive: true,
                    }));
                    setSuccessModalVisible(true);
                  }
                } catch (error) {
                  console.error(error);
                  setModalContent({
                    type: "error",
                    description: "Failed to update sighting",
                  });
                  setModalVisible(true);
                }
              }}
            >
              <CustomText size="xs" weight="Medium" color="white">
                Yes
              </CustomText>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Mark as Found Modal */}
      <ErrorModal
        visible={markAsFoundModalVisible}
        onClose={() => setMarkAsFoundModalVisible(false)}
        type="success"
        title="Pet Confirmed!"
        description="Would you also like to mark your pet as found? This will close your lost pet report and notify the community."
        customButtons={
          <View style={tw`mt-4`}>
            <View style={tw`flex-row justify-between mb-3`}>
              <TouchableOpacity
                style={tw`flex-1 bg-green-600 py-3 rounded-lg items-center justify-center mr-2`}
                onPress={async () => {
                  setMarkAsFoundModalVisible(false);
                  if (!selectedSighting?.sightingId) return;
                  try {
                    const sightingDoc = await getDoc(
                      doc(db, "sightings", selectedSighting.sightingId)
                    );
                    const sightingData = sightingDoc.data();

                    await confirmSightingAsOwnerEnhanced(
                      selectedSighting.sightingId,
                      true
                    );

                    setSelectedSighting((prev) => ({
                      ...prev,
                      confirmedByOwner: true,
                    }));

                    setSuccessMessage(
                      "Pet marked as found! The sighter has been notified of the great news!"
                    );
                    setSuccessModalVisible(true);

                    // Show thank you option after a short delay
                    setTimeout(() => {
                      setThankYouModalVisible(true);
                    }, 2000);
                  } catch (error) {
                    console.error(error);
                    setModalContent({
                      type: "error",
                      description: "Failed to mark pet as found",
                    });
                    setModalVisible(true);
                  }
                }}
              >
                <CustomText
                  size="xs"
                  weight="Medium"
                  color="white"
                  style={tw`text-center`}
                >
                  Yes, Mark as Found!
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`flex-1 bg-blue-500 py-3 rounded-lg items-center justify-center ml-2`}
                onPress={async () => {
                  setMarkAsFoundModalVisible(false);
                  if (!selectedSighting?.sightingId) return;
                  try {
                    await confirmSightingAsOwner(selectedSighting.sightingId);
                    setSelectedSighting((prev) => ({
                      ...prev,
                      confirmedByOwner: true,
                    }));
                    setSuccessMessage(
                      "Sighting confirmed! Thank you for verifying."
                    );
                    setSuccessModalVisible(true);

                    // Show thank you option after a short delay
                    setTimeout(() => {
                      setThankYouModalVisible(true);
                    }, 1500);
                  } catch (error) {
                    console.error(error);
                    setModalContent({
                      type: "error",
                      description: "Failed to confirm sighting",
                    });
                    setModalVisible(true);
                  }
                }}
              >
                <CustomText
                  size="xs"
                  weight="Medium"
                  color="white"
                  style={tw`text-center`}
                >
                  Just Confirm Sighting
                </CustomText>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={tw`w-full py-3 rounded-lg items-center`}
              onPress={() => setMarkAsFoundModalVisible(false)}
            >
              <CustomText size="xs" weight="Medium" color="#454545ff">
                Cancel
              </CustomText>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Thank You Modal */}
      <Modal
        visible={thankYouModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setThankYouModalVisible(false)}
      >
        <View
          style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center p-4`}
        >
          <View style={tw`bg-white rounded-2xl p-6 w-full max-w-sm`}>
            <View style={tw`items-center mb-4`}>
              <Ionicons name="heart" size={32} color="#ef4444" />
              <CustomText
                size="sm"
                weight="Bold"
                color="#1f2937"
                style={tw`mt-2`}
              >
                Send a Thank You?
              </CustomText>
              <CustomText
                size="xs"
                color="#6b7280"
                style={tw`text-center mt-2`}
              >
                The person who spotted your pet helped bring them home. Would
                you like to send them a thank you message?
              </CustomText>
            </View>

            <View style={tw`mb-4`}>
              <CustomText size="xs" color="#6b7280" style={tw`mb-2`}>
                Your message:
              </CustomText>
              <CustomInput
                style={tw`border text-sm`}
                multiline={true}
                numberOfLines={4}
                placeholder="Thank you so much for helping find my pet! Your kindness means the world to us..."
                value={thankYouMessage}
                onChangeText={setThankYouMessage}
                textAlignVertical="top"
              />
            </View>

            <View style={tw`flex-row justify-between`}>
              <TouchableOpacity
                style={tw`flex-1 bg-gray-200 py-3 rounded-lg items-center mr-2`}
                onPress={() => {
                  setThankYouModalVisible(false);
                  setThankYouMessage("");
                }}
              >
                <CustomText size="xs" weight="Medium" color="#1f2937">
                  Skip
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`flex-1 bg-red-500 py-3 rounded-lg items-center ml-2`}
                onPress={async () => {
                  if (!thankYouMessage.trim()) {
                    setThankYouMessage(
                      "Thank you so much for helping find my pet! Your kindness means the world to us."
                    );
                  }

                  try {
                    await sendThankYouMessage(
                      selectedSighting.sightingId,
                      thankYouMessage
                    );

                    setThankYouModalVisible(false);
                    setThankYouMessage("");

                    setSuccessMessage("Thank you message sent!");
                    setSuccessModalVisible(true);
                  } catch (error) {
                    console.error(error);
                    setModalContent({
                      type: "error",
                      description: "Failed to send thank you message",
                    });
                    setModalVisible(true);
                  }
                }}
              >
                <CustomText size="xs" weight="Medium" color="white">
                  Send Thank You
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <ErrorModal
        visible={successModalVisible}
        onClose={() => setSuccessModalVisible(false)}
        type="success"
        description={successMessage}
      />

      {/* Default Error Modal */}
      <ErrorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        type={modalContent.type}
        description={modalContent.description}
      />
    </SafeAreaView>
  );
}
