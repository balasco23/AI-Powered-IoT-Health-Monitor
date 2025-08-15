"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import userProfileService from "../services/userProfileService"
import themeService from "../services/themeService"

export default function UserProfileScreen() {
  const navigation = useNavigation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentTheme, setCurrentTheme] = useState("light")
  const [profile, setProfile] = useState({
    display_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    height: "",
    weight: "",
    blood_type: "",
    emergency_contact: {
      name: "",
      phone: "",
      relationship: "",
    },
    medical_conditions: [],
    medications: [],
    allergies: [],
    doctor_info: {
      name: "Dr. Smith",
      phone: "(123) 456-7890",
      email: "dr.smith@healthcare.com",
      hospital: "General Hospital",
    },
  })

  useEffect(() => {
    loadUserProfile()
    initializeTheme()
  }, [])

  const initializeTheme = async () => {
    const theme = await themeService.loadTheme()
    setCurrentTheme(theme)

    const unsubscribe = themeService.subscribe((newTheme) => {
      setCurrentTheme(newTheme)
    })

    return unsubscribe
  }

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      const userProfile = await userProfileService.getProfile()
      setProfile({
        ...profile,
        ...userProfile,
        // Convert any null values to empty strings for form inputs
        display_name: userProfile.display_name || "",
        phone: userProfile.phone || "",
        date_of_birth: userProfile.date_of_birth || "",
        gender: userProfile.gender || "",
        height: userProfile.height ? String(userProfile.height) : "",
        weight: userProfile.weight ? String(userProfile.weight) : "",
        blood_type: userProfile.blood_type || "",
        emergency_contact: {
          name: userProfile.emergency_contact?.name || "",
          phone: userProfile.emergency_contact?.phone || "",
          relationship: userProfile.emergency_contact?.relationship || "",
        },
        medical_conditions: userProfile.medical_conditions || [],
        medications: userProfile.medications || [],
        allergies: userProfile.allergies || [],
        doctor_info: {
          name: userProfile.doctor_info?.name || "Dr. Smith",
          phone: userProfile.doctor_info?.phone || "(123) 456-7890",
          email: userProfile.doctor_info?.email || "dr.smith@healthcare.com",
          hospital: userProfile.doctor_info?.hospital || "General Hospital",
        },
      })
    } catch (error) {
      console.error("Error loading user profile:", error)
      Alert.alert("Error", "Failed to load profile information")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)

      // Basic validation
      if (!profile.display_name.trim()) {
        Alert.alert("Error", "Name cannot be empty")
        setSaving(false)
        return
      }

      // Convert string values to numbers where needed
      const updatedProfile = {
        ...profile,
        height: profile.height ? Number(profile.height) : null,
        weight: profile.weight ? Number(profile.weight) : null,
      }

      await userProfileService.createOrUpdateProfile(updatedProfile)
      Alert.alert("Success", "Profile updated successfully")
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving profile:", error)
      Alert.alert("Error", "Failed to save profile changes")
    } finally {
      setSaving(false)
    }
  }

  const handleAddItem = (field) => {
    Alert.prompt(
      `Add ${field}`,
      `Enter a new ${field.slice(0, -1)}`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Add",
          onPress: (value) => {
            if (value && value.trim()) {
              setProfile({
                ...profile,
                [field]: [...profile[field], value.trim()],
              })
            }
          },
        },
      ],
      "plain-text",
    )
  }

  const handleRemoveItem = (field, index) => {
    const updatedItems = [...profile[field]]
    updatedItems.splice(index, 1)
    setProfile({
      ...profile,
      [field]: updatedItems,
    })
  }

  const colors = themeService.getColors(currentTheme)
  const styles = createStyles(colors)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="person" size={60} color={colors.primary} />
          </View>
          <Text style={styles.profileName}>{profile.display_name || "Your Name"}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {!isEditing ? (
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <MaterialIcons name="edit" size={20} color="#fff" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editingActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  loadUserProfile() // Reload original data
                  setIsEditing(false)
                }}
              >
                <MaterialIcons name="close" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="person-outline" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={profile.display_name}
                onChangeText={(text) => setProfile({ ...profile, display_name: text })}
                placeholder="Enter your full name"
                placeholderTextColor={colors.placeholder}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.display_name || "Not provided"}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>{profile.email}</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={profile.phone}
                onChangeText={(text) => setProfile({ ...profile, phone: text })}
                placeholder="Enter your phone number"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.phone || "Not provided"}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Date of Birth</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={profile.date_of_birth}
                onChangeText={(text) => setProfile({ ...profile, date_of_birth: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.placeholder}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.date_of_birth || "Not provided"}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Gender</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={profile.gender}
                onChangeText={(text) => setProfile({ ...profile, gender: text })}
                placeholder="Enter your gender"
                placeholderTextColor={colors.placeholder}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.gender || "Not provided"}</Text>
            )}
          </View>
        </View>

        {/* Health Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="health-and-safety" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Health Information</Text>
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.fieldContainer, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.fieldLabel}>Height (cm)</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={profile.height}
                  onChangeText={(text) => setProfile({ ...profile, height: text })}
                  placeholder="Height"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.height || "Not provided"}</Text>
              )}
            </View>

            <View style={[styles.fieldContainer, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.fieldLabel}>Weight (kg)</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={profile.weight}
                  onChangeText={(text) => setProfile({ ...profile, weight: text })}
                  placeholder="Weight"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.weight || "Not provided"}</Text>
              )}
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Blood Type</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={profile.blood_type}
                onChangeText={(text) => setProfile({ ...profile, blood_type: text })}
                placeholder="Enter your blood type"
                placeholderTextColor={colors.placeholder}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.blood_type || "Not provided"}</Text>
            )}
          </View>
        </View>

        {/* Medical Conditions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="medical-information" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Medical Conditions</Text>
          </View>

          {profile.medical_conditions.length > 0 ? (
            <View style={styles.listContainer}>
              {profile.medical_conditions.map((condition, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listItemText}>{condition}</Text>
                  {isEditing && (
                    <TouchableOpacity
                      onPress={() => handleRemoveItem("medical_conditions", index)}
                      style={styles.removeButton}
                    >
                      <MaterialIcons name="close" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyListText}>No medical conditions listed</Text>
          )}
          {isEditing && (
            <TouchableOpacity style={styles.addButton} onPress={() => handleAddItem("medical_conditions")}>
              <MaterialIcons name="add" size={16} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Medical Condition</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Medications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="medication" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Medications</Text>
          </View>

          {profile.medications.length > 0 ? (
            <View style={styles.listContainer}>
              {profile.medications.map((medication, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listItemText}>{medication}</Text>
                  {isEditing && (
                    <TouchableOpacity
                      onPress={() => handleRemoveItem("medications", index)}
                      style={styles.removeButton}
                    >
                      <MaterialIcons name="close" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyListText}>No medications listed</Text>
          )}
          {isEditing && (
            <TouchableOpacity style={styles.addButton} onPress={() => handleAddItem("medications")}>
              <MaterialIcons name="add" size={16} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Medication</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Allergies Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="warning" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Allergies</Text>
          </View>

          {profile.allergies.length > 0 ? (
            <View style={styles.listContainer}>
              {profile.allergies.map((allergy, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listItemText}>{allergy}</Text>
                  {isEditing && (
                    <TouchableOpacity onPress={() => handleRemoveItem("allergies", index)} style={styles.removeButton}>
                      <MaterialIcons name="close" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyListText}>No allergies listed</Text>
          )}
          {isEditing && (
            <TouchableOpacity style={styles.addButton} onPress={() => handleAddItem("allergies")}>
              <MaterialIcons name="add" size={16} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Allergy</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Emergency Contact Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="emergency" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={profile.emergency_contact.name}
                onChangeText={(text) =>
                  setProfile({
                    ...profile,
                    emergency_contact: { ...profile.emergency_contact, name: text },
                  })
                }
                placeholder="Enter emergency contact name"
                placeholderTextColor={colors.placeholder}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.emergency_contact.name || "Not provided"}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={profile.emergency_contact.phone}
                onChangeText={(text) =>
                  setProfile({
                    ...profile,
                    emergency_contact: { ...profile.emergency_contact, phone: text },
                  })
                }
                placeholder="Enter emergency contact phone"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.emergency_contact.phone || "Not provided"}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Relationship</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={profile.emergency_contact.relationship}
                onChangeText={(text) =>
                  setProfile({
                    ...profile,
                    emergency_contact: { ...profile.emergency_contact, relationship: text },
                  })
                }
                placeholder="Enter relationship"
                placeholderTextColor={colors.placeholder}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.emergency_contact.relationship || "Not provided"}</Text>
            )}
          </View>
        </View>

        {/* Healthcare Provider Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="local-hospital" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Healthcare Provider</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Doctor</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={profile.doctor_info.name}
                onChangeText={(text) =>
                  setProfile({
                    ...profile,
                    doctor_info: { ...profile.doctor_info, name: text },
                  })
                }
                placeholder="Enter doctor's name"
                placeholderTextColor={colors.placeholder}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.doctor_info.name || "Not provided"}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={profile.doctor_info.phone}
                onChangeText={(text) =>
                  setProfile({
                    ...profile,
                    doctor_info: { ...profile.doctor_info, phone: text },
                  })
                }
                placeholder="Enter doctor's phone"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.doctor_info.phone || "Not provided"}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={profile.doctor_info.email}
                onChangeText={(text) =>
                  setProfile({
                    ...profile,
                    doctor_info: { ...profile.doctor_info, email: text },
                  })
                }
                placeholder="Enter doctor's email"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.doctor_info.email || "Not provided"}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Hospital</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={profile.doctor_info.hospital}
                onChangeText={(text) =>
                  setProfile({
                    ...profile,
                    doctor_info: { ...profile.doctor_info, hospital: text },
                  })
                }
                placeholder="Enter hospital/clinic name"
                placeholderTextColor={colors.placeholder}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile.doctor_info.hospital || "Not provided"}</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: colors.background,
      paddingBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: colors.textSecondary,
    },
    profileHeader: {
      alignItems: "center",
      marginBottom: 30,
      paddingVertical: 20,
    },
    avatarContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 15,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    profileName: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 5,
    },
    profileEmail: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    actionButtonsContainer: {
      marginBottom: 20,
    },
    editButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 25,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    editButtonText: {
      color: "#fff",
      marginLeft: 8,
      fontWeight: "600",
      fontSize: 16,
    },
    editingActions: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 25,
      flex: 0.48,
    },
    cancelButton: {
      backgroundColor: colors.textSecondary,
    },
    saveButton: {
      backgroundColor: colors.success,
    },
    actionButtonText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 16,
      marginLeft: 8,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginLeft: 10,
    },
    fieldContainer: {
      marginBottom: 16,
    },
    fieldRow: {
      flexDirection: "row",
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 6,
      fontWeight: "500",
    },
    fieldValue: {
      fontSize: 16,
      color: colors.text,
      paddingVertical: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      backgroundColor: colors.background,
      color: colors.text,
    },
    listContainer: {
      marginBottom: 10,
    },
    listItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      borderRadius: 8,
      marginBottom: 8,
    },
    listItemText: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    removeButton: {
      padding: 4,
    },
    emptyListText: {
      fontSize: 16,
      color: colors.textSecondary,
      fontStyle: "italic",
      marginBottom: 10,
      textAlign: "center",
      paddingVertical: 20,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    addButtonText: {
      color: colors.primary,
      marginLeft: 8,
      fontSize: 14,
      fontWeight: "500",
    },
  })
