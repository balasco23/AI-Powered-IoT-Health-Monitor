"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { MaterialIcons } from "@expo/vector-icons"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "../config/firebase"
import themeService from "../services/themeService"

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [currentTheme, setCurrentTheme] = useState("light")
  const navigation = useNavigation()

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

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      await sendPasswordResetEmail(auth, email)

      Alert.alert(
        "Reset Email Sent",
        `Password reset instructions have been sent to ${email}. Please check your email and follow the instructions to reset your password.`,
        [{ text: "OK", onPress: () => navigation.goBack() }],
      )
    } catch (error) {
      let errorMessage = "An error occurred while sending reset email"

      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email address"
          break
        case "auth/invalid-email":
          errorMessage = "Invalid email address"
          break
        case "auth/too-many-requests":
          errorMessage = "Too many requests. Please try again later"
          break
        case "auth/network-request-failed":
          errorMessage = "Network error. Please check your connection"
          break
        default:
          errorMessage = error.message
      }

      Alert.alert("Reset Failed", errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const colors = themeService.getColors(currentTheme)
  const styles = createStyles(colors)

  return (
    <View style={styles.container}>
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
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your email to receive reset instructions</Text>
      </View>

      <View style={styles.form}>
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

        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.disabledButton]}
          onPress={handleReset}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={isLoading}>
          <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
          <Text style={styles.backButtonText}> Back to Sign In</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <MaterialIcons name="info-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.infoText}>
          You will receive an email with instructions on how to reset your password. Please check your spam folder if
          you don't see it in your inbox.
        </Text>
      </View>
    </View>
  )
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 24,
      justifyContent: "center",
    },
    themeToggleContainer: {
      position: "absolute",
      top: 60,
      right: 24,
      zIndex: 1,
    },
    themeToggle: {
      padding: 8,
    },
    header: {
      marginBottom: 40,
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
      textAlign: "center",
      lineHeight: 22,
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
      marginBottom: 24,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 16,
      marginBottom: 24,
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
    primaryButton: {
      width: "100%",
      height: 56,
      backgroundColor: colors.primary,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    disabledButton: {
      opacity: 0.7,
    },
    primaryButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    backButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "500",
    },
    infoContainer: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    infoText: {
      flex: 1,
      marginLeft: 12,
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
  })
