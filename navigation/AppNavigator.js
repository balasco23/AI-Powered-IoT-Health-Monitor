"use client"

import { createStackNavigator } from "@react-navigation/stack"
import { useEffect, useState } from "react"
import LoginScreen from "../screens/LoginScreen"
import DashboardScreen from "../screens/DashboardScreen"
import MetricsScreen from "../screens/MetricsScreen"
import PredictiveAnalysisScreen from "../screens/PredictiveAnalysisScreen"
import ContactDoctorScreen from "../screens/ContactDoctorScreen"
import SignupScreen from "../screens/SignupScreen"
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen"
import UserProfileScreen from "../screens/UserProfileScreen"
import themeService from "../services/themeService"

const Stack = createStackNavigator()

export default function AppNavigator() {
  const [currentTheme, setCurrentTheme] = useState("light")

  useEffect(() => {
    // Initialize theme
    const initializeTheme = async () => {
      const theme = await themeService.loadTheme()
      setCurrentTheme(theme)
    }

    initializeTheme()

    // Subscribe to theme changes
    const unsubscribe = themeService.subscribe((newTheme) => {
      setCurrentTheme(newTheme)
    })

    return unsubscribe
  }, [])

  // Get theme colors
  const colors = themeService.getColors(currentTheme)

  // Create navigation theme
  const navigationTheme = {
    dark: currentTheme === "dark",
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  }

  // Screen options that apply theme
  const getScreenOptions = (title) => ({
    title: title,
    headerStyle: {
      backgroundColor: colors.surface,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    headerTitleStyle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "600",
    },
    headerTintColor: colors.primary,
    headerBackTitleVisible: false,
  })

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SignUp" component={SignupScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Metrics" component={MetricsScreen} options={getScreenOptions("Live Metrics")} />
      <Stack.Screen
        name="PredictiveAnalysis"
        component={PredictiveAnalysisScreen}
        options={getScreenOptions("Health Predictions")}
      />
      <Stack.Screen name="ContactDoctor" component={ContactDoctorScreen} options={getScreenOptions("Contact Doctor")} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={getScreenOptions("Your Profile")} />
    </Stack.Navigator>
  )
}
