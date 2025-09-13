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

const HF_API_KEY = process.env.EXPO_PUBLIC_HF_API_KEY;

// Updated list of working models with proper endpoints
const EMBEDDING_MODELS = [
  {
    name: "openai/clip-vit-base-patch32",
    type: "image",
    url: "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32"
  },
  {
    name: "sentence-transformers/clip-ViT-B-32",
    type: "image", 
    url: "https://api-inference.huggingface.co/models/sentence-transformers/clip-ViT-B-32"
  },
  {
    name: "google/vit-base-patch16-224",
    type: "image",
    url: "https://api-inference.huggingface.co/models/google/vit-base-patch16-224"
  }
];

// Helper function to wait for model to load
const waitForModel = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Cosine similarity function
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Convert image URL to base64 for Hugging Face API
async function imageUrlToBase64(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Remove data:image/... prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to convert image to base64:", error);
    throw error;
  }
}

// Improved embedding generation with retry logic
async function getImageEmbedding(imageUrl, retries = 3) {
  console.log(`🔄 Starting embedding generation for image: ${imageUrl}`);
  
  for (const model of EMBEDDING_MODELS) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 Trying ${model.name} (attempt ${attempt}/${retries})`);
        
        // Convert image to base64
        const base64Image = await imageUrlToBase64(imageUrl);
        
        const response = await fetch(model.url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: base64Image,
          }),
        });

        const responseText = await response.text();
        
        if (response.status === 503) {
          console.log(`⏳ Model ${model.name} is loading, waiting 10 seconds...`);
          await waitForModel(10000);
          continue;
        }

        if (!response.ok) {
          console.warn(`⚠️ Model ${model.name} failed with status ${response.status}: ${responseText}`);
          if (attempt === retries) continue; // Try next model if all retries exhausted
          await waitForModel(2000); // Wait 2 seconds before retry
          continue;
        }

        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          console.warn(`⚠️ Failed to parse response from ${model.name}:`, responseText);
          continue;
        }

        // Handle different response formats
        let embedding = null;
        
        if (Array.isArray(result)) {
          if (result.length > 0 && Array.isArray(result[0])) {
            embedding = result[0]; // First embedding if multiple
          } else if (result.length > 0 && typeof result[0] === 'number') {
            embedding = result; // Direct array of numbers
          }
        } else if (result.embeddings && Array.isArray(result.embeddings[0])) {
          embedding = result.embeddings[0];
        } else if (result.pooler_output && Array.isArray(result.pooler_output)) {
          embedding = result.pooler_output;
        }

        if (embedding && Array.isArray(embedding) && embedding.length > 0) {
          console.log(`✅ Successfully generated embedding with ${model.name} (${embedding.length} dimensions)`);
          return embedding;
        } else {
          console.warn(`⚠️ Invalid embedding format from ${model.name}:`, result);
        }

      } catch (error) {
        console.warn(`⚠️ Error with ${model.name} (attempt ${attempt}): ${error.message}`);
        if (attempt === retries) continue; // Try next model if all retries exhausted
        await waitForModel(2000);
      }
    }
  }

  console.error("❌ All embedding models failed after retries");
  return null;
}

// Generate a simple feature vector as fallback
function generateSimpleFeatures(imageUrl, petData = {}) {
  // Create a basic hash-like feature vector from available data
  const features = new Array(128).fill(0);
  
  // Use URL hash
  let urlHash = 0;
  for (let i = 0; i < imageUrl.length; i++) {
    urlHash = ((urlHash << 5) - urlHash + imageUrl.charCodeAt(i)) & 0xffffffff;
  }
  
  // Use pet characteristics
  const characteristics = [
    petData.species || '',
    petData.breed || '',
    petData.color || '',
    petData.size || '',
    petData.age || ''
  ].join('').toLowerCase();
  
  let charHash = 0;
  for (let i = 0; i < characteristics.length; i++) {
    charHash = ((charHash << 5) - charHash + characteristics.charCodeAt(i)) & 0xffffffff;
  }
  
  // Fill feature vector with normalized hash values
  for (let i = 0; i < features.length; i++) {
    features[i] = ((urlHash + charHash + i) % 1000) / 1000;
  }
  
  console.log("🔧 Generated fallback feature vector");
  return features;
}

// 🔹 Sanitize helper
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
  if (!sanitizedData.behavior) validationErrors.push("Behavior is required");
  if (!data.image || !data.image.uri)
    validationErrors.push("Pet image is required");

  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
  }

  try {
    // 1. Upload photo to Cloudinary
    const imageUrl = await uploadImageToCloudinary(data.image.uri);
    sanitizedData.photoUrl = imageUrl;

    // 2. Generate embedding with improved error handling
    let embedding = null;
    let embeddingStatus = "failed";

    try {
      console.log("🔄 Generating embedding for registered pet...");
      embedding = await getImageEmbedding(imageUrl);

      if (embedding && Array.isArray(embedding) && embedding.length > 0) {
        console.log("✅ Embedding generated successfully");
        embeddingStatus = "success";
      } else {
        // Use fallback feature generation
        embedding = generateSimpleFeatures(imageUrl, sanitizedData);
        embeddingStatus = "fallback";
        console.log("🔧 Using fallback feature vector");
      }
    } catch (err) {
      console.warn("⚠️ Embedding failed, using fallback:", err.message);
      embedding = generateSimpleFeatures(imageUrl, sanitizedData);
      embeddingStatus = "fallback";
    }

    // 3. Save to Firestore with embedding
    const docRef = await addDoc(collection(db, "pets"), {
      ...sanitizedData,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      embedding,
      embeddingStatus,
    });

    return { id: docRef.id, ...sanitizedData, embedding };
  } catch (error) {
    console.error("❌ Failed to register pet:", error);
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

  // Check for duplicates
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
    // 1. Upload photos to Cloudinary
    for (const img of data.images) {
      const imageUrl = await uploadImageToCloudinary(img.uri);
      sanitizedData.photoUrls.push(imageUrl);
    }

    // 2. Generate embedding with improved handling
    let embedding = null;
    let embeddingStatus = "failed";

    try {
      embedding = await getImageEmbedding(sanitizedData.photoUrls[0]);
      if (embedding) {
        embeddingStatus = "success";
      } else {
        embedding = generateSimpleFeatures(sanitizedData.photoUrls[0], sanitizedData);
        embeddingStatus = "fallback";
      }
    } catch (err) {
      console.warn("⚠️ Embedding failed, using fallback:", err);
      embedding = generateSimpleFeatures(sanitizedData.photoUrls[0], sanitizedData);
      embeddingStatus = "fallback";
    }

    // 3. Save to Firestore
    const docRef = await addDoc(collection(db, "lostPets"), {
      ...sanitizedData,
      ownerId: user.uid,
      reportType: "lost",
      status: "open",
      createdAt: serverTimestamp(),
      embedding,
      embeddingStatus,
    });

    // 4. Try to match with found pets
    await tryMatchWithFoundPets({ id: docRef.id, ...sanitizedData, embedding }, user.uid);

    return { id: docRef.id, ...sanitizedData, embedding };
  } catch (error) {
    throw new Error(error.message || "Failed to report lost pet.");
  }
};

/**
 * Report a found pet
 */
export const reportFoundPet = async (data) => {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in to report a found pet.");

  const sanitizedData = {
    species: sanitizeInput(data.species, "text", 20),
    breed: sanitizeInput(data.breed, "breed", 50),
    color: sanitizeInput(data.color, "text", 30),
    gender: data.gender || "",
    age: data.age || "",
    size: data.size || "",
    features: sanitizeInput(data.features, "text", 200),
    health: data.health || "",
    behavior: data.behavior || "",
    foundLocation: sanitizeInput(data.foundLocation, "text", 200),
    coordinates: data.coordinates || null,
    foundDate: data.foundDate || serverTimestamp(),
    contact: sanitizeInput(data.contact, "text", 100),
    photoUrls: [],
    embedding: null,
  };

  if (!data.images || data.images.length === 0) {
    throw new Error("At least one pet photo is required");
  }

  try {
    // Upload images
    for (const img of data.images) {
      const imageUrl = await uploadImageToCloudinary(img.uri);
      sanitizedData.photoUrls.push(imageUrl);
    }

    // Generate embedding
    if (sanitizedData.photoUrls.length > 0) {
      try {
        sanitizedData.embedding = await getImageEmbedding(sanitizedData.photoUrls[0]);
        if (!sanitizedData.embedding) {
          sanitizedData.embedding = generateSimpleFeatures(sanitizedData.photoUrls[0], sanitizedData);
        }
      } catch (error) {
        sanitizedData.embedding = generateSimpleFeatures(sanitizedData.photoUrls[0], sanitizedData);
      }
    }
  } catch (error) {
    throw new Error(error.message || "Failed to upload found pet images.");
  }

  try {
    const docRef = await addDoc(collection(db, "foundPets"), {
      ...sanitizedData,
      ownerId: user.uid,
      reportType: "found",
      status: "open",
      createdAt: serverTimestamp(),
    });

    // Try to auto-match with existing lostPets
    await tryMatchWithLostPets({ id: docRef.id, ...sanitizedData }, user.uid);

    return { id: docRef.id, ...sanitizedData };
  } catch (error) {
    throw new Error(error.message || "Failed to report found pet.");
  }
};

/**
 * Try to match a new found pet with existing lost pets
 */
async function tryMatchWithLostPets(foundPet, finderId) {
  if (!foundPet.embedding) return;

  const lostPetsSnap = await getDocs(collection(db, "lostPets"));
  let bestMatch = null;
  let bestScore = -1;

  lostPetsSnap.forEach((docSnap) => {
    const lostPet = docSnap.data();
    if (!lostPet.embedding) return;

    const score = cosineSimilarity(foundPet.embedding, lostPet.embedding);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { ...lostPet, id: docSnap.id };
    }
  });

  // Adjust threshold based on embedding quality
  const threshold = bestMatch?.embeddingStatus === "success" ? 0.85 : 0.75;

  if (bestScore >= threshold && bestMatch) {
    await addDoc(collection(db, "notifications"), {
      userId: bestMatch.ownerId,
      type: "match_found",
      title: `Possible Match Found for ${bestMatch.petname}`,
      body: `A found pet report looks similar to ${bestMatch.petname}`,
      data: { 
        lostPetId: bestMatch.id, 
        foundPetId: foundPet.id,
        similarity: bestScore.toFixed(3),
        embeddingQuality: bestMatch.embeddingStatus
      },
      read: false,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, "notifications"), {
      userId: finderId,
      type: "match_found",
      title: `Your found report may match a lost pet`,
      body: `We found a possible match with ${bestMatch.petname}`,
      data: { 
        lostPetId: bestMatch.id, 
        foundPetId: foundPet.id,
        similarity: bestScore.toFixed(3),
        embeddingQuality: bestMatch.embeddingStatus
      },
      read: false,
      createdAt: serverTimestamp(),
    });
  }
}

/**
 * Try to match a new lost pet with existing found pets
 */
async function tryMatchWithFoundPets(lostPet, ownerId) {
  if (!lostPet.embedding) return;

  const foundPetsSnap = await getDocs(collection(db, "foundPets"));
  let bestMatch = null;
  let bestScore = -1;

  foundPetsSnap.forEach((docSnap) => {
    const foundPet = docSnap.data();
    if (!foundPet.embedding) return;

    const score = cosineSimilarity(lostPet.embedding, foundPet.embedding);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { ...foundPet, id: docSnap.id };
    }
  });

  // Adjust threshold based on embedding quality
  const threshold = lostPet.embeddingStatus === "success" ? 0.85 : 0.75;

  if (bestScore >= threshold && bestMatch) {
    await addDoc(collection(db, "notifications"), {
      userId: ownerId,
      type: "match_found",
      title: `Possible Match Found for ${lostPet.petname}`,
      body: `A found pet report looks similar to ${lostPet.petname}`,
      data: { 
        lostPetId: lostPet.id, 
        foundPetId: bestMatch.id,
        similarity: bestScore.toFixed(3),
        embeddingQuality: lostPet.embeddingStatus
      },
      read: false,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, "notifications"), {
      userId: bestMatch.ownerId,
      type: "match_found",
      title: `Your found report may match a lost pet`,
      body: `We found a possible match with ${lostPet.petname}`,
      data: { 
        lostPetId: lostPet.id, 
        foundPetId: bestMatch.id,
        similarity: bestScore.toFixed(3),
        embeddingQuality: lostPet.embeddingStatus
      },
      read: false,
      createdAt: serverTimestamp(),
    });
  }
}

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

    if (ownerId !== user.uid) {
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

/**
 * Confirm a sighting as the pet owner
 */
export const confirmSightingAsOwner = async (sightingId) => {
  try {
    const sightingRef = doc(db, "sightings", sightingId);
    const sightingSnap = await getDoc(sightingRef);
    if (!sightingSnap.exists()) throw new Error("Sighting not found");

    const sightingData = sightingSnap.data();
    if (!sightingData.reporterId || !sightingData.lostPetId)
      throw new Error("Invalid sighting data");

    // Update sighting document
    await updateDoc(sightingRef, {
      confirmedByOwner: true,
      confirmedAt: serverTimestamp(),
    });

    // Notify reporter that their sighting was confirmed
    await addDoc(collection(db, "notifications"), {
      userId: sightingData.reporterId,
      type: "sighting_confirmed",
      title: `Sighting confirmed!`,
      body: `The pet owner confirmed your sighting was accurate. Thank you for helping!`,
      data: {
        sightingId,
        lostPetId: sightingData.lostPetId,
      },
      read: false,
      createdAt: serverTimestamp(),
    });

    await sendLocalNotification(
      `Sighting confirmed!`,
      `The pet owner confirmed your sighting was accurate. Thank you for helping!`
    );
  } catch (error) {
    console.error("Error confirming sighting:", error);
    throw error;
  }
};

export const markSightingAsFalse = async (sightingId) => {
  try {
    const sightingRef = doc(db, "sightings", sightingId);
    const sightingSnap = await getDoc(sightingRef);
    if (!sightingSnap.exists()) throw new Error("Sighting not found");

    const sightingData = sightingSnap.data();

    // Update sighting document
    await updateDoc(sightingRef, {
      falsePositive: true,
      falseMarkedAt: serverTimestamp(),
    });

    // Get lost pet data for context
    const lostPetDoc = await getDoc(
      doc(db, "lostPets", sightingData.lostPetId)
    );
    const lostPetData = lostPetDoc.exists()
      ? lostPetDoc.data()
      : { petname: "the pet" };

    // Notify the reporter that their sighting was marked as not the correct pet
    await addDoc(collection(db, "notifications"), {
      userId: sightingData.reporterId,
      type: "sighting_false_positive",
      title: `Sighting Update`,
      body: `The pet owner indicated this wasn't their pet. Thank you for your heartful help!`,
      data: {
        sightingId,
        lostPetId: sightingData.lostPetId,
        petName: lostPetData.petname,
      },
      read: false,
      createdAt: serverTimestamp(),
    });

    // Send local notification to reporter
    await sendLocalNotification(
      `Sighting Update`,
      `The pet owner indicated this wasn't their pet. Thank you for your help anyway!`
    );
  } catch (error) {
    console.error("Error marking sighting as false:", error);
    throw error;
  }
};

