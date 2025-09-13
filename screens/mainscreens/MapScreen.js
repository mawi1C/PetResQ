import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  ScrollView,
  SafeAreaView,
  Platform,
  Dimensions,
} from "react-native";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import * as Location from "expo-location";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import moment from "moment";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CustomText from "../../components/CustomText";

const { width, height } = Dimensions.get("window");

export default function MapScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const [lostPets, setLostPets] = useState([]);
  const [foundPets, setFoundPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapRegion, setMapRegion] = useState({
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [selectedPet, setSelectedPet] = useState(null);
  const [showPetModal, setShowPetModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    showLost: true,
    showFound: true,
    species: "all",
    timeRange: "all",
  });
  const [locationPermission, setLocationPermission] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Get user's current location
  useEffect(() => {
    requestLocationPermission();
    fetchPets();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setLocationPermission(true);
        getCurrentLocation();
      } else {
        setMapRegion({
          latitude: 14.5995,
          longitude: 120.9842,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
        setLoading(false);
      }
    } catch (error) {
      console.error("Location permission error:", error);
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } catch (error) {
      console.error("Get location error:", error);
    }
  };

  // Fetch pets using getDocs instead of onSnapshot
  const fetchPets = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    try {
      // Fetch lost pets
      const lostQuery = query(
        collection(db, "lostPets"),
        where("status", "==", "open"),
        orderBy("createdAt", "desc")
      );

      // Fetch found pets
      const foundQuery = query(
        collection(db, "foundPets"),
        where("status", "==", "open"),
        orderBy("createdAt", "desc")
      );

      const [lostSnap, foundSnap] = await Promise.all([
        getDocs(lostQuery),
        getDocs(foundQuery),
      ]);

      const lostPetsData = lostSnap.docs.map((doc) => ({
        id: doc.id,
        type: "lost",
        ...doc.data(),
      }));

      const foundPetsData = foundSnap.docs.map((doc) => ({
        id: doc.id,
        type: "found",
        ...doc.data(),
      }));

      // Check for both coordinates and locationCoords
      const filteredLostPets = lostPetsData.filter(
        (pet) => pet.coordinates || pet.locationCoords
      );
      const filteredFoundPets = foundPetsData.filter(
        (pet) => pet.coordinates || pet.locationCoords
      );

      setLostPets(filteredLostPets);
      setFoundPets(filteredFoundPets);
    } catch (error) {
      console.error("Error fetching pets:", error);
      Alert.alert("Error", "Failed to load pet reports");
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const getFilteredPets = () => {
    let allPets = [];
    if (filters.showLost) allPets = [...allPets, ...lostPets];
    if (filters.showFound) allPets = [...allPets, ...foundPets];

    if (filters.species !== "all") {
      allPets = allPets.filter((pet) => pet.species === filters.species);
    }

    if (filters.timeRange !== "all") {
      const now = new Date();
      let cutoffDate;
      switch (filters.timeRange) {
        case "24h":
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = null;
      }
      if (cutoffDate) {
        allPets = allPets.filter((pet) => {
          const petDate = pet.createdAt?.toDate() || new Date();
          return petDate >= cutoffDate;
        });
      }
    }
    return allPets;
  };

  const filteredPets = getFilteredPets();

  const handleMarkerPress = (pet) => {
    setSelectedPet(pet);
    setShowPetModal(true);
  };

  const handleViewDetails = () => {
    setShowPetModal(false);
    navigation.navigate("PetDetails", {
      petId: selectedPet.id,
      petType: selectedPet.type,
    });
  };

  const toggleFilter = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const handleRefreshLocation = async () => {
    setRefreshing(true);
    try {
      await getCurrentLocation();
      await fetchPets(true);
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const centerOnUserLocation = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: mapRegion.latitude,
        longitude: mapRegion.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  if (loading) {
    return (
      <View style={tw`flex-1 bg-white items-center justify-center`}>
        <ActivityIndicator size="large" color="#2A80FD" />
        <CustomText size="sm" color="#6b7280" style={tw`mt-4`}>
          Loading map...
        </CustomText>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-100`}>
      {/* Map Container */}
      <View style={tw`flex-1 bg-blue-50 rounded-lg overflow-hidden`}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={tw`flex-1`}
          region={mapRegion}
          showsUserLocation={locationPermission}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          mapType="standard"
          onMapReady={() => console.log("Map ready")}
          onError={(error) => {
            console.error("Map error:", error);
            Alert.alert(
              "Map Error", 
              "There was a problem loading the map. Please check your internet connection."
            );
          }}
        >
          {filteredPets.map((pet) => {
            // Handle both coordinates and locationCoords formats
            const coords = pet.coordinates || pet.locationCoords;
            if (!coords || !coords.latitude || !coords.longitude) return null;
            
            return (
              <Marker
                key={`${pet.type}-${pet.id}`}
                coordinate={coords}
                onPress={() => handleMarkerPress(pet)}
              >
                <View
                  style={[
                    tw`w-8 h-8 rounded-full items-center justify-center border-2 border-white shadow-lg`,
                    {
                      backgroundColor: pet.type === "lost" ? "#ef4444" : "#22c55e",
                    },
                  ]}
                >
                  <Ionicons
                    name={pet.type === "lost" ? "search-outline" : "heart-outline"}
                    size={18}
                    color="white"
                  />
                </View>
              </Marker>
            );
          })}
        </MapView>
      </View>

      {/* Back button */}
      <View style={{ position: "absolute", left: 16, top: insets.top + 10 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw`w-10 h-10 rounded-full bg-white shadow-lg items-center justify-center`}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {/* FABs */}
      <View
        style={{
          position: "absolute",
          right: 16,
          top: insets.top + 10,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => setShowFilters(true)}
          style={tw`w-12 h-12 rounded-full bg-white shadow-lg items-center justify-center`}
        >
          <Ionicons name="options-outline" size={22} color="#1f2937" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={centerOnUserLocation}
          style={tw`w-12 h-12 rounded-full bg-white shadow-lg items-center justify-center`}
        >
          <Ionicons name="search-outline" size={22} color="#1f2937" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRefreshLocation}
          style={tw`w-12 h-12 rounded-full bg-blue-500 shadow-lg items-center justify-center`}
          disabled={refreshing}
        >
          <Ionicons 
            name={refreshing ? "refresh" : "locate-outline"} 
            size={22} 
            color="white" 
          />
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View
        style={[
          tw`absolute left-4 bg-white rounded-xl shadow-lg p-3`,
          { bottom: insets.bottom + 12 },
        ]}
      >
        <View style={tw`flex-row items-center mb-2`}>
          <View style={tw`w-4 h-4 rounded-full bg-red-500 mr-2`} />
          <CustomText size="xs" color="#1f2937">
            Lost Pets ({lostPets.filter((pet) => filters.showLost).length})
          </CustomText>
        </View>
        <View style={tw`flex-row items-center`}>
          <View style={tw`w-4 h-4 rounded-full bg-green-500 mr-2`} />
          <CustomText size="xs" color="#1f2937">
            Found Pets ({foundPets.filter((pet) => filters.showFound).length})
          </CustomText>
        </View>
      </View>

      {/* Pet Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPetModal}
        onRequestClose={() => setShowPetModal(false)}
      >
        <View style={tw`flex-1 justify-end bg-black/50`}>
          <View style={tw`bg-white rounded-t-3xl p-6 max-h-96`}>
            {selectedPet && (
              <>
                <View style={tw`flex-row items-center justify-between mb-4`}>
                  <View style={tw`flex-row items-center`}>
                    <View
                      style={[
                        tw`w-6 h-6 rounded-full items-center justify-center mr-3`,
                        {
                          backgroundColor:
                            selectedPet.type === "lost" ? "#ef4444" : "#22c55e",
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          selectedPet.type === "lost"
                            ? "search-outline"
                            : "heart-outline"
                        }
                        size={14}
                        color="white"
                      />
                    </View>
                    <CustomText size="lg" weight="SemiBold" color="#1f2937">
                      {selectedPet.petname || `${selectedPet.species} Found`}
                    </CustomText>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowPetModal(false)}
                    style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center`}
                  >
                    <Ionicons name="close" size={18} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* Pet Image */}
                {((selectedPet.photoUrls && selectedPet.photoUrls[0]) ||
                  selectedPet.photoUrl) && (
                  <Image
                    source={{
                      uri: selectedPet.photoUrls?.[0] || selectedPet.photoUrl,
                    }}
                    style={tw`w-full h-40 rounded-xl mb-4`}
                    resizeMode="cover"
                  />
                )}

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Pet Info */}
                  <View style={tw`mb-4`}>
                    <CustomText
                      size="sm"
                      weight="Medium"
                      color="#1f2937"
                      style={tw`mb-2`}
                    >
                      {selectedPet.species} • {selectedPet.breed}
                    </CustomText>
                    <CustomText size="xs" color="#6b7280" style={tw`mb-1`}>
                      {selectedPet.color} • {selectedPet.gender} •{" "}
                      {selectedPet.size}
                    </CustomText>
                    {selectedPet.features && (
                      <CustomText size="xs" color="#6b7280">
                        {selectedPet.features}
                      </CustomText>
                    )}
                  </View>

                  {/* Location & Time */}
                  <View style={tw`mb-4`}>
                    <CustomText size="xs" color="#6b7280" style={tw`mb-1`}>
                      📍{" "}
                      {selectedPet.lastSeenLocation ||
                        selectedPet.foundLocation}
                    </CustomText>
                    <CustomText size="xs" color="#6b7280">
                      🕐{" "}
                      {moment(
                        selectedPet.lastSeenDate?.toDate() ||
                          selectedPet.foundDate?.toDate()
                      ).format("MMM D, YYYY h:mm A")}
                    </CustomText>
                  </View>

                  {/* Contact */}
                  <View style={tw`mb-6`}>
                    <CustomText size="xs" color="#6b7280">
                      📞 {selectedPet.contact}
                    </CustomText>
                  </View>
                </ScrollView>

                {/* Action Buttons */}
                <View style={tw`flex-row gap-3`}>
                  <TouchableOpacity
                    onPress={() => setShowPetModal(false)}
                    style={tw`flex-1 py-3 border border-gray-300 rounded-xl items-center`}
                  >
                    <CustomText size="sm" weight="Medium" color="#6b7280">
                      Close
                    </CustomText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleViewDetails}
                    style={[
                      tw`flex-1 py-3 rounded-xl items-center`,
                      {
                        backgroundColor:
                          selectedPet.type === "lost" ? "#ef4444" : "#22c55e",
                      },
                    ]}
                  >
                    <CustomText size="sm" weight="Medium" color="white">
                      View Details
                    </CustomText>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilters}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={tw`flex-1 justify-end bg-black/50`}>
          <SafeAreaView style={tw`bg-white rounded-t-3xl p-6`}>
            <View style={tw`flex-row items-center justify-between mb-6`}>
              <CustomText size="lg" weight="SemiBold" color="#1f2937">
                Map Filters
              </CustomText>
              <TouchableOpacity
                onPress={() => setShowFilters(false)}
                style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center`}
              >
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Show/Hide Toggles */}
            <View style={tw`mb-6`}>
              <CustomText
                size="sm"
                weight="Medium"
                color="#1f2937"
                style={tw`mb-3`}
              >
                Show on Map
              </CustomText>
              <View style={tw`flex-row gap-3 mb-3`}>
                <TouchableOpacity
                  onPress={() => toggleFilter("showLost", !filters.showLost)}
                  style={[
                    tw`flex-1 py-3 rounded-xl border-2 items-center`,
                    {
                      borderColor: filters.showLost ? "#ef4444" : "#e5e7eb",
                      backgroundColor: filters.showLost ? "#fef2f2" : "#f9fafb",
                    },
                  ]}
                >
                  <CustomText
                    size="sm"
                    weight={filters.showLost ? "SemiBold" : "Medium"}
                    color={filters.showLost ? "#ef4444" : "#6b7280"}
                  >
                    Lost Pets
                  </CustomText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => toggleFilter("showFound", !filters.showFound)}
                  style={[
                    tw`flex-1 py-3 rounded-xl border-2 items-center`,
                    {
                      borderColor: filters.showFound ? "#22c55e" : "#e5e7eb",
                      backgroundColor: filters.showFound
                        ? "#f0fdf4"
                        : "#f9fafb",
                    },
                  ]}
                >
                  <CustomText
                    size="sm"
                    weight={filters.showFound ? "SemiBold" : "Medium"}
                    color={filters.showFound ? "#22c55e" : "#6b7280"}
                  >
                    Found Pets
                  </CustomText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Species Filter */}
            <View style={tw`mb-6`}>
              <CustomText
                size="sm"
                weight="Medium"
                color="#1f2937"
                style={tw`mb-3`}
              >
                Species
              </CustomText>
              <View style={tw`flex-row gap-3`}>
                {["all", "Dog", "Cat"].map((species) => (
                  <TouchableOpacity
                    key={species}
                    onPress={() => toggleFilter("species", species)}
                    style={[
                      tw`flex-1 py-3 rounded-xl border-2 items-center`,
                    {
                      borderColor:
                        filters.species === species ? "#2A80FD" : "#e5e7eb",
                      backgroundColor:
                        filters.species === species ? "#eff6ff" : "#f9fafb",
                    },
                  ]}
                >
                  <CustomText
                    size="sm"
                    weight={
                      filters.species === species ? "SemiBold" : "Medium"
                    }
                    color={
                      filters.species === species ? "#2A80FD" : "#6b7280"
                    }
                  >
                    {species === "all" ? "All" : species}
                  </CustomText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Time Range Filter */}
          <View style={tw`mb-6`}>
            <CustomText
              size="sm"
              weight="Medium"
              color="#1f2937"
              style={tw`mb-3`}
            >
              Time Range
            </CustomText>
            <View style={tw`flex-row gap-3 mb-3`}>
              {[
                { key: "all", label: "All Time" },
                { key: "24h", label: "24 Hours" },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => toggleFilter("timeRange", option.key)}
                  style={[
                    tw`flex-1 py-3 rounded-xl border-2 items-center`,
                    {
                      borderColor:
                        filters.timeRange === option.key
                          ? "#2A80FD"
                          : "#e5e7eb",
                      backgroundColor:
                        filters.timeRange === option.key
                          ? "#eff6ff"
                          : "#f9fafb",
                    },
                  ]}
                >
                  <CustomText
                    size="sm"
                    weight={
                      filters.timeRange === option.key ? "SemiBold" : "Medium"
                    }
                    color={
                      filters.timeRange === option.key ? "#2A80FD" : "#6b7280"
                    }
                  >
                    {option.label}
                  </CustomText>
                </TouchableOpacity>
              ))}
            </View>
            <View style={tw`flex-row gap-3`}>
              {[
                { key: "7d", label: "7 Days" },
                { key: "30d", label: "30 Days" },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => toggleFilter("timeRange", option.key)}
                  style={[
                    tw`flex-1 py-3 rounded-xl border-2 items-center`,
                    {
                      borderColor:
                        filters.timeRange === option.key
                          ? "#2A80FD"
                          : "#e5e7eb",
                      backgroundColor:
                        filters.timeRange === option.key
                          ? "#eff6ff"
                          : "#f9fafb",
                    },
                  ]}
                >
                  <CustomText
                    size="sm"
                    weight={
                      filters.timeRange === option.key ? "SemiBold" : "Medium"
                    }
                    color={
                      filters.timeRange === option.key ? "#2A80FD" : "#6b7280"
                    }
                  >
                    {option.label}
                  </CustomText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <CustomText size="xs" color="#6b7280" style={tw`text-center`}>
            Showing {filteredPets.length} pets on the map
          </CustomText>
        </SafeAreaView>
      </View>
    </Modal>
  </View>
  );
}