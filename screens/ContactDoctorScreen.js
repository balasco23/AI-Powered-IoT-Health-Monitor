"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import userProfileService from "../services/userProfileService"
import themeService from "../services/themeService"

export default function ContactDoctorScreen() {
  const [message, setMessage] = useState("")
  const [isUrgent, setIsUrgent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [doctorInfo, setDoctorInfo] = useState({
    name: "",
    phone: "",
    email: "",
    hospital: "",
  })
  const [userProfile, setUserProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [currentTheme, setCurrentTheme] = useState("light")

  useEffect(() => {
    initializeTheme()
    loadUserProfile()
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
      setLoadingProfile(true)
      const profile = await userProfileService.getProfile()
      setUserProfile(profile)

      // If doctor info exists in profile, use it
      if (profile.doctor_info) {
        setDoctorInfo({
          name: profile.doctor_info.name || "Not provided",
          phone: profile.doctor_info.phone || "Not provided",
          email: profile.doctor_info.email || "Not provided",
          hospital: profile.doctor_info.hospital || "Not provided",
        })
      }
    } catch (error) {
      console.error("Error loading user profile:", error)
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert("Error", "Please enter your message")
      return
    }

    setLoading(true)

    try {
      // Format the email subject and body
      const subject = `${isUrgent ? "URGENT: " : ""}Medical Inquiry from ${userProfile?.display_name || "Patient"}`

      const body = `
Dear ${doctorInfo.name},

${message}

Patient Information:
Name: ${userProfile?.display_name || "Not provided"}
Phone: ${userProfile?.phone || "Not provided"}
Email: ${userProfile?.email || "Not provided"}

${isUrgent ? "THIS IS MARKED AS URGENT. Please respond as soon as possible." : ""}

Thank you,
${userProfile?.display_name || "Patient"}
      `.trim()

      // Create the mailto URL
      const mailtoUrl = `mailto:${doctorInfo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

      // Check if device can handle the mailto URL
      const canOpen = await Linking.canOpenURL(mailtoUrl)

      if (canOpen) {
        await Linking.openURL(mailtoUrl)
        Alert.alert("Email Prepared", "Your email has been prepared. Please send it through your email app.", [
          { text: "OK", onPress: () => setMessage("") },
        ])
      } else {
        throw new Error("Cannot open email client")
      }
    } catch (error) {
      console.error("Error sending email:", error)
      Alert.alert("Error", "Could not open email client. Please contact your doctor directly at " + doctorInfo.email)
    } finally {
      setLoading(false)
    }
  }

  const handleCall = async () => {
    try {
      const phoneUrl = `tel:${doctorInfo.phone.replace(/[^\d+]/g, "")}`
      const canCall = await Linking.canOpenURL(phoneUrl)

      if (canCall) {
        await Linking.openURL(phoneUrl)
      } else {
        Alert.alert("Error", "Cannot make phone calls from this device")
      }
    } catch (error) {
      console.error("Error making call:", error)
      Alert.alert("Error", "Failed to initiate call")
    }
  }

  const colors = themeService.getColors(currentTheme)
  const styles = createStyles(colors)

  if (loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading contact information...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <Text style={styles.header}>Contact Healthcare Professional</Text>

      <View style={styles.contactInfo}>
        <Text style={styles.contactTitle}>Your Doctor:</Text>
        <Text style={styles.contactText}>{doctorInfo.name}</Text>
        <View style={styles.contactActions}>
          <TouchableOpacity style={styles.contactAction} onPress={handleCall}>
            <MaterialIcons name="phone" size={20} color={colors.primary} />
            <Text style={styles.contactActionText}>{doctorInfo.phone}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactAction} onPress={() => Linking.openURL(`mailto:${doctorInfo.email}`)}>
            <MaterialIcons name="email" size={20} color={colors.primary} />
            <Text style={styles.contactActionText}>{doctorInfo.email}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.contactText}>Hospital: {doctorInfo.hospital}</Text>
      </View>

      <Text style={styles.label}>Your Message:</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={5}
        placeholder="Describe your symptoms or concerns..."
        placeholderTextColor={colors.placeholder}
        value={message}
        onChangeText={setMessage}
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.checkboxContainer, isUrgent && styles.checked]}
        onPress={() => setIsUrgent(!isUrgent)}
        disabled={loading}
      >
        <MaterialIcons
          name={isUrgent ? "check-box" : "check-box-outline-blank"}
          size={24}
          color={isUrgent ? colors.error : colors.textSecondary}
        />
        <Text style={styles.checkboxLabel}>Mark as urgent</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.sendButton, loading && styles.disabledButton]}
        onPress={handleSend}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialIcons name="email" size={20} color="#fff" />
            <Text style={styles.sendButtonText}>Send Email to Doctor</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.callButton} onPress={handleCall}>
        <MaterialIcons name="phone" size={20} color="#fff" />
        <Text style={styles.sendButtonText}>Call Doctor</Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <MaterialIcons name="info-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.infoText}>
          For emergencies, please call 911 or your local emergency number immediately instead of using this form.
        </Text>
      </View>
    </ScrollView>
  )
}

const createStyles = (colors) =>
  StyleSheet.create({
    scrollContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      padding: 20,
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
    header: {
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 20,
      color: colors.text,
    },
    contactInfo: {
      backgroundColor: colors.card,
      padding: 15,
      borderRadius: 8,
      borderColor: colors.border,
      borderWidth: 1,
      marginBottom: 20,
    },
    contactTitle: {
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 10,
      color: colors.text,
    },
    contactText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 5,
    },
    contactActions: {
      marginVertical: 8,
    },
    contactAction: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 5,
    },
    contactActionText: {
      marginLeft: 8,
      color: colors.primary,
      fontSize: 14,
    },
    label: {
      fontSize: 16,
      marginBottom: 10,
      color: colors.text,
    },
    input: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 15,
      marginBottom: 20,
      textAlignVertical: "top",
      minHeight: 150,
      color: colors.text,
    },
    checkboxContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 20,
    },
    checked: {
      backgroundColor: colors.error + "20",
      borderColor: colors.error,
    },
    checkboxLabel: {
      fontSize: 16,
      color: colors.text,
      marginLeft: 10,
    },
    sendButton: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 15,
      flexDirection: "row",
      justifyContent: "center",
    },
    callButton: {
      backgroundColor: colors.success,
      padding: 15,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 20,
      flexDirection: "row",
      justifyContent: "center",
    },
    disabledButton: {
      opacity: 0.7,
    },
    sendButtonText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: 16,
      marginLeft: 8,
    },
    infoBox: {
      backgroundColor: colors.disabled,
      padding: 15,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "flex-start",
    },
    infoText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 10,
      flex: 1,
      lineHeight: 20,
    },
  })
