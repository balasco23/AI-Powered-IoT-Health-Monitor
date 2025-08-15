import AsyncStorage from "@react-native-async-storage/async-storage"

class ThemeService {
  constructor() {
    this.currentTheme = "light"
    this.listeners = []
  }

  async loadTheme() {
    try {
      const savedTheme = await AsyncStorage.getItem("app_theme")
      this.currentTheme = savedTheme || "light"
      this.notifyListeners()
      return this.currentTheme
    } catch (error) {
      console.error("Error loading theme:", error)
      return "light"
    }
  }

  async setTheme(theme) {
    try {
      this.currentTheme = theme
      await AsyncStorage.setItem("app_theme", theme)
      this.notifyListeners()
    } catch (error) {
      console.error("Error saving theme:", error)
    }
  }

  async toggleTheme() {
    const newTheme = this.currentTheme === "light" ? "dark" : "light"
    await this.setTheme(newTheme)
    return newTheme
  }

  getCurrentTheme() {
    return this.currentTheme
  }

  subscribe(listener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  notifyListeners() {
    this.listeners.forEach((listener) => listener(this.currentTheme))
  }

  getColors(theme = this.currentTheme) {
    if (theme === "dark") {
      return {
        background: "#121212",
        surface: "#1E1E1E",
        card: "#2D2D2D",
        primary: "#4285f4",
        primaryVariant: "#3367d6",
        secondary: "#03DAC6",
        text: "#FFFFFF",
        textSecondary: "#B3B3B3",
        textTertiary: "#8A8A8A",
        border: "#404040",
        error: "#CF6679",
        success: "#4CAF50",
        warning: "#FF9800",
        info: "#2196F3",
        shadow: "#000000",
        overlay: "rgba(0, 0, 0, 0.7)",
        accent: "#BB86FC",
        disabled: "#555555",
        placeholder: "#666666",
      }
    } else {
      return {
        background: "#f8f9fa",
        surface: "#ffffff",
        card: "#ffffff",
        primary: "#4285f4",
        primaryVariant: "#3367d6",
        secondary: "#03DAC6",
        text: "#212529",
        textSecondary: "#6c757d",
        textTertiary: "#adb5bd",
        border: "#e9ecef",
        error: "#dc3545",
        success: "#28a745",
        warning: "#ffc107",
        info: "#17a2b8",
        shadow: "#000000",
        overlay: "rgba(0, 0, 0, 0.5)",
        accent: "#6f42c1",
        disabled: "#e9ecef",
        placeholder: "#adb5bd",
      }
    }
  }

  // Get React Navigation theme object
  getNavigationTheme(theme = this.currentTheme) {
    const colors = this.getColors(theme)

    return {
      dark: theme === "dark",
      colors: {
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
      },
    }
  }
}

export default new ThemeService()
