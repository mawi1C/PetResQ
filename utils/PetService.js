// utils/PetService.js
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { uploadImageToCloudinary } from "./Cloudinary"; // ✅ import correctly

// Simple inline sanitize function
const sanitizeInput = (value, type = "text", maxLength = 100) => {
  if (!value) return "";
  let sanitized = String(value).trim();
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  // Optional: remove special chars for certain types
  if (type === "text" || type === "breed" || type === "petname") {
    sanitized = sanitized.replace(/[<>\/{}$]/g, "");
  }
  return sanitized;
};

/**
 * Register a pet
 * @param {Object} data - pet registration data
 * @returns {Promise<Object>} - returns saved pet document
 */
export const registerPet = async (data) => {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in to register a pet.");

  console.log("Starting registerPet function...");

  // Sanitize data
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
    photoUrl: null, // Will be filled after upload
  };

  console.log("Data sanitized, validating...");

  // Basic validation
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
  if (!data.image || !data.image.uri) validationErrors.push("Pet image is required");

  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
  }

  console.log("Validation passed, uploading image...");

  // Upload image
  try {
    const imageUrl = await uploadImageToCloudinary(data.image.uri);
    sanitizedData.photoUrl = imageUrl;
    console.log("Image uploaded successfully:", imageUrl);
  } catch (error) {
    console.error("Image upload failed:", error);
    throw new Error(error.message || "Failed to upload pet image.");
  }

  console.log("Saving pet data to Firestore...");

  // Save pet data to Firestore
  try {
    const docRef = await addDoc(collection(db, "pets"), {
      ...sanitizedData,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
    });

    console.log("Pet registered successfully:", docRef.id);

    return { id: docRef.id, ...sanitizedData };
  } catch (error) {
    console.error("Failed to save pet data:", error);
    throw new Error(error.message || "Failed to register pet.");
  }
};
