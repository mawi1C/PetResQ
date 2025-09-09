// utils/PetService.js
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { uploadImageToCloudinary } from "./Cloudinary";
import { sendLocalNotification } from "./NotificationService";

// Sanitize helper
const sanitizeInput = (value, type = "text", maxLength = 100) => {
  if (!value) return "";
  let sanitized = String(value).trim();
  if (sanitized.length > maxLength) sanitized = sanitized.slice(0, maxLength);
  if (["text", "breed", "petname"].includes(type))
    sanitized = sanitized.replace(/[<>/{}$]/g, "");
  return sanitized;
};

/**
 * Register a pet
 */
export const registerPet = async (data) => {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in to register a pet.");

  const sanitizedData = {
    petname: sanitizeInput(data.petname, "petname", 50),
    species: sanitizeInput(data.species, "text", 20),
    breed: sanitizeInput(data.breed, "breed", 50),
    color: sanitizeInput(data.color, "text", 30),
    age: data.age,
    size: data.size,
    gender: data.gender || "Unknown",
    features: sanitizeInput(data.features, "text", 200),
    health: data.health,
    behavior: data.behavior,
    specialNeeds: sanitizeInput(data.specialNeeds, "text", 200),
    photoUrl: null,
  };

  const validationErrors = [];
  if (!sanitizedData.petname) validationErrors.push("Pet name is required");
  if (!sanitizedData.species) validationErrors.push("Species is required");
  if (!sanitizedData.breed) validationErrors.push("Breed is required");
  if (!sanitizedData.color) validationErrors.push("Color is required");
  if (!sanitizedData.age) validationErrors.push("Age is required");
  if (!sanitizedData.size) validationErrors.push("Size is required");
  if (!sanitizedData.gender) validationErrors.push("Gender is required");
  if (!sanitizedData.health) validationErrors.push("Health status is required");
  if (!sanitizedData.behavior) validationErrors.push("Behavior is required");
  if (!data.image || !data.image.uri)
    validationErrors.push("Pet image is required");

  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
  }

  try {
    const imageUrl = await uploadImageToCloudinary(data.image.uri);
    sanitizedData.photoUrl = imageUrl;
  } catch (error) {
    throw new Error(error.message || "Failed to upload pet image.");
  }

  try {
    const docRef = await addDoc(collection(db, "pets"), {
      ...sanitizedData,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
    });

    return { id: docRef.id, ...sanitizedData };
  } catch (error) {
    throw new Error(error.message || "Failed to register pet.");
  }
};

/**
 * Report a lost pet
 */
export const reportLostPet = async (data) => {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in to report a lost pet.");

  if (!data.coordinates) {
    throw new Error("Please drop a pin on the map for last seen location");
  }

  // 🔎 Step 1: Check for duplicates based only on pet name + owner + open status
  const q = query(
    collection(db, "lostPets"),
    where("ownerId", "==", user.uid),
    where("status", "==", "open")
  );

  const querySnapshot = await getDocs(q);

  let isDuplicate = false;
  querySnapshot.forEach((doc) => {
    const existing = doc.data();

    if (existing.petname?.toLowerCase() === data.petname?.toLowerCase()) {
      isDuplicate = true;
    }
  });

  if (isDuplicate) {
    throw new Error("DUPLICATE_REPORT");
  }

  // --- Existing logic ---
  const sanitizedData = {
    petname: sanitizeInput(data.petname, "petname", 50),
    species: sanitizeInput(data.species, "text", 20),
    breed: sanitizeInput(data.breed, "breed", 50),
    color: sanitizeInput(data.color, "text", 30),
    gender: data.gender,
    age: data.age,
    size: data.size || "",
    features: sanitizeInput(data.features, "text", 200),
    health: data.health || "",
    behavior: data.behavior || "",
    specialNeeds: sanitizeInput(data.specialNeeds, "text", 200),
    lastSeenLocation: sanitizeInput(data.lastSeenLocation, "text", 200),
    coordinates: data.coordinates,
    lastSeenDate: data.lastSeenDate,
    contact: sanitizeInput(data.contact, "text", 100),
    reward: data.reward ? sanitizeInput(data.reward, "text", 50) : "",
    photoUrls: [],
  };

  if (!data.images || data.images.length === 0) {
    throw new Error("At least one pet photo is required");
  }

  try {
    for (const img of data.images) {
      const imageUrl = await uploadImageToCloudinary(img.uri);
      sanitizedData.photoUrls.push(imageUrl);
    }
  } catch (error) {
    throw new Error(error.message || "Failed to upload pet images.");
  }

  try {
    const docRef = await addDoc(collection(db, "lostPets"), {
      ...sanitizedData,
      ownerId: user.uid,
      reportType: "lost",
      status: "open",
      createdAt: serverTimestamp(),
    });

    return { id: docRef.id, ...sanitizedData };
  } catch (error) {
    throw new Error(error.message || "Failed to report lost pet.");
  }
};

