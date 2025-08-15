"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { MaterialIcons } from "@expo/vector-icons"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../config/firebase"
import themeService from "../services/themeService"

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password")
      return
    }

    setIsLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      // Navigation will be handled by auth state listener
      navigation.navigate("Dashboard")
    } catch (error) {
      let errorMessage = "An error occurred during login"

      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email address"
          break
        case "auth/wrong-password":
          errorMessage = "Incorrect password"
          break
        case "auth/invalid-email":
          errorMessage = "Invalid email address"
          break
        case "auth/user-disabled":
          errorMessage = "This account has been disabled"
          break
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later"
          break
        case "auth/network-request-failed":
          errorMessage = "Network error. Please check your connection"
          break
        default:
          errorMessage = error.message
      }

      Alert.alert("Login Failed", errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleThemeToggle = async () => {
    await themeService.toggleTheme()
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
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </View>

      <View style={styles.form}>
        {/* Email Input */}
        <View style={[styles.inputContainer, focusedField === "email" && styles.inputFocused]}>
          <MaterialIcons
            name="email"
            size={20}
            color={focusedField === "email" ? colors.primary : colors.textSecondary}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
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

        {/* Password Input */}
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

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.disabledButton]}
          onPress={handleLogin}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
        </TouchableOpacity>

        {/* Forgot Password Link */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("ForgotPassword")}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Signup Link */}
        <TouchableOpacity
          style={styles.alternateButton}
          onPress={() => navigation.navigate("SignUp")}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <Text style={styles.alternateButtonText}>Create New Account</Text>
        </TouchableOpacity>
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
      fontWeight: "800",
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    form: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 3,
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
    primaryButton: {
      width: "100%",
      height: 56,
      backgroundColor: colors.primary,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    disabledButton: {
      opacity: 0.7,
    },
    primaryButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
    secondaryButton: {
      alignSelf: "center",
      marginBottom: 24,
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "500",
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      width: 40,
      textAlign: "center",
      color: colors.textSecondary,
      fontSize: 14,
    },
    alternateButton: {
      width: "100%",
      height: 56,
      backgroundColor: colors.background,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    alternateButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "600",
    },
  })
