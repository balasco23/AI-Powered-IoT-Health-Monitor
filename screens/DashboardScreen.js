"use client"

import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Linking } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { MaterialIcons, FontAwesome5, Feather } from "@expo/vector-icons"
import healthMetricsService from "../services/healthMetricsService"
import userProfileService from "../services/userProfileService"
import themeService from "../services/themeService"
import healthTipsService from "../services/healthTipsService"
import { auth } from "../config/firebase"
import { signOut } from "firebase/auth"

export default function DashboardScreen() {
  const navigation = useNavigation()
  const [loading, setLoading] = useState(true)
  const [latestMetrics, setLatestMetrics] = useState({})
  const [userName, setUserName] = useState("")
  const [userProfile, setUserProfile] = useState(null)
  const [currentTheme, setCurrentTheme] = useState("light")
  const [dailyTip, setDailyTip] = useState(null)

  useEffect(() => {
    loadDashboardData()
    initializeTheme()
    loadDailyTip()
  }, [])

  const initializeTheme = async () => {
    const theme = await themeService.loadTheme()
    setCurrentTheme(theme)

    const unsubscribe = themeService.subscribe((newTheme) => {
      setCurrentTheme(newTheme)
    })

    return unsubscribe
  }

  const loadDailyTip = () => {
    const tip = healthTipsService.getDailyTip()
    setDailyTip(tip)
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Get user name from auth
      if (auth.currentUser && auth.currentUser.displayName) {
        setUserName(auth.currentUser.displayName)
      }

      // Get user profile
      const profile = await userProfileService.getProfile()
      setUserProfile(profile)
      console.log("Loaded user profile:", JSON.stringify(profile, null, 2))

      // Get latest metrics
      const metrics = await healthMetricsService.getLatestMetrics()
      setLatestMetrics(metrics)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      })
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleThemeToggle = async () => {
    await themeService.toggleTheme()
  }

  const handleEmergencyContact = async () => {
    if (!userProfile || !userProfile.emergency_contact || !userProfile.emergency_contact.phone) {
      Alert.alert(
        "No Emergency Contact",
        "No emergency contact information found. Please update your profile with emergency contact details.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Update Profile",
            onPress: () => {
              navigation.navigate("UserProfile")
            },
          },
        ],
      )
      return
    }

    const { name, phone } = userProfile.emergency_contact

    // Log the emergency contact info for debugging
    console.log("Emergency contact info:", { name, phone })

    Alert.alert("Contact Emergency Contact", `Call ${name} at ${phone}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: async () => {
          try {
            // Clean the phone number to ensure it works with tel: URL
            const cleanPhone = phone.replace(/[^\d+]/g, "")
            console.log("Attempting to call:", cleanPhone)

            const phoneUrl = `tel:${cleanPhone}`
            const canCall = await Linking.canOpenURL(phoneUrl)

            if (canCall) {
              await Linking.openURL(phoneUrl)
            } else {
              Alert.alert("Error", "Cannot make phone calls from this device")
            }
          } catch (error) {
            console.error("Error making call:", error)
            Alert.alert("Error", "Failed to initiate call: " + error.message)
          }
        },
      },
    ])
  }

  const formatMetricValue = (metric) => {
    if (!metric) return "No data"

    switch (metric.metric_type) {
      case "temperature":
        return `${metric.value}°C`
      case "heart_rate":
        return `${metric.value} bpm`
      case "weight":
        return `${metric.value} kg`
      case "glucose":
        return `${metric.value} mg/dL`
      default:
        return JSON.stringify(metric.value)
    }
  }

  // Create a function to handle navigation to profile
  const handleNavigateToProfile = () => {
    navigation.navigate("UserProfile")
  }

  // Create a function to handle navigation to contact doctor
  const handleNavigateToContactDoctor = () => {
    navigation.navigate("ContactDoctor")
  }

  const colors = themeService.getColors(currentTheme)
  const styles = createStyles(colors)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your health dashboard...</Text>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.header}>Health Dashboard</Text>
          <Text style={styles.subHeader}>Welcome back{userName ? `, ${userName}` : ""}!</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleThemeToggle} style={styles.themeButton}>
            <MaterialIcons
              name={currentTheme === "light" ? "dark-mode" : "light-mode"}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNavigateToProfile} style={styles.profileButton}>
            <MaterialIcons name="person" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <MaterialIcons name="logout" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardContainer}>
        <TouchableOpacity style={[styles.card, styles.cardPrimary]} onPress={() => navigation.navigate("Metrics")}>
          <View style={styles.cardIconContainer}>
            <MaterialIcons name="monitor-heart" size={28} color="#fff" />
          </View>
          <Text style={styles.cardTitle}>Real-time Metrics</Text>
          <Text style={styles.cardText}>
            {latestMetrics.temperature
              ? `Temperature: ${formatMetricValue(latestMetrics.temperature)}`
              : latestMetrics.heart_rate
                ? `Heart Rate: ${formatMetricValue(latestMetrics.heart_rate)}`
                : "View your current health data"}
          </Text>
          <Text style={styles.cardLink}>View now →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.cardSecondary]}
          onPress={() => navigation.navigate("PredictiveAnalysis")}
        >
          <View style={[styles.cardIconContainer, { backgroundColor: colors.success }]}>
            <FontAwesome5 name="chart-line" size={28} color="#fff" />
          </View>
          <Text style={styles.cardTitle}>Predictive Analysis</Text>
          <Text style={styles.cardText}>Get insights about your health trends</Text>
          <Text style={styles.cardLink}>View now →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={[styles.actionButton, styles.doctorButton]} onPress={handleNavigateToContactDoctor}>
            <MaterialIcons name="medical-services" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Contact Healthcare Professional</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.emergencyButton]} onPress={handleEmergencyContact}>
            <Feather name="phone-call" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Call Emergency Contact</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.profileActionButton]} onPress={handleNavigateToProfile}>
            <MaterialIcons name="person" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>View/Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {dailyTip && (
        <View style={styles.healthTips}>
          <Text style={styles.sectionTitle}>Daily Health Tip</Text>
          <View style={styles.tipContainer}>
            <View style={styles.tipHeader}>
              <MaterialIcons name={dailyTip.icon} size={24} color={colors.warning} />
              <Text style={styles.tipTitle}>{dailyTip.title}</Text>
            </View>
            <Text style={styles.tipText}>{dailyTip.tip}</Text>
            <View style={styles.tipCategory}>
              <Text style={styles.tipCategoryText}>#{dailyTip.category}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.dataSourceInfo}>
        <Text style={styles.dataSourceText}>
          <MaterialIcons name="cloud" size={14} color={colors.primary} /> Data powered by Firebase Firestore
        </Text>
      </View>
    </ScrollView>
  )
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 20,
      backgroundColor: colors.background,
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
    headerContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 25,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
    },
    themeButton: {
      padding: 8,
      marginRight: 8,
    },
    profileButton: {
      padding: 8,
      marginRight: 8,
    },
    header: {
      fontSize: 28,
      fontWeight: "800",
      marginBottom: 5,
      color: colors.text,
    },
    subHeader: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    logoutButton: {
      padding: 8,
    },
    cardContainer: {
      marginBottom: 30,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    cardPrimary: {
      borderTopWidth: 5,
      borderTopColor: colors.primary,
    },
    cardSecondary: {
      borderTopWidth: 5,
      borderTopColor: colors.success,
    },
    cardIconContainer: {
      backgroundColor: colors.primary,
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 15,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 8,
      color: colors.text,
    },
    cardText: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 15,
      lineHeight: 22,
    },
    cardLink: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "600",
    },
    quickActions: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 15,
      color: colors.text,
    },
    actionButtonsContainer: {
      flexDirection: "column",
      justifyContent: "space-between",
    },
    actionButton: {
      padding: 18,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      marginBottom: 15,
      width: "100%",
    },
    doctorButton: {
      backgroundColor: colors.primary,
    },
    emergencyButton: {
      backgroundColor: colors.error,
    },
    profileActionButton: {
      backgroundColor: colors.success,
    },
    actionButtonText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 16,
      marginLeft: 10,
    },
    healthTips: {
      marginBottom: 20,
    },
    tipContainer: {
      backgroundColor: colors.card,
      padding: 20,
      borderRadius: 15,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
      borderLeftWidth: 4,
      borderLeftColor: colors.warning,
    },
    tipHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    tipTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginLeft: 10,
    },
    tipText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 10,
    },
    tipCategory: {
      alignSelf: "flex-start",
    },
    tipCategoryText: {
      fontSize: 12,
      color: colors.primary,
      backgroundColor: colors.disabled,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      overflow: "hidden",
    },
    dataSourceInfo: {
      alignItems: "center",
      marginTop: 10,
      marginBottom: 20,
    },
    dataSourceText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: "italic",
    },
  })
