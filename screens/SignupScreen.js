"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import { MaterialIcons } from "@expo/vector-icons"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { auth } from "../config/firebase"
import userProfileService from "../services/userProfileService"
import themeService from "../services/themeService"

export default function SignupScreen() {
  const navigation = useNavigation()
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [focusedField, setFocusedField] = useState(null)
  const [currentTheme, setCurrentTheme] = useState("light")

  // Step 1: Account Information
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Step 2: Personal Information
  const [phone, setPhone] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [gender, setGender] = useState("")

  // Step 3: Health Information
  const [height, setHeight] = useState("")
  const [weight, setWeight] = useState("")
  const [bloodType, setBloodType] = useState("")
  const [medicalConditions, setMedicalConditions] = useState("")
  const [medications, setMedications] = useState("")
  const [allergies, setAllergies] = useState("")

  // Step 4: Emergency Contact
  const [emergencyName, setEmergencyName] = useState("")
  const [emergencyPhone, setEmergencyPhone] = useState("")
  const [emergencyRelationship, setEmergencyRelationship] = useState("")

  // Step 5: Healthcare Provider
  const [doctorName, setDoctorName] = useState("")
  const [doctorPhone, setDoctorPhone] = useState("")
  const [doctorEmail, setDoctorEmail] = useState("")
  const [doctorHospital, setDoctorHospital] = useState("")

  useEffect(() => {
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

  const handleThemeToggle = async () => {
    await themeService.toggleTheme()
  }

  const validatePassword = (password) => {
    const minLength = password.length >= 8
    const hasUppercase = /[A-Z]/.test(password)
    const hasNumber = /\d/.test(password)

    return {
      isValid: minLength && hasUppercase && hasNumber,
      minLength,
      hasUppercase,
      hasNumber,
    }
  }

  const validateStep1 = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your full name")
      return false
    }

    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address")
      return false
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address")
      return false
    }

    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please enter and confirm your password")
      return false
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match")
      return false
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      Alert.alert("Error", "Password does not meet requirements")
      return false
    }

    return true
  }

  const validateStep2 = () => {
    // Phone validation (optional but if provided, must be valid)
    if (phone.trim() && !/^\+?[0-9\s\-()]{7,}$/.test(phone)) {
      Alert.alert("Error", "Please enter a valid phone number")
      return false
    }

    // Date of birth validation (optional but if provided, must be valid)
    if (dateOfBirth.trim()) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(dateOfBirth)) {
        Alert.alert("Error", "Please enter date of birth in YYYY-MM-DD format")
        return false
      }
    }

    return true
  }

  const validateStep3 = () => {
    // Height validation (optional but if provided, must be valid)
    if (height.trim() && isNaN(Number.parseFloat(height))) {
      Alert.alert("Error", "Height must be a number")
      return false
    }

    // Weight validation (optional but if provided, must be valid)
    if (weight.trim() && isNaN(Number.parseFloat(weight))) {
      Alert.alert("Error", "Weight must be a number")
      return false
    }

    return true
  }

  const validateStep4 = () => {
    // Emergency contact validation
    if (!emergencyName.trim()) {
      Alert.alert("Error", "Please enter emergency contact name")
      return false
    }

    if (!emergencyPhone.trim()) {
      Alert.alert("Error", "Please enter emergency contact phone number")
      return false
    }

    // Phone validation
    if (!/^\+?[0-9\s\-()]{7,}$/.test(emergencyPhone)) {
      Alert.alert("Error", "Please enter a valid emergency contact phone number")
      return false
    }

    return true
  }

  const validateStep5 = () => {
    // Doctor information validation
    if (!doctorName.trim()) {
      Alert.alert("Error", "Please enter your doctor's name")
      return false
    }

    if (!doctorPhone.trim()) {
      Alert.alert("Error", "Please enter your doctor's phone number")
      return false
    }

    // Phone validation
    if (!/^\+?[0-9\s\-()]{7,}$/.test(doctorPhone)) {
      Alert.alert("Error", "Please enter a valid doctor phone number")
      return false
    }

    // Email validation (if provided)
    if (doctorEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(doctorEmail)) {
        Alert.alert("Error", "Please enter a valid doctor email address")
        return false
      }
    }

    return true
  }

  const handleNextStep = () => {
    if (currentStep === 1 && !validateStep1()) return
    if (currentStep === 2 && !validateStep2()) return
    if (currentStep === 3 && !validateStep3()) return
    if (currentStep === 4 && !validateStep4()) return

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSignup = async () => {
    if (!validateStep5()) return

    try {
      setIsLoading(true)

      // Create user account with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Update user profile with display name
      await updateProfile(userCredential.user, {
        displayName: name.trim(),
      })

      // Prepare profile data for Firestore
      const profileData = {
        display_name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        date_of_birth: dateOfBirth.trim(),
        gender: gender.trim(),
        height: height.trim() ? Number.parseFloat(height) : null,
        weight: weight.trim() ? Number.parseFloat(weight) : null,
        blood_type: bloodType.trim(),
        medical_conditions: medicalConditions.trim() ? medicalConditions.split(",").map((item) => item.trim()) : [],
        medications: medications.trim() ? medications.split(",").map((item) => item.trim()) : [],
        allergies: allergies.trim() ? allergies.split(",").map((item) => item.trim()) : [],
        emergency_contact: {
          name: emergencyName.trim(),
          phone: emergencyPhone.trim(),
          relationship: emergencyRelationship.trim(),
        },
        doctor_info: {
          name: doctorName.trim(),
          phone: doctorPhone.trim(),
          email: doctorEmail.trim(),
          hospital: doctorHospital.trim(),
        },
      }

      // Store additional profile data in Firestore
      await userProfileService.createOrUpdateProfile(profileData)

      Alert.alert("Success", "Account created successfully!", [
        { text: "OK", onPress: () => navigation.navigate("Dashboard") },
      ])
    } catch (error) {
      let errorMessage = "An error occurred during signup"

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "An account with this email already exists"
          break
        case "auth/invalid-email":
          errorMessage = "Invalid email address"
          break
        case "auth/weak-password":
          errorMessage = "Password is too weak"
          break
        case "auth/network-request-failed":
          errorMessage = "Network error. Please check your connection"
          break
        default:
          errorMessage = error.message
      }

      Alert.alert("Signup Failed", errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const passwordValidation = validatePassword(password)
  const colors = themeService.getColors(currentTheme)
  const styles = createStyles(colors)

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicator}>
        {[1, 2, 3, 4, 5].map((step) => (
          <View
            key={step}
            style={[
              styles.stepDot,
              currentStep === step ? styles.activeStepDot : currentStep > step ? styles.completedStepDot : {},
            ]}
          >
            {currentStep > step ? (
              <MaterialIcons name="check" size={12} color="#fff" />
            ) : (
              <Text style={currentStep === step ? styles.activeStepText : styles.stepText}>{step}</Text>
            )}
          </View>
        ))}
      </View>
    )
  }

  const renderStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Account Information"
      case 2:
        return "Personal Information"
      case 3:
        return "Health Information"
      case 4:
        return "Emergency Contact"
      case 5:
        return "Healthcare Provider"
      default:
        return ""
    }
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <View style={[styles.inputContainer, focusedField === "name" && styles.inputFocused]}>
              <MaterialIcons
                name="person"
                size={20}
                color={focusedField === "name" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, focusedField === "email" && styles.inputFocused]}>
              <MaterialIcons
                name="email"
                size={20}
                color={focusedField === "email" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, focusedField === "password" && styles.inputFocused]}>
              <MaterialIcons
                name="lock"
                size={20}
                color={focusedField === "password" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialIcons
                  name={showPassword ? "visibility-off" : "visibility"}
                  size={20}
                  color={focusedField === "password" ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.inputContainer, focusedField === "confirmPassword" && styles.inputFocused]}>
              <MaterialIcons
                name="lock"
                size={20}
                color={focusedField === "confirmPassword" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setFocusedField("confirmPassword")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={styles.passwordRules}>
              <Text style={[styles.ruleText, passwordValidation.minLength && styles.ruleValid]}>
                • At least 8 characters
              </Text>
              <Text style={[styles.ruleText, passwordValidation.hasUppercase && styles.ruleValid]}>
                • One uppercase letter
              </Text>
              <Text style={[styles.ruleText, passwordValidation.hasNumber && styles.ruleValid]}>• One number</Text>
            </View>
          </>
        )
      case 2:
        return (
          <>
            <View style={[styles.inputContainer, focusedField === "phone" && styles.inputFocused]}>
              <MaterialIcons
                name="phone"
                size={20}
                color={focusedField === "phone" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setFocusedField("phone")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, focusedField === "dateOfBirth" && styles.inputFocused]}>
              <MaterialIcons
                name="calendar-today"
                size={20}
                color={focusedField === "dateOfBirth" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Date of Birth (YYYY-MM-DD)"
                placeholderTextColor={colors.placeholder}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                onFocus={() => setFocusedField("dateOfBirth")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, focusedField === "gender" && styles.inputFocused]}>
              <MaterialIcons
                name="person"
                size={20}
                color={focusedField === "gender" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Gender"
                placeholderTextColor={colors.placeholder}
                value={gender}
                onChangeText={setGender}
                onFocus={() => setFocusedField("gender")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={styles.infoText}>
              <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoTextContent}>
                This information helps us personalize your health monitoring experience.
              </Text>
            </View>
          </>
        )
      case 3:
        return (
          <>
            <View style={[styles.inputContainer, focusedField === "height" && styles.inputFocused]}>
              <MaterialIcons
                name="height"
                size={20}
                color={focusedField === "height" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Height (cm)"
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
                onFocus={() => setFocusedField("height")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, focusedField === "weight" && styles.inputFocused]}>
              <MaterialIcons
                name="fitness-center"
                size={20}
                color={focusedField === "weight" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Weight (kg)"
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
                onFocus={() => setFocusedField("weight")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, focusedField === "bloodType" && styles.inputFocused]}>
              <MaterialIcons
                name="opacity"
                size={20}
                color={focusedField === "bloodType" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Blood Type (e.g., A+, B-, O+)"
                placeholderTextColor={colors.placeholder}
                value={bloodType}
                onChangeText={setBloodType}
                onFocus={() => setFocusedField("bloodType")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, focusedField === "medicalConditions" && styles.inputFocused]}>
              <MaterialIcons
                name="medical-services"
                size={20}
                color={focusedField === "medicalConditions" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Medical Conditions (comma separated)"
                placeholderTextColor={colors.placeholder}
                value={medicalConditions}
                onChangeText={setMedicalConditions}
                onFocus={() => setFocusedField("medicalConditions")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, focusedField === "medications" && styles.inputFocused]}>
              <MaterialIcons
                name="healing"
                size={20}
                color={focusedField === "medications" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Medications (comma separated)"
                placeholderTextColor={colors.placeholder}
                value={medications}
                onChangeText={setMedications}
                onFocus={() => setFocusedField("medications")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, focusedField === "allergies" && styles.inputFocused]}>
              <MaterialIcons
                name="error-outline"
                size={20}
                color={focusedField === "allergies" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Allergies (comma separated)"
                placeholderTextColor={colors.placeholder}
                value={allergies}
                onChangeText={setAllergies}
                onFocus={() => setFocusedField("allergies")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>
          </>
        )
      case 4:
        return (
          <>
            <View style={[styles.inputContainer, focusedField === "emergencyName" && styles.inputFocused]}>
              <MaterialIcons
                name="person"
                size={20}
                color={focusedField === "emergencyName" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Emergency Contact Name *"
                placeholderTextColor={colors.placeholder}
                value={emergencyName}
                onChangeText={setEmergencyName}
                onFocus={() => setFocusedField("emergencyName")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, focusedField === "emergencyPhone" && styles.inputFocused]}>
              <MaterialIcons
                name="phone"
                size={20}
                color={focusedField === "emergencyPhone" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Emergency Contact Phone *"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                onFocus={() => setFocusedField("emergencyPhone")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, focusedField === "emergencyRelationship" && styles.inputFocused]}>
              <MaterialIcons
                name="people"
                size={20}
                color={focusedField === "emergencyRelationship" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Relationship (e.g., Spouse, Parent)"
                placeholderTextColor={colors.placeholder}
                value={emergencyRelationship}
                onChangeText={setEmergencyRelationship}
                onFocus={() => setFocusedField("emergencyRelationship")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={styles.infoText}>
              <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoTextContent}>
                Emergency contact information is crucial for your safety. This information will only be used in case of
                emergency.
              </Text>
            </View>

            <Text style={styles.requiredFieldsNote}>* Required fields</Text>
          </>
        )
      case 5:
        return (
          <>
            <View style={[styles.inputContainer, focusedField === "doctorName" && styles.inputFocused]}>
              <MaterialIcons
                name="person"
                size={20}
                color={focusedField === "doctorName" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Doctor's Name *"
                placeholderTextColor={colors.placeholder}
                value={doctorName}
                onChangeText={setDoctorName}
                onFocus={() => setFocusedField("doctorName")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, focusedField === "doctorPhone" && styles.inputFocused]}>
              <MaterialIcons
                name="phone"
                size={20}
                color={focusedField === "doctorPhone" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Doctor's Phone Number *"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
                value={doctorPhone}
                onChangeText={setDoctorPhone}
                onFocus={() => setFocusedField("doctorPhone")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, focusedField === "doctorEmail" && styles.inputFocused]}>
              <MaterialIcons
                name="email"
                size={20}
                color={focusedField === "doctorEmail" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Doctor's Email"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                value={doctorEmail}
                onChangeText={setDoctorEmail}
                onFocus={() => setFocusedField("doctorEmail")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, focusedField === "doctorHospital" && styles.inputFocused]}>
              <MaterialIcons
                name="business"
                size={20}
                color={focusedField === "doctorHospital" ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Hospital/Clinic Name"
                placeholderTextColor={colors.placeholder}
                value={doctorHospital}
                onChangeText={setDoctorHospital}
                onFocus={() => setFocusedField("doctorHospital")}
                onBlur={() => setFocusedField(null)}
                editable={!isLoading}
              />
            </View>

            <View style={styles.infoText}>
              <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoTextContent}>
                Your healthcare provider information will be used to contact your doctor when needed through the app.
              </Text>
            </View>

            <Text style={styles.requiredFieldsNote}>* Required fields</Text>

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.disabledButton]}
              onPress={handleSignup}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </>
        )
      default:
        return null
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.themeToggleContainer}>
          <TouchableOpacity onPress={handleThemeToggle} style={styles.themeToggle}>
            <MaterialIcons
              name={currentTheme === "light" ? "dark-mode" : "light-mode"}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Step {currentStep}: {renderStepTitle()}
          </Text>
        </View>

        {renderStepIndicator()}

        <View style={styles.form}>{renderCurrentStep()}</View>

        {currentStep !== 5 && (
          <TouchableOpacity
            style={[styles.nextButton, isLoading && styles.disabledButton]}
            onPress={handleNextStep}
            disabled={isLoading}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.backButton, isLoading && styles.disabledButton]}
            onPress={handlePrevStep}
            disabled={isLoading}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate("Login")} disabled={isLoading}>
          <Text style={styles.loginLinkText}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 24,
      paddingVertical: 40,
    },
    themeToggleContainer: {
      alignItems: "flex-end",
      marginBottom: 20,
    },
    themeToggle: {
      padding: 8,
    },
    header: {
      marginBottom: 30,
      alignItems: "center",
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    stepIndicator: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 30,
    },
    stepDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.disabled,
      justifyContent: "center",
      alignItems: "center",
      marginHorizontal: 6,
    },
    activeStepDot: {
      backgroundColor: colors.primary,
    },
    completedStepDot: {
      backgroundColor: colors.success,
    },
    stepText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "bold",
    },
    activeStepText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "bold",
    },
    form: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      marginBottom: 20,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 16,
      marginBottom: 16,
      height: 56,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputFocused: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "10",
    },
    input: {
      flex: 1,
      marginLeft: 12,
      color: colors.text,
      fontSize: 16,
    },
    passwordRules: {
      marginBottom: 16,
      paddingHorizontal: 8,
    },
    ruleText: {
      color: colors.textSecondary,
      fontSize: 12,
      marginBottom: 4,
    },
    ruleValid: {
      color: colors.success,
    },
    infoText: {
      flexDirection: "row",
      backgroundColor: colors.disabled,
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
      marginBottom: 16,
    },
    infoTextContent: {
      marginLeft: 8,
      color: colors.textSecondary,
      fontSize: 12,
      flex: 1,
    },
    requiredFieldsNote: {
      fontSize: 12,
      color: colors.error,
      marginBottom: 16,
      fontStyle: "italic",
    },
    primaryButton: {
      width: "100%",
      height: 56,
      backgroundColor: colors.primary,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    nextButton: {
      width: "100%",
      height: 56,
      backgroundColor: colors.primary,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
      flexDirection: "row",
    },
    backButton: {
      width: "100%",
      height: 48,
      backgroundColor: "transparent",
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
      flexDirection: "row",
    },
    disabledButton: {
      opacity: 0.7,
    },
    primaryButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
    nextButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
      marginRight: 8,
    },
    backButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
    },
    loginLink: {
      alignItems: "center",
      marginBottom: 20,
    },
    loginLinkText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "500",
    },
  })
