import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth"
import { initializeFirestore, CACHE_SIZE_UNLIMITED, getFirestore } from "firebase/firestore"
import { getDatabase } from "firebase/database"
import AsyncStorage from "@react-native-async-storage/async-storage"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDTywgeZrMMIVMXnj-I_34jGslmnD-brsI",
  authDomain: "patient-health-app-a48bc.firebaseapp.com",
  databaseURL: "https://patient-health-app-a48bc-default-rtdb.firebaseio.com/",
  projectId: "patient-health-app-a48bc",
  storageBucket: "patient-health-app-a48bc.firebasestorage.app",
  messagingSenderId: "489854249574",
  appId: "1:489854249574:web:20cb155b86b7c0fad7dba7",
}

// Initialize Firebase only if no apps exist
let app
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApp() // Use existing app
}

// Initialize Firebase Authentication with AsyncStorage persistence
let auth
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  })
} catch (error) {
  // If already initialized, get the existing instance
  auth = getAuth(app)
}

// Initialize Cloud Firestore with settings optimized for React Native
let db
try {
  db = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    experimentalForceLongPolling: true,
  })
} catch (error) {
  // If already initialized, get the existing instance
  db = getFirestore(app)
}

// Initialize Realtime Database
const realtimeDb = getDatabase(app)

// Test connection to current_readings endpoint
console.log('🔥 Firebase initialized with Realtime Database URL:', firebaseConfig.databaseURL)

export { db, auth, realtimeDb }
export default app
