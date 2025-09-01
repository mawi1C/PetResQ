import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
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
import AsyncStorage from "@react-native-async-storage/async-storage"

// 🔹 Input Sanitizer
const sanitizeInput = (input) => input?.trim()

// 🔹 Password Strength Validator
const validatePasswordStrength = (password) => {
  const minLength = 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  const score = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length

  return {
    isValid: password.length >= minLength && score >= 3,
    score,
  }
}

// 🔹 Firebase Error Mapper
const getFirebaseErrorMessage = (error) => {
  switch (error?.code) {
    case "auth/user-not-found":
      return "No account found with this email"
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password"
    case "auth/invalid-email":
      return "Invalid email address"
    case "auth/email-already-in-use":
      return "This email is already registered. Please log in instead"
    case "auth/weak-password":
      return "Password must be at least 8 characters with uppercase, lowercase, number, and special character"
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later"
    case "auth/network-request-failed":
      return "Please check your internet connection"
    default:
      return error?.message || "Something went wrong. Please try again."
  }
}

// 🔹 Register User (copied + local notification)
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

    return { success: true, user }
  } catch (error) {
    return { success: false, error: getFirebaseErrorMessage(error) }
  }
}

// 🔹 Login User (copied + local notification)
export const loginUser = async (email, password, rememberMe = false) => {
  try {
    if (!email || !password) {
      return { success: false, error: "Email and password are required" }
    }

    const sanitizedEmail = sanitizeInput(email)

    const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, password)
    const user = userCredential.user

    if (!user.emailVerified) {
      await signOut(auth)
      return {
        success: false,
        error: "Please verify your email before logging in",
        needsVerification: true,
      }
    }

    if (rememberMe) {
      await AsyncStorage.setItem("rememberUser", "true")
    } else {
      await AsyncStorage.removeItem("rememberUser")
    }

    const userDoc = await getDoc(doc(db, "users", user.uid))
    const userData = userDoc.exists() ? userDoc.data() : null

    // ✅ Local notification for verified login
    sendLocalNotification(
      "Login Successful",
      "Welcome back! You are now logged in."
    )

    return { success: true, user, userData }
  } catch (error) {
    return { success: false, error: getFirebaseErrorMessage(error) }
  }
}
