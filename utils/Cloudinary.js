// utils/cloudinary.js

const CONFIG = {
  CLOUDINARY_URL: "https://api.cloudinary.com/v1_1/dojxcp2bn/image/upload",
  UPLOAD_PRESET: "petresq_uploads",
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  TIMEOUT: 45000, // 45 seconds
}

const validateImage = (imageUri) => {
  if (!imageUri) {
    throw new Error("No image URI provided")
  }

  if (typeof imageUri !== "string") {
    throw new Error("Invalid image URI format")
  }
}

const getErrorMessage = (error, response) => {
  if (error.name === "TypeError" && error.message.includes("Network")) {
    return "Network error. Please check your internet connection and try again."
  }

  if (response) {
    switch (response.status) {
      case 413:
        return "Image file is too large. Please select a smaller image (max 10MB)."
      case 400:
        return "Invalid image format. Please select a valid image file (JPEG, PNG, WebP)."
      case 401:
        return "Upload authentication failed. Please try again."
      case 429:
        return "Too many upload attempts. Please wait a moment and try again."
      default:
        return `Upload failed with error ${response.status}. Please try again.`
    }
  }

  return "Image upload failed. Please try again."
}

export const uploadImageToCloudinary = async (imageUri) => {
  validateImage(imageUri)

  const formData = new FormData()

  const timestamp = Date.now()
  const fileName = `petresq_${timestamp}.jpg`

  formData.append("file", {
    uri: imageUri,
    type: "image/jpeg",
    name: fileName,
  })

  formData.append("upload_preset", CONFIG.UPLOAD_PRESET)
  formData.append("folder", "petresq")

  try {
    console.log(`Uploading image: ${fileName}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT)

    const response = await fetch(CONFIG.CLOUDINARY_URL, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Cloudinary error response:", errorText)
      console.error("Response status:", response.status)
      throw new Error(getErrorMessage(null, response))
    }

    const data = await response.json()

    if (!data.secure_url) {
      throw new Error("Invalid response from upload service")
    }

    console.log("Image uploaded successfully:", data.secure_url)
    return data.secure_url
  } catch (error) {
    console.error("Cloudinary upload failed:", error)

    if (error.name === "AbortError") {
      throw new Error("Upload timeout. Please check your connection and try again.")
    }

    throw new Error(getErrorMessage(error))
  }
}

export const uploadMultipleImages = async (imageUris) => {
  if (!Array.isArray(imageUris) || imageUris.length === 0) {
    throw new Error("Please provide an array of image URIs")
  }

  if (imageUris.length > 5) {
    throw new Error("Maximum 5 images allowed per batch")
  }

  try {
    const uploadPromises = imageUris.map((uri) => uploadImageToCloudinary(uri))
    const results = await Promise.allSettled(uploadPromises)

    const successful = []
    const failed = []

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successful.push(result.value)
      } else {
        failed.push({ index, error: result.reason.message })
      }
    })

    return { successful, failed }
  } catch (error) {
    throw new Error("Batch upload failed: " + error.message)
  }
}
