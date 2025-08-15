import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db, auth } from "../config/firebase"

class UserProfileService {
  constructor() {
    this.currentUser = null

    auth.onAuthStateChanged((user) => {
      this.currentUser = user
    })
  }

  // Create or update user profile
  async createOrUpdateProfile(profileData) {
    try {
      if (!this.currentUser) {
        throw new Error("User not authenticated")
      }

      console.log("Creating/updating profile with data:", JSON.stringify(profileData, null, 2))

      const userRef = doc(db, "users", this.currentUser.uid)

      // Ensure emergency_contact and doctor_info are properly structured
      const emergency_contact = profileData.emergency_contact || {}
      const doctor_info = profileData.doctor_info || {}

      const profile = {
        email: this.currentUser.email,
        display_name: profileData.display_name || this.currentUser.displayName,
        phone: profileData.phone || "",
        date_of_birth: profileData.date_of_birth || null,
        gender: profileData.gender || "",
        height: profileData.height || null,
        weight: profileData.weight || null,
        blood_type: profileData.blood_type || "",
        emergency_contact: {
          name: emergency_contact.name || profileData.emergency_contact_name || "",
          phone: emergency_contact.phone || profileData.emergency_contact_phone || "",
          relationship: emergency_contact.relationship || profileData.emergency_contact_relationship || "",
        },
        medical_conditions: profileData.medical_conditions || [],
        medications: profileData.medications || [],
        allergies: profileData.allergies || [],
        doctor_info: {
          name: doctor_info.name || profileData.doctor_name || "",
          phone: doctor_info.phone || profileData.doctor_phone || "",
          email: doctor_info.email || profileData.doctor_email || "",
          hospital: doctor_info.hospital || profileData.doctor_hospital || "",
        },
        preferences: {
          units: profileData.units || "metric", // metric or imperial
          notifications: profileData.notifications !== false,
          data_sharing: profileData.data_sharing || false,
        },
        updated_at: serverTimestamp(),
        created_at: profileData.created_at || serverTimestamp(),
      }

      await setDoc(userRef, profile, { merge: true })
      console.log("Profile updated successfully")

      return profile
    } catch (error) {
      console.error("Error updating profile: ", error)
      throw error
    }
  }

  // Get user profile
  async getProfile() {
    try {
      if (!this.currentUser) {
        throw new Error("User not authenticated")
      }

      const userRef = doc(db, "users", this.currentUser.uid)
      const docSnap = await getDoc(userRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        console.log("Retrieved profile data:", JSON.stringify(data, null, 2))
        return {
          ...data,
          created_at: data.created_at?.toDate(),
          updated_at: data.updated_at?.toDate(),
        }
      } else {
        // Create default profile if doesn't exist
        const defaultProfile = {
          email: this.currentUser.email,
          display_name: this.currentUser.displayName || "",
          created_at: new Date(),
        }

        await this.createOrUpdateProfile(defaultProfile)
        return defaultProfile
      }
    } catch (error) {
      console.error("Error getting profile: ", error)
      throw error
    }
  }

  // Update specific profile fields
  async updateProfile(updates) {
    try {
      if (!this.currentUser) {
        throw new Error("User not authenticated")
      }

      const userRef = doc(db, "users", this.currentUser.uid)

      await updateDoc(userRef, {
        ...updates,
        updated_at: serverTimestamp(),
      })

      console.log("Profile updated successfully")
    } catch (error) {
      console.error("Error updating profile: ", error)
      throw error
    }
  }
}

export default new UserProfileService()
