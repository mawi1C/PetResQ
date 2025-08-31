import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth"
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore"
import { auth, db } from "../firebase"
import { sendLocalNotification } from "./NotificationService" // ✅ local notification only

// 🔹 Input Sanitizer
const sanitizeInput = (input) => input?.trim()

// 🔹 Password Strength Validator
const validatePasswordStrength = (password) => {
  const minLength = 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  return { isValid: password.length >= minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar }
}

// 🔹 Firebase Error Mapper
const getFirebaseErrorMessage = (error) => {
  switch (error?.code) {
    case "auth/user-not-found":
      return "No account found with this email"
    case "auth/wrong-password":
      return "Incorrect password"
    case "auth/invalid-email":
      return "Invalid email address"
    case "auth/email-already-in-use":
      return "This email is already registered. Please log in instead"
    case "auth/weak-password":
      return "Password must be at least 8 characters with uppercase, lowercase, number, and special character"
    case "auth/network-request-failed":
      return "Please check your internet connection"
    default:
      return error?.message || "Something went wrong. Please try again."
  }
}

// 🔹 Register User
export const registerUser = async (fullName, email, phone, location, password) => {
  try {
    if (!fullName || !email || !phone || !location || !password) {
      return { success: false, error: "All fields are required" }
    }

    const sanitizedFullName = sanitizeInput(fullName)
    const sanitizedEmail = sanitizeInput(email)
    const sanitizedPhone = sanitizeInput(phone)
    const sanitizedLocation = sanitizeInput(location)

    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: "Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters",
      }
    }

    const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password)
    const user = userCredential.user

    await sendEmailVerification(user)

    await setDoc(doc(db, "users", user.uid), {
      fullName: sanitizedFullName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      location: sanitizedLocation,
      roles: { petOwner: false, volunteer: false, rescuer: false },
      lostReports: 0,
      foundReports: 0,
      volunteeredEvents: 0,
      createdAt: serverTimestamp(),
    })

    // ✅ Local notification after signup
    sendLocalNotification(
      "Account Created",
      "Your account has been created successfully! Please verify your email before logging in."
    )

    // ❌ Push notification commented out
    // sendPushNotification(user.uid, "Account Created", "Please verify your email")

    return { success: true, user }
  } catch (error) {
    return { success: false, error: getFirebaseErrorMessage(error) }
  }
}

// 🔹 Login User
export const loginUser = async (email, password) => {
  try {
    if (!email || !password) {
      return { success: false, error: "Email and password are required" }
    }

    const sanitizedEmail = sanitizeInput(email)
    const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, password)
    const user = userCredential.user

    if (!user.emailVerified) {
      return { success: false, error: "Please verify your email before logging in" }
    }

    const userDoc = await getDoc(doc(db, "users", user.uid))
    const userData = userDoc.exists() ? userDoc.data() : null

    // ✅ Local notification for verified email
    sendLocalNotification(
      "Email Verified",
      "Your email is now verified! You can successfully log in."
    )

    // ❌ Push notification commented out
    // sendPushNotification(user.uid, "Email Verified", "You can now log in")

    return { success: true, user, userData }
  } catch (error) {
    return { success: false, error: getFirebaseErrorMessage(error) }
  }
}
