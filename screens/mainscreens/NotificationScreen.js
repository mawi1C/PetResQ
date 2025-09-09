import React, { useState, useEffect, useRef } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  Image,
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
} from "../../utils/PetService";

import { getDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({});

  const [selectedSighting, setSelectedSighting] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const pagerRef = useRef();

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
      // Mark as read
      if (!notification.read) {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
      }

      if (notification.type === "sighting") {
        // Fetch full sighting document
        const sightingDoc = await getDoc(
          doc(db, "sightings", notification.data.sightingId)
        );
        if (!sightingDoc.exists()) throw new Error("Sighting not found");
        const sightingData = sightingDoc.data();

        // Fetch reporter name from users collection
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

        // Set selected sighting with all details
        setSelectedSighting({
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
            <CustomText style={tw`mt-4 text-gray-500 text-base text-center`}>
              {loading ? "Loading notifications..." : "No notifications yet"}
            </CustomText>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={tw`bg-white border border-gray-200 rounded-2xl p-4 pb-0 mb-3 flex-row items-start shadow-sm ${
              !item.read ? "border-orange-300" : ""
            }`}
            onPress={() => handleNotificationPress(item)}
            activeOpacity={0.7}
          >
            <View style={tw`mr-3 mt-1`}>
              <Ionicons
                name={item.type === "sighting" ? "eye" : "notifications"}
                size={18}
                color={item.type === "sighting" ? "#10B981" : "#FAA617"}
              />
              {!item.read && (
                <View
                  style={tw`absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full`}
                />
              )}
            </View>
            <View style={tw`flex-1 pb-4`}>
              <View style={tw`flex-row items-center justify-between`}>
                <CustomText
                  style={tw`text-gray-800 flex-1`}
                  size="xs"
                  weight="Medium"
                >
                  {item.title}
                </CustomText>
                <CustomText style={tw`text-gray-400 text-2.5 ml-2`}>
                  {formatNotificationTime(item.createdAt)}
                </CustomText>
              </View>
              <CustomText style={tw`text-gray-600 text-xs leading-5`}>
                {item.body}
              </CustomText>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Redesigned Sighting Details Modal */}
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
              {/* Sighting Images with Swiping */}
              {selectedSighting.images &&
                selectedSighting.images.length > 0 && (
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

                    {/* Image indicators */}
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

              {/* Sighting Badge */}
              <View
                style={tw`bg-white px-4 py-4 flex-row justify-between items-start`}
              >
                <View style={tw`flex-1`}>
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
                        <Ionicons name="chatbox-ellipses-outline" size={18} color="white" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Sighting Location & Time */}
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

          {/* Action Buttons */}
          {selectedSighting && (
            <View style={tw`bg-white border-t border-gray-200 px-4 py-4`}>
              <View style={tw`flex-row gap-3`}>
                <TouchableOpacity
                  style={tw`flex-1 bg-red-500 rounded-xl py-3 items-center justify-center flex-row`}
                  onPress={() => {
                    // Handle "Not My Pet" action
                    console.log("Not my pet pressed");
                    // You can add logic here to mark as false positive
                    closeDetails();
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
                    // Handle "My Pet" action
                    console.log("My pet confirmed");
                    // You can add logic here to mark as confirmed sighting
                    closeDetails();
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
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
