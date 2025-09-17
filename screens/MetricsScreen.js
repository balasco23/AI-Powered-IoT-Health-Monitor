"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, RefreshControl } from "react-native"
import { LineChart } from "react-native-chart-kit"
import { Dimensions } from "react-native"
import { useNavigation } from "@react-navigation/native"
import moment from "moment"
import { MaterialIcons } from "@expo/vector-icons"
import healthMetricsService from "../services/healthMetricsService"
import userProfileService from "../services/userProfileService"
import { Linking } from "react-native"

const screenWidth = Dimensions.get("window").width

export default function MetricsScreen() {
  const navigation = useNavigation()
  const [currentReadings, setCurrentReadings] = useState({})
  const [historicalData, setHistoricalData] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState("")
  const [error, setError] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [showHistoryView, setShowHistoryView] = useState(false)
  const [historyData, setHistoryData] = useState({ temperature: [], heart_rate: [] })

  const onRefresh = async () => {
    setRefreshing(true)
    await loadCurrentReadings()
    await loadUserProfile()
    await loadHistoricalData()
    setRefreshing(false)
  }

  useEffect(() => {
    console.log("🔄 MetricsScreen: Initializing - will read from Firebase current_readings endpoint")
    console.log("🔗 Firebase Database URL:", "https://patient-health-app-a48bc-default-rtdb.firebaseio.com/")
    console.log("📍 Reading from path: current_readings")
    console.log("📊 Expected fields: heart_rate_bpm, temperature_celsius")

    loadCurrentReadings()
    loadUserProfile()

    let unsubscribe = () => {}
    try {
      console.log("📡 Setting up real-time listener for current_readings...")
      unsubscribe = healthMetricsService.subscribeToCurrentReadings((readings) => {
        console.log("📊 Received current readings update from Firebase:", Object.keys(readings))
        setCurrentReadings(readings)
        if (Object.keys(readings).length > 0) {
          setLastUpdate(moment().format("h:mm:ss a"))
          setError(null)
          console.log("✅ UI updated with new readings")
        } else {
          console.log("⚠️ Received empty readings from Firebase")
        }
      })
    } catch (err) {
      console.error("❌ Error setting up current readings subscription:", err)
      setError("Failed to connect to Firebase current_readings. Please check your Firebase configuration.")
    }

    loadHistoricalData()

    return () => {
      console.log("🛑 Cleaning up MetricsScreen...")
      unsubscribe()
    }
  }, [])

  const loadUserProfile = async () => {
    try {
      const profile = await userProfileService.getProfile()
      setUserProfile(profile)
    } catch (error) {
      console.error("Error loading user profile:", error)
    }
  }

  const loadCurrentReadings = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("📥 Loading current readings from Firebase current_readings endpoint...")

      const readings = await healthMetricsService.getCurrentReadings()
      console.log("📈 Current readings loaded from Firebase:", JSON.stringify(readings, null, 2))
      setCurrentReadings(readings)

      if (Object.keys(readings).length > 0) {
        setLastUpdate(moment().format("h:mm:ss a"))
        console.log("✅ Successfully loaded", Object.keys(readings).length, "current readings")
      } else {
        console.log("⚠️ No current readings found in Firebase")
      }
    } catch (error) {
      console.error("❌ Error loading current readings from Firebase:", error)
      setError(
        "Failed to load current health readings from Firebase. Please check your connection and Firebase configuration.",
      )
    } finally {
      setLoading(false)
    }
  }

  const loadHistoricalData = async () => {
    try {
      const historicalMetrics = await healthMetricsService.getHistoricalData(7)
      console.log("📊 Historical metrics loaded for charts:", historicalMetrics)
      setHistoricalData(historicalMetrics)
    } catch (error) {
      console.error("❌ Error loading historical data:", error)
    }
  }

  const load20DayHistory = async () => {
    try {
      console.log("📊 Loading 20-day history...")
      const twentyDayData = await healthMetricsService.getHistoricalData(20)
      setHistoryData(twentyDayData)
      setShowHistoryView(true)
      console.log("✅ 20-day history loaded")
    } catch (error) {
      console.error("❌ Error loading 20-day history:", error)
      Alert.alert("Error", "Failed to load 20-day history")
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "High":
        return "#ff4444"
      case "Low":
        return "#ffbb33"
      default:
        return "#00C851"
    }
  }

  const getMetricStatus = (type, value) => {
    switch (type) {
      case "temperature":
        if (value > 37.2) return "High"
        if (value < 36.0) return "Low"
        return "Normal"
      case "heart_rate":
        if (value > 100 || value < 60) return "Irregular"
        return "Normal"
      default:
        return "Unknown"
    }
  }

  const formatMetricValue = (metric) => {
    if (!metric) return "No data"

    switch (metric.metric_type) {
      case "temperature":
        return `${metric.value}°C`
      case "heart_rate":
        return `${metric.value} bpm`
      default:
        return `${metric.value}`
    }
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

    Alert.alert("Contact Emergency Contact", `Call ${name} at ${phone}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: async () => {
          try {
            const cleanPhone = phone.replace(/[^\d+]/g, "")
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

  const prepareChartData = (metricType) => {
    const data = historicalData[metricType] || []
    if (data.length === 0) return null

    const chartData = data.slice(-10)

    return {
      labels: chartData.map((item) => moment(item.timestamp).format("MM/DD")),
      datasets: [
        {
          data: chartData.map((item) => item.value),
          color: (opacity = 1) =>
            metricType === "temperature" ? `rgba(255, 68, 68, ${opacity})` : `rgba(66, 133, 244, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    }
  }

  const prepare20DayChartData = (metricType) => {
    const data = historyData[metricType] || []
    if (data.length === 0) return null

    return {
      labels: data.map((item) => moment(item.timestamp).format("MM/DD")),
      datasets: [
        {
          data: data.map((item) => item.value),
          color: (opacity = 1) =>
            metricType === "temperature" ? `rgba(255, 68, 68, ${opacity})` : `rgba(66, 133, 244, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    }
  }

  const renderMetricCard = (metricKey, metric, title, icon, color) => {
    if (!metric) return null

    return (
      <View key={metricKey} style={[styles.metricCard, styles.elevatedCard]}>
        <View style={styles.metricHeader}>
          <MaterialIcons name={icon} size={20} color={color} />
          <Text style={styles.metricTitle}>{title}</Text>
        </View>
        <Text style={styles.metricValue}>{formatMetricValue(metric)}</Text>
        <View style={styles.statusContainer}>
          <Text
            style={[styles.metricStatus, { color: getStatusColor(getMetricStatus(metric.metric_type, metric.value)) }]}
          >
            {getMetricStatus(metric.metric_type, metric.value)}
          </Text>
        </View>
        <Text style={styles.deviceInfo}>Device: {metric.device_id}</Text>

        {metric.temp_valid !== undefined && (
          <Text style={styles.additionalInfo}>Valid: {metric.temp_valid ? "Yes" : "No"}</Text>
        )}
        {metric.temperature_fahrenheit !== undefined && (
          <Text style={styles.additionalInfo}>({metric.temperature_fahrenheit}°F)</Text>
        )}
        {metric.heart_rate_avg !== undefined && <Text style={styles.additionalInfo}>Avg: {metric.heart_rate_avg}</Text>}

        <Text style={styles.timeInfo}>{moment(metric.recorded_at).format("MMM DD, HH:mm")}</Text>
      </View>
    )
  }

  const clearCurrentReadings = async () => {
    Alert.alert("Clear Current Readings", "This will clear the current readings from Firebase. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            await healthMetricsService.clearCurrentReadings()
            setCurrentReadings({})
            setLastUpdate("")
            Alert.alert("Success", "Current readings cleared from Firebase.")
          } catch (error) {
            Alert.alert("Error", "Failed to clear data: " + error.message)
          }
        },
      },
    ])
  }

  const render20DayHistoryView = () => {
    if (!showHistoryView) return null

    return (
      <View style={styles.historyOverlay}>
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>20-Day Health History</Text>
            <TouchableOpacity onPress={() => setShowHistoryView(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.historyContent}>
            {prepare20DayChartData("temperature") && (
              <View style={styles.historyChartContainer}>
                <Text style={styles.historyChartTitle}>Temperature (20 Days)</Text>
                <Text style={styles.historyDataCount}>{historyData.temperature.length} measurements</Text>
                <LineChart
                  data={prepare20DayChartData("temperature")}
                  width={screenWidth - 80}
                  height={200}
                  chartConfig={{
                    backgroundColor: "#ffffff",
                    backgroundGradientFrom: "#f8f9fa",
                    backgroundGradientTo: "#f8f9fa",
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(255, 68, 68, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: { r: "3", strokeWidth: "1", stroke: "#ff4444" },
                  }}
                  bezier
                  style={styles.historyChart}
                />
              </View>
            )}

            {prepare20DayChartData("heart_rate") && (
              <View style={styles.historyChartContainer}>
                <Text style={styles.historyChartTitle}>Heart Rate (20 Days)</Text>
                <Text style={styles.historyDataCount}>{historyData.heart_rate.length} measurements</Text>
                <LineChart
                  data={prepare20DayChartData("heart_rate")}
                  width={screenWidth - 80}
                  height={200}
                  chartConfig={{
                    backgroundColor: "#ffffff",
                    backgroundGradientFrom: "#f8f9fa",
                    backgroundGradientTo: "#f8f9fa",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(66, 133, 244, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: { r: "3", strokeWidth: "1", stroke: "#4285f4" },
                  }}
                  bezier
                  style={styles.historyChart}
                />
              </View>
            )}

            {historyData.temperature.length === 0 && historyData.heart_rate.length === 0 && (
              <View style={styles.noHistoryData}>
                <MaterialIcons name="timeline" size={40} color="#6c757d" />
                <Text style={styles.noHistoryText}>No historical data available yet</Text>
                <Text style={styles.noHistorySubText}>
                  Data will be automatically stored as your device sends new readings
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="favorite" size={50} color="#4285f4" />
        <Text style={styles.loadingText}>Loading current readings from Firebase...</Text>
        <Text style={styles.loadingSubText}>Reading heart_rate_bpm and temperature_celsius</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={50} color="#ff4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCurrentReadings}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Current Health Readings</Text>
        {lastUpdate && <Text style={styles.lastUpdate}>Last updated: {lastUpdate}</Text>}
        <Text style={styles.dataSource}>📡 Data source: Firebase Realtime Database → current_readings</Text>
        <Text style={styles.dataNote}>🔄 Reading: heart_rate_bpm & temperature_celsius</Text>
      </View>

      {Object.keys(currentReadings).length > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={clearCurrentReadings}>
          <MaterialIcons name="clear" size={20} color="#fff" />
          <Text style={styles.clearButtonText}>Clear Current Readings</Text>
        </TouchableOpacity>
      )}

      <View style={styles.currentMetrics}>
        {renderMetricCard("temperature", currentReadings.temperature, "Temperature", "device-thermostat", "#ff4444")}
        {renderMetricCard("heart_rate", currentReadings.heart_rate, "Heart Rate", "monitor-heart", "#ff4444")}

        {Object.keys(currentReadings).length === 0 && (
          <View style={styles.noDataCard}>
            <MaterialIcons name="info-outline" size={40} color="#4285f4" />
            <Text style={styles.noDataTitle}>No Current Readings Available</Text>
            <Text style={styles.noDataText}>
              📡 Reading from Firebase Realtime Database
              {"\n"}🔗 Database: patient-health-app-a48bc-default-rtdb.firebaseio.com
              {"\n"}📍 Path: /current_readings
              {"\n\n"}Looking for these specific fields:
              {"\n"}• heart_rate_bpm: [your heart rate value]
              {"\n"}• temperature_celsius: [your temperature value]
              {"\n\n"}Current data structure detected:
              {"\n"}• heart_rate_avg: 0{"\n"}• heart_rate_bpm: 4.82393
              {"\n"}• temp_valid: true
              {"\n"}• temperature_celsius: 29.5625
              {"\n"}• temperature_fahrenheit: 85.21249
              {"\n"}• timestamp: 273056
              {"\n"}• wifi_rssi: -48
              {"\n\n"}🔄 The app will automatically update when new data is available.
              {"\n"}Pull down to refresh manually.
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.historyButton} onPress={load20DayHistory}>
        <MaterialIcons name="timeline" size={20} color="#fff" />
        <Text style={styles.historyButtonText}>View 20-Day History</Text>
      </TouchableOpacity>

      {prepareChartData("temperature") && (
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>Temperature History (Stored Data)</Text>
            <Text style={styles.dataCount}>{historicalData.temperature.length} measurements</Text>
          </View>
          <LineChart
            data={prepareChartData("temperature")}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#f8f9fa",
              backgroundGradientTo: "#f8f9fa",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(255, 68, 68, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#ff4444" },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {prepareChartData("heart_rate") && (
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>Heart Rate History (Stored Data)</Text>
            <Text style={styles.dataCount}>{historicalData.heart_rate.length} measurements</Text>
          </View>
          <LineChart
            data={prepareChartData("heart_rate")}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#f8f9fa",
              backgroundGradientTo: "#f8f9fa",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(66, 133, 244, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#4285f4" },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {!prepareChartData("temperature") && !prepareChartData("heart_rate") && (
        <View style={styles.noChartsContainer}>
          <MaterialIcons name="show-chart" size={40} color="#6c757d" />
          <Text style={styles.noChartsTitle}>No Chart Data Available</Text>
          <Text style={styles.noChartsText}>
            Charts will appear automatically as your device sends readings and data is stored in the database.
          </Text>
        </View>
      )}

      {render20DayHistoryView()}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f8f9fa",
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6c757d",
  },
  loadingSubText: {
    marginTop: 5,
    fontSize: 12,
    color: "#28a745",
    fontStyle: "italic",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#4285f4",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  headerContainer: {
    marginBottom: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  lastUpdate: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
  },
  dataSource: {
    fontSize: 10,
    color: "#4285f4",
    marginTop: 2,
    fontStyle: "italic",
  },
  dataNote: {
    fontSize: 10,
    color: "#28a745",
    marginTop: 2,
    fontStyle: "italic",
    fontWeight: "bold",
  },
  clearButton: {
    backgroundColor: "#dc3545",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  clearButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },
  currentMetrics: {
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  elevatedCard: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  metricTitle: {
    fontSize: 16,
    color: "#495057",
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  metricStatus: {
    fontSize: 14,
    fontWeight: "600",
  },
  deviceInfo: {
    fontSize: 12,
    color: "#6c757d",
    fontStyle: "italic",
  },
  additionalInfo: {
    fontSize: 11,
    color: "#28a745",
    fontStyle: "italic",
  },
  timeInfo: {
    fontSize: 11,
    color: "#adb5bd",
    marginTop: 2,
  },
  noDataCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 10,
    marginBottom: 10,
  },
  noDataText: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "left",
    lineHeight: 18,
    fontFamily: "monospace",
  },
  chartContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212529",
  },
  viewAll: {
    color: "#4285f4",
    fontSize: 14,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    paddingRight: 20,
  },
  emergencyButton: {
    backgroundColor: "#ff4444",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  emergencyButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 10,
  },
  infoContainer: {
    backgroundColor: "#e3f2fd",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#4285f4",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1976d2",
    marginBottom: 5,
  },
  infoText: {
    fontSize: 12,
    color: "#1976d2",
    lineHeight: 18,
  },
  historyButton: {
    backgroundColor: "#28a745",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  historyButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },
  dataCount: {
    fontSize: 12,
    color: "#6c757d",
    fontStyle: "italic",
  },
  noChartsContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  noChartsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 10,
    marginBottom: 5,
  },
  noChartsText: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
    lineHeight: 18,
  },
  historyOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  historyContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    margin: 20,
    maxHeight: "80%",
    width: "90%",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  historyContent: {
    padding: 20,
  },
  historyChartContainer: {
    marginBottom: 30,
  },
  historyChartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  historyDataCount: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 10,
  },
  historyChart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noHistoryData: {
    alignItems: "center",
    padding: 40,
  },
  noHistoryText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 10,
    marginBottom: 5,
  },
  noHistorySubText: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
  },
})