/**
 * Report a pet sighting
 */
export const reportSighting = async (data, lostPetId) => {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in to report a sighting.");

  const validationErrors = [];
  if (!data.images || data.images.length === 0)
    validationErrors.push("At least one sighting photo is required");
  if (!data.location) validationErrors.push("Location is required");
  if (!data.condition) validationErrors.push("Pet condition is required");
  if (!data.contact) validationErrors.push("Contact information is required");

  if (validationErrors.length > 0)
    throw new Error(`Validation failed: ${validationErrors.join(", ")}`);

  const sanitizedData = {
    location: sanitizeInput(data.location, "text", 200),
    coordinates: data.coordinates || null,
    dateTime: data.dateTime || serverTimestamp(),
    notes: sanitizeInput(data.notes, "text", 500),
    condition: sanitizeInput(data.condition, "text", 100),
    contact: sanitizeInput(data.contact, "text", 100),
    photoUrls: [],
  };

  try {
    for (const img of data.images) {
      const imageUrl = await uploadImageToCloudinary(img.uri);
      sanitizedData.photoUrls.push(imageUrl);
    }
  } catch (error) {
    throw new Error(error.message || "Failed to upload sighting images.");
  }

  try {
    const lostPetDoc = await getDoc(doc(db, "lostPets", lostPetId));
    if (!lostPetDoc.exists()) throw new Error("Lost pet report not found");
    const lostPetData = lostPetDoc.data();
    const ownerId = lostPetData.ownerId;

    // Create sighting
    const docRef = await addDoc(collection(db, "sightings"), {
      ...sanitizedData,
      lostPetId,
      reporterId: user.uid,
      createdAt: serverTimestamp(),
    });

    // Create notification
    await addDoc(collection(db, "notifications"), {
      userId: ownerId,
      type: "sighting",
      title: `${lostPetData.petname} Spotted!`,
      body: `Someone reported a sighting of your lost pet ${lostPetData.petname} at ${sanitizedData.location}`,
      data: {
        sightingId: docRef.id,
        lostPetId,
        petName: lostPetData.petname,
        location: sanitizedData.location,
        reporterContact: sanitizedData.contact,
        condition: sanitizedData.condition,
        notes: sanitizedData.notes,
        photoUrls: sanitizedData.photoUrls,
      },
      read: false,
      createdAt: serverTimestamp(),
    });

    if (ownerId === user.uid) {
      await sendLocalNotification(
        `${lostPetData.petname} Spotted!`,
        `Someone reported a sighting of your lost pet`
      );
    }

    return { id: docRef.id, ...sanitizedData };
  } catch (error) {
    throw new Error(error.message || "Failed to report sighting.");
  }
};

export const getUserNotifications = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in to get notifications.");

  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );
    const querySnapshot = await getDocs(q);
    const notifications = [];

    querySnapshot.forEach((doc) =>
      notifications.push({ id: doc.id, ...doc.data() })
    );

    notifications.sort((a, b) => {
      if (a.createdAt && b.createdAt)
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      return 0;
    });

    return notifications;
  } catch (error) {
    throw new Error(error.message || "Failed to get notifications.");
  }
};

export const markNotificationAsRead = async (notificationId) => {
  const user = auth.currentUser;
  if (!user)
    throw new Error("You must be logged in to mark notifications as read.");

  try {
    await updateDoc(doc(db, "notifications", notificationId), { read: true });
  } catch (error) {
    throw new Error(error.message || "Failed to mark notification as read.");
  }
};