/**
 * Mark a lost pet as found and handle the complete flow
 */
export const markPetAsFound = async (lostPetId, sightingId = null) => {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in to mark pet as found.");

  try {
    // Update the lost pet status
    const lostPetRef = doc(db, "lostPets", lostPetId);
    await updateDoc(lostPetRef, {
      status: "found",
      foundDate: serverTimestamp(),
      foundBySightingId: sightingId, // Track which sighting led to finding
    });

    // If found through a sighting, get the lost pet data for notifications
    if (sightingId) {
      const lostPetDoc = await getDoc(lostPetRef);
      const lostPetData = lostPetDoc.data();

      // Get the sighting data to find the reporter
      const sightingDoc = await getDoc(doc(db, "sightings", sightingId));
      if (sightingDoc.exists()) {
        const sightingData = sightingDoc.data();

        // Create a special "pet found" notification for the sighter
        await addDoc(collection(db, "notifications"), {
          userId: sightingData.reporterId,
          type: "pet_found",
          title: `${lostPetData.petname} has been found!`,
          body: `Great news! ${lostPetData.petname} has been safely reunited with their family thanks to your help!`,
          data: {
            lostPetId,
            sightingId,
            petName: lostPetData.petname,
            reward: lostPetData.reward || null,
          },
          read: false,
          createdAt: serverTimestamp(),
        });

        // Send local notification
        await sendLocalNotification(
          `${lostPetData.petname} has been found!`,
          `Great news! The pet you helped spot has been safely reunited with their family!`
        );
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error marking pet as found:", error);
    throw error;
  }
};

/**
 * Send a thank you message from owner to sighter
 */
export const sendThankYouMessage = async (sightingId, message) => {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in to send a message.");

  try {
    // Get sighting data to find the reporter
    const sightingDoc = await getDoc(doc(db, "sightings", sightingId));
    if (!sightingDoc.exists()) throw new Error("Sighting not found");

    const sightingData = sightingDoc.data();

    // Get lost pet data for context
    const lostPetDoc = await getDoc(
      doc(db, "lostPets", sightingData.lostPetId)
    );
    const lostPetData = lostPetDoc.data();

    // Create thank you notification
    await addDoc(collection(db, "notifications"), {
      userId: sightingData.reporterId,
      type: "thank_you",
      title: `From ${lostPetData.petname}'s family!`,
      body: message,
      data: {
        lostPetId: sightingData.lostPetId,
        sightingId,
        petName: lostPetData.petname,
        fromOwner: true,
      },
      read: false,
      createdAt: serverTimestamp(),
    });

    // Send local notification
    await sendLocalNotification(
      `Thank you from ${lostPetData.petname}'s family!`,
      message
    );

    return { success: true };
  } catch (error) {
    console.error("Error sending thank you message:", error);
    throw error;
  }
};

/**
 * Get lost pet details for found pet flow
 */
export const getLostPetDetails = async (lostPetId) => {
  try {
    const lostPetDoc = await getDoc(doc(db, "lostPets", lostPetId));
    if (!lostPetDoc.exists()) throw new Error("Lost pet report not found");

    return { id: lostPetDoc.id, ...lostPetDoc.data() };
  } catch (error) {
    console.error("Error getting lost pet details:", error);
    throw error;
  }
};

/**
 * Enhanced confirm sighting function that includes option to mark as found
 */
export const confirmSightingAsOwnerEnhanced = async (
  sightingId,
  markAsFound = false
) => {
  try {
    const sightingRef = doc(db, "sightings", sightingId);
    const sightingSnap = await getDoc(sightingRef);
    if (!sightingSnap.exists()) throw new Error("Sighting not found");

    const sightingData = sightingSnap.data();
    if (!sightingData.reporterId || !sightingData.lostPetId)
      throw new Error("Invalid sighting data");

    // Update sighting document
    await updateDoc(sightingRef, {
      confirmedByOwner: true,
      confirmedAt: serverTimestamp(),
    });

    // If user wants to mark pet as found
    if (markAsFound) {
      await markPetAsFound(sightingData.lostPetId, sightingId);
    } else {
      // Regular confirmation notification
      await addDoc(collection(db, "notifications"), {
        userId: sightingData.reporterId,
        type: "sighting_confirmed",
        title: `Sighting confirmed!`,
        body: `The pet owner confirmed your sighting was accurate. Thank you for helping!`,
        data: {
          sightingId,
          lostPetId: sightingData.lostPetId,
        },
        read: false,
        createdAt: serverTimestamp(),
      });

      await sendLocalNotification(
        `Sighting confirmed!`,
        `The pet owner confirmed your sighting was accurate. Thank you for helping!`
      );
    }
  } catch (error) {
    console.error("Error confirming sighting:", error);
    throw error;
  }
};

/**
 * Retry embedding generation for existing records
 */
export const retryEmbeddingGeneration = async (collection_name, docId) => {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in to retry embedding generation.");

  try {
    const docRef = doc(db, collection_name, docId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Document not found in ${collection_name}`);
    }

    const data = docSnap.data();
    const imageUrl = data.photoUrl || (data.photoUrls && data.photoUrls[0]);
    
    if (!imageUrl) {
      throw new Error("No image found for embedding generation");
    }

    let embedding = null;
    let embeddingStatus = "failed";

    try {
      embedding = await getImageEmbedding(imageUrl, petData);
      if (embedding && Array.isArray(embedding) && embedding.length > 0) {
        embeddingStatus = "success";
        console.log("✅ Retry: Embedding generated successfully");
      } else {
        embedding = generateSimpleFeatures(imageUrl, data);
        embeddingStatus = "fallback";
        console.log("🔧 Retry: Using fallback feature vector");
      }
    } catch (err) {
      console.warn("⚠️ Retry: Embedding failed, using fallback:", err.message);
      embedding = generateSimpleFeatures(imageUrl, data);
      embeddingStatus = "fallback";
    }

    // Update document with new embedding
    await updateDoc(docRef, {
      embedding,
      embeddingStatus,
      embeddingRetryAt: serverTimestamp(),
    });

    return { success: true, embeddingStatus, embedding };
  } catch (error) {
    console.error("Error retrying embedding generation:", error);
    throw error;
  }
};

/**
 * Get embedding statistics for admin/debugging
 */
export const getEmbeddingStats = async () => {
  try {
    const collections = ['pets', 'lostPets', 'foundPets'];
    const stats = {};

    for (const collectionName of collections) {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const total = querySnapshot.size;
      let success = 0;
      let fallback = 0;
      let failed = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const status = data.embeddingStatus || 'unknown';
        
        switch (status) {
          case 'success':
            success++;
            break;
          case 'fallback':
            fallback++;
            break;
          default:
            failed++;
        }
      });

      stats[collectionName] = {
        total,
        success,
        fallback,
        failed,
        successRate: total > 0 ? ((success / total) * 100).toFixed(1) : '0'
      };
    }

    return stats;
  } catch (error) {
    console.error("Error getting embedding stats:", error);
    throw error;
  }
};

/**
 * Submit a pet claim request
 */
export const submitPetClaim = async (foundPetId, claimData) => {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in to claim a pet.");

  const validationErrors = [];
  if (!claimData.proofImages || claimData.proofImages.length === 0)
    validationErrors.push("Proof images are required");
  if (!claimData.contact) validationErrors.push("Contact information is required");

  if (validationErrors.length > 0)
    throw new Error(`Validation failed: ${validationErrors.join(", ")}`);

  const sanitizedData = {
    proofImageUrls: [],
    contact: sanitizeInput(claimData.contact, "text", 100),
    additionalInfo: sanitizeInput(claimData.additionalInfo, "text", 500),
    status: "pending", // pending, accepted, rejected, needs_more_info
    requestedMoreInfo: false,
    rejectionReason: "",
  };

  try {
    // Upload proof images
    for (const img of claimData.proofImages) {
      const imageUrl = await uploadImageToCloudinary(img.uri);
      sanitizedData.proofImageUrls.push(imageUrl);
    }
  } catch (error) {
    throw new Error(error.message || "Failed to upload proof images.");
  }

  try {
    // Get found pet details
    const foundPetDoc = await getDoc(doc(db, "foundPets", foundPetId));
    if (!foundPetDoc.exists()) throw new Error("Found pet report not found");
    const foundPetData = foundPetDoc.data();
    const finderId = foundPetData.ownerId;

    // Create claim document
    const claimRef = await addDoc(collection(db, "petClaims"), {
      ...sanitizedData,
      foundPetId,
      claimantId: user.uid,
      finderId,
      createdAt: serverTimestamp(),
    });

    // Create notification for the finder
    await addDoc(collection(db, "notifications"), {
      userId: finderId,
      type: "pet_claim",
      title: `New Pet Claim Request`,
      body: `Someone is claiming the pet you found. Review their proof of ownership.`,
      data: {
        claimId: claimRef.id,
        foundPetId,
        claimantId: user.uid,
        contact: sanitizedData.contact,
      },
      read: false,
      createdAt: serverTimestamp(),
    });

    // Send local notification to finder
    await sendLocalNotification(
      `New Pet Claim Request`,
      `Someone is claiming the pet you found. Please review their claim.`
    );

    return { id: claimRef.id, ...sanitizedData };
  } catch (error) {
    throw new Error(error.message || "Failed to submit pet claim.");
  }
};

/**
 * Get claim details
 */
export const getClaimDetails = async (claimId) => {
  try {
    const claimDoc = await getDoc(doc(db, "petClaims", claimId));
    if (!claimDoc.exists()) throw new Error("Claim not found");
    
    return { id: claimDoc.id, ...claimDoc.data() };
  } catch (error) {
    throw new Error(error.message || "Failed to get claim details.");
  }
};

/**
 * Update claim status (accept, reject, or request more info)
 */
export const updateClaimStatus = async (claimId, status, options = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in to update claim status.");

  try {
    const claimDoc = await getDoc(doc(db, "petClaims", claimId));
    if (!claimDoc.exists()) throw new Error("Claim not found");
    
    const claimData = claimDoc.data();
    
    // Verify the user is the finder
    if (claimData.finderId !== user.uid) {
      throw new Error("Only the finder can update claim status.");
    }

    const updateData = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (status === "rejected" && options.rejectionReason) {
      updateData.rejectionReason = sanitizeInput(options.rejectionReason, "text", 200);
    }

    if (status === "needs_more_info" && options.moreInfoRequest) {
      updateData.requestedMoreInfo = true;
      updateData.moreInfoRequest = sanitizeInput(options.moreInfoRequest, "text", 200);
    }

    await updateDoc(doc(db, "petClaims", claimId), updateData);

    // Create appropriate notification for claimant
    let notificationTitle = "";
    let notificationBody = "";
    let notificationType = "";

    switch (status) {
      case "accepted":
        notificationTitle = "Claim Accepted!";
        notificationBody = "The finder has accepted your claim. Contact them to arrange pickup.";
        notificationType = "claim_accepted";
        break;
      case "rejected":
        notificationTitle = "Claim Rejected";
        notificationBody = `The finder rejected your claim. Reason: ${options.rejectionReason || "Not specified"}`;
        notificationType = "claim_rejected";
        break;
      case "needs_more_info":
        notificationTitle = "More Information Needed";
        notificationBody = `The finder needs more information: ${options.moreInfoRequest}`;
        notificationType = "claim_more_info";
        break;
    }

    if (notificationType) {
      await addDoc(collection(db, "notifications"), {
        userId: claimData.claimantId,
        type: notificationType,
        title: notificationTitle,
        body: notificationBody,
        data: {
          claimId,
          foundPetId: claimData.foundPetId,
          contact: claimData.finderContact || "",
          rejectionReason: options.rejectionReason,
          moreInfoRequest: options.moreInfoRequest,
        },
        read: false,
        createdAt: serverTimestamp(),
      });

      // Send local notification to claimant
      await sendLocalNotification(notificationTitle, notificationBody);
    }

    return { success: true };
  } catch (error) {
    throw new Error(error.message || "Failed to update claim status.");
  }
};

/**
 * Submit additional information for a claim
 */
export const submitAdditionalClaimInfo = async (claimId, additionalInfo, additionalImages = []) => {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in to submit additional information.");

  try {
    const claimDoc = await getDoc(doc(db, "petClaims", claimId));
    if (!claimDoc.exists()) throw new Error("Claim not found");
    
    const claimData = claimDoc.data();
    
    // Verify the user is the claimant
    if (claimData.claimantId !== user.uid) {
      throw new Error("Only the claimant can submit additional information.");
    }

    const additionalImageUrls = [];
    
    // Upload additional images if any
    for (const img of additionalImages) {
      const imageUrl = await uploadImageToCloudinary(img.uri);
      additionalImageUrls.push(imageUrl);
    }

    const updateData = {
      additionalInfoSubmitted: sanitizeInput(additionalInfo, "text", 500),
      additionalProofImageUrls: additionalImageUrls,
      status: "pending", // Reset to pending for review
      updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, "petClaims", claimId), updateData);

    // Notify finder that additional information was submitted
    await addDoc(collection(db, "notifications"), {
      userId: claimData.finderId,
      type: "claim_additional_info",
      title: "Additional Information Submitted",
      body: "The claimant has submitted additional information for your review.",
      data: {
        claimId,
        foundPetId: claimData.foundPetId,
      },
      read: false,
      createdAt: serverTimestamp(),
    });

    await sendLocalNotification(
      "Additional Information Submitted",
      "The claimant has submitted additional information for your review."
    );

    return { success: true };
  } catch (error) {
    throw new Error(error.message || "Failed to submit additional information.");
  }
};

/**
 * Get user's claim requests
 */
export const getUserClaims = async (userId = null) => {
  const user = auth.currentUser;
  const targetUserId = userId || user.uid;
  
  if (!user) throw new Error("You must be logged in to get claim requests.");

  try {
    // Claims where user is claimant
    const claimantQuery = query(
      collection(db, "petClaims"),
      where("claimantId", "==", targetUserId)
    );
    
    // Claims where user is finder
    const finderQuery = query(
      collection(db, "petClaims"),
      where("finderId", "==", targetUserId)
    );

    const [claimantSnap, finderSnap] = await Promise.all([
      getDocs(claimantQuery),
      getDocs(finderQuery)
    ]);

    const claims = [];

    claimantSnap.forEach((doc) => {
      claims.push({ ...doc.data(), id: doc.id, role: "claimant" });
    });

    finderSnap.forEach((doc) => {
      claims.push({ ...doc.data(), id: doc.id, role: "finder" });
    });

    // Sort by creation date, newest first
    claims.sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.());

    return claims;
  } catch (error) {
    throw new Error(error.message || "Failed to get claim requests.");
  }
};