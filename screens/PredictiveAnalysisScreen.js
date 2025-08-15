"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LineChart } from "react-native-chart-kit"
import moment from "moment"
import aiPredictionService from "../services/aiPredictionService"
import themeService from "../services/themeService"

const screenWidth = Dimensions.get("window").width

export default function PredictiveAnalysisScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("temperature")
  const [showHistoricalData, setShowHistoricalData] = useState(false)
  const [historicalMetrics, setHistoricalMetrics] = useState([])
  const [selectedMetricType, setSelectedMetricType] = useState("temperature")
  const [currentTheme, setCurrentTheme] = useState("light")

  useEffect(() => {
    initializeTheme()
    loadAnalysis()
  }, [])

  const initializeTheme = async () => {
    const theme = await themeService.loadTheme()
    setCurrentTheme(theme)

    const unsubscribe = themeService.subscribe((newTheme) => {
      setCurrentTheme(newTheme)
    })

    return unsubscribe
  }

  const loadAnalysis = async () => {
    try {
      setLoading(true)
      setError(null)

      // Generate comprehensive health analysis
      const healthAnalysis = await aiPredictionService.generateHealthAnalysis()
      setAnalysis(healthAnalysis)

      console.log("Analysis loaded successfully")
    } catch (error) {
      console.error("Error loading analysis:", error)
      setError("Failed to generate health predictions. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadAnalysis()
    setRefreshing(false)
  }

  const getStatusColor = (status) => {
    const colors = themeService.getColors(currentTheme)
    switch (status) {
      case "high":
        return colors.error
      case "medium":
        return colors.warning
      case "low":
        return colors.success
      default:
        return colors.textSecondary
    }
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "increasing":
        return "trending-up"
      case "decreasing":
        return "trending-down"
      case "stable":
        return "trending-flat"
      default:
        return "help-outline"
    }
  }

  const getTrendColor = (trend, metricType) => {
    const colors = themeService.getColors(currentTheme)
    // For temperature, increasing is bad
    if (metricType === "temperature" && trend === "increasing") {
      return colors.error
    }

    // For temperature, decreasing can be good
    if (metricType === "temperature" && trend === "decreasing") {
      return colors.success
    }

    // For heart rate, both extremes can be bad
    if (metricType === "heart_rate") {
      if (trend === "stable") return colors.success
      return colors.warning
    }

    // Default colors
    switch (trend) {
      case "increasing":
        return colors.warning
      case "decreasing":
        return colors.warning
      case "stable":
        return colors.success
      default:
        return colors.textSecondary
    }
  }

  const formatTrendText = (trend, metricType) => {
    if (trend === "insufficient_data") {
      return "Insufficient data for trend analysis"
    }

    switch (metricType) {
      case "temperature":
        if (trend === "increasing") return "Your temperature is trending upward"
        if (trend === "decreasing") return "Your temperature is trending downward"
        return "Your temperature is stable"

      case "heart_rate":
        if (trend === "increasing") return "Your heart rate is trending upward"
        if (trend === "decreasing") return "Your heart rate is trending downward"
        return "Your heart rate is stable"

      default:
        return "Trend unknown"
    }
  }

  const prepareChartData = (metricType) => {
    if (!analysis || !analysis[metricType] || !analysis[metricType].forecast) {
      return null
    }

    const forecast = analysis[metricType].forecast
    const colors = themeService.getColors(currentTheme)

    return {
      labels: forecast.map((item) => `Day ${item.day}`),
      datasets: [
        {
          data: forecast.map((item) => item.value),
          color: (opacity = 1) => `rgba(67, 133, 244, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    }
  }

  const renderMetricTab = (metricType, label, icon) => {
    const isActive = activeTab === metricType
    const colors = themeService.getColors(currentTheme)

    return (
      <TouchableOpacity style={[styles.tab, isActive && styles.activeTab]} onPress={() => setActiveTab(metricType)}>
        <MaterialIcons name={icon} size={20} color={isActive ? colors.primary : colors.textSecondary} />
        <Text style={[styles.tabText, isActive && styles.activeTabText]}>{label}</Text>
      </TouchableOpacity>
    )
  }

  const loadHistoricalMetricsForType = async (metricType) => {
    try {
      setSelectedMetricType(metricType)
      const metrics = await aiPredictionService.fetchHistoricalData(metricType, 30)
      setHistoricalMetrics(metrics)
      setShowHistoricalData(true)
    } catch (error) {
      console.error("Error loading historical data:", error)
      Alert.alert("Error", "Failed to load historical data")
    }
  }

  const renderHistoricalDataView = () => {
    if (!showHistoricalData) return null

    const colors = themeService.getColors(currentTheme)

    return (
      <View style={[styles.historicalOverlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.historicalModal, { backgroundColor: colors.card }]}>
          <View style={[styles.historicalModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.historicalModalTitle, { color: colors.text }]}>
              {selectedMetricType === "temperature" ? "Temperature" : "Heart Rate"} History (30 Days)
            </Text>
            <TouchableOpacity onPress={() => setShowHistoricalData(false)}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.historicalModalContent}>
            {historicalMetrics.map((metric, index) => (
              <View key={metric.id || index} style={[styles.historicalDataItem, { borderBottomColor: colors.border }]}>
                <View style={styles.historicalDataInfo}>
                  <Text style={[styles.historicalDataDate, { color: colors.text }]}>
                    {moment(metric.recorded_at).format("MMM DD, YYYY")}
                  </Text>
                  <Text style={[styles.historicalDataTime, { color: colors.textSecondary }]}>
                    {moment(metric.recorded_at).format("h:mm A")}
                  </Text>
                </View>
                <Text style={[styles.historicalDataValue, { color: colors.primary }]}>
                  {selectedMetricType === "temperature" ? `${metric.value}°C` : `${metric.value} bpm`}
                </Text>
              </View>
            ))}
            {historicalMetrics.length === 0 && (
              <Text style={[styles.noHistoricalData, { color: colors.textSecondary }]}>
                No historical data available
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    )
  }

  const renderMetricAnalysis = () => {
    const colors = themeService.getColors(currentTheme)

    if (!analysis || !analysis[activeTab]) {
      return (
        <View style={styles.noDataContainer}>
          <MaterialIcons name="error-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.noDataText, { color: colors.textSecondary }]}>No data available for this metric</Text>
        </View>
      )
    }

    const metricData = analysis[activeTab]
    const chartData = prepareChartData(activeTab)

    return (
      <View>
        {/* Trend and Risk Section */}
        <View style={styles.metricOverview}>
          <View style={[styles.metricInfoCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.metricInfoLabel, { color: colors.textSecondary }]}>Trend</Text>
            <View style={styles.trendContainer}>
              <MaterialIcons
                name={getTrendIcon(metricData.trend)}
                size={24}
                color={getTrendColor(metricData.trend, activeTab)}
              />
              <Text style={[styles.trendText, { color: getTrendColor(metricData.trend, activeTab) }]}>
                {formatTrendText(metricData.trend, activeTab)}
              </Text>
            </View>
          </View>

          <View style={[styles.metricInfoCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.metricInfoLabel, { color: colors.textSecondary }]}>Risk Level</Text>
            <View style={[styles.riskBadge, { backgroundColor: getStatusColor(metricData.risk_level) }]}>
              <Text style={styles.riskText}>{metricData.risk_level.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Statistics Section */}
        {metricData.statistics && (
          <View style={[styles.statisticsCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Statistics</Text>
            <View style={styles.statisticsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {activeTab === "temperature"
                    ? metricData.statistics.mean.toFixed(1)
                    : Math.round(metricData.statistics.mean)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Average</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {activeTab === "temperature"
                    ? metricData.statistics.min.toFixed(1)
                    : Math.round(metricData.statistics.min)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Min</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {activeTab === "temperature"
                    ? metricData.statistics.max.toFixed(1)
                    : Math.round(metricData.statistics.max)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Max</Text>
              </View>
            </View>
          </View>
        )}

        {/* View Historical Data Button */}
        <TouchableOpacity
          style={[styles.viewHistoryButton, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => loadHistoricalMetricsForType(activeTab)}
        >
          <MaterialIcons name="history" size={20} color={colors.primary} />
          <Text style={[styles.viewHistoryButtonText, { color: colors.primary }]}>View 30-Day History</Text>
        </TouchableOpacity>

        {/* Forecast Chart */}
        {chartData && (
          <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>7-Day Forecast</Text>
            <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
              {activeTab === "temperature" ? "Temperature (°C)" : "Heart Rate (bpm)"}
            </Text>

            <LineChart
              data={chartData}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: colors.card,
                backgroundGradientFrom: colors.card,
                backgroundGradientTo: colors.card,
                decimalPlaces: activeTab === "temperature" ? 1 : 0,
                color: (opacity = 1) => `rgba(67, 133, 244, ${opacity})`,
                labelColor: (opacity = 1) => colors.text,
                style: { borderRadius: 16 },
                propsForDots: { r: "4", strokeWidth: "2", stroke: "#ffa726" },
              }}
              bezier
              style={styles.chart}
            />

            <View style={styles.confidenceContainer}>
              <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.confidenceText, { color: colors.textSecondary }]}>
                Prediction confidence: {Math.round(metricData.confidence_score * 100)}%
              </Text>
            </View>
          </View>
        )}

        {/* Recommendations */}
        <View style={[styles.recommendationsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommendations</Text>
          {metricData.recommendations &&
            metricData.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <MaterialIcons name="check-circle" size={18} color={colors.primary} />
                <Text style={[styles.recommendationText, { color: colors.text }]}>{rec}</Text>
              </View>
            ))}
        </View>
      </View>
    )
  }

  const renderOverallHealth = () => {
    if (!analysis || !analysis.overall_health) return null

    const { score, status, summary } = analysis.overall_health
    const colors = themeService.getColors(currentTheme)

    let statusColor
    switch (status) {
      case "excellent":
        statusColor = colors.success
        break
      case "good":
        statusColor = colors.info
        break
      case "fair":
        statusColor = colors.warning
        break
      case "concerning":
        statusColor = colors.error
        break
      default:
        statusColor = colors.textSecondary
    }

    return (
      <View style={[styles.overallHealthCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.overallHealthTitle, { color: colors.text }]}>Overall Health Assessment</Text>

        {score !== null ? (
          <View style={styles.scoreContainer}>
            <View style={[styles.scoreCircle, { borderColor: statusColor }]}>
              <Text style={[styles.scoreText, { color: statusColor }]}>{score}</Text>
            </View>
            <View style={styles.statusContainer}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{summary}</Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.noScoreText, { color: colors.textSecondary }]}>
            Insufficient data to calculate overall health score
          </Text>
        )}
      </View>
    )
  }

  const colors = themeService.getColors(currentTheme)
  const styles = createStyles(colors)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Analyzing your health data...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={50} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAnalysis}>
          <Text style={styles.retryButtonText}>Retry Analysis</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.header}>Predictive Health Analysis</Text>

      {analysis && analysis.generated_at && (
        <Text style={styles.lastUpdated}>
          Last updated: {moment(analysis.generated_at).format("MMM D, YYYY h:mm A")}
        </Text>
      )}

      {renderOverallHealth()}

      <View style={styles.tabsContainer}>
        {renderMetricTab("temperature", "Temperature", "device-thermostat")}
        {renderMetricTab("heart_rate", "Heart Rate", "monitor-heart")}
      </View>

      {renderMetricAnalysis()}

      {/* Historical Data Modal */}
      {renderHistoricalDataView()}

      <View style={styles.disclaimer}>
        <MaterialIcons name="info-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.disclaimerText}>
          These predictions are based on your historical health data and are for informational purposes only. Always
          consult with your healthcare provider before making health decisions.
        </Text>
      </View>

      <View style={styles.aiPowered}>
        <Text style={styles.aiPoweredText}>
          <MaterialIcons name="auto-awesome" size={14} color={colors.primary} /> Powered by AI Health Analysis
        </Text>
      </View>
    </ScrollView>
  )
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
      padding: 20,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
      padding: 20,
    },
    errorText: {
      marginTop: 10,
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryButtonText: {
      color: "#fff",
      fontWeight: "bold",
    },
    header: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 5,
    },
    lastUpdated: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    overallHealthCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    overallHealthTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 15,
    },
    scoreContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    scoreCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 3,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 15,
    },
    scoreText: {
      fontSize: 24,
      fontWeight: "bold",
    },
    statusContainer: {
      flex: 1,
    },
    statusText: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 5,
    },
    summaryText: {
      fontSize: 14,
      lineHeight: 20,
    },
    noScoreText: {
      fontSize: 14,
      fontStyle: "italic",
    },
    tabsContainer: {
      flexDirection: "row",
      marginBottom: 15,
      backgroundColor: colors.card,
      borderRadius: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    activeTabText: {
      color: colors.primary,
      fontWeight: "bold",
    },
    noDataContainer: {
      padding: 30,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 20,
    },
    noDataText: {
      marginTop: 10,
      fontSize: 16,
      textAlign: "center",
    },
    metricOverview: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 15,
    },
    metricInfoCard: {
      flex: 1,
      borderRadius: 12,
      padding: 15,
      marginHorizontal: 5,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    metricInfoLabel: {
      fontSize: 14,
      marginBottom: 8,
    },
    trendContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    trendText: {
      fontSize: 14,
      fontWeight: "500",
      marginLeft: 5,
    },
    riskBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      alignSelf: "flex-start",
    },
    riskText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: 14,
    },
    statisticsCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 15,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 12,
    },
    statisticsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    statItem: {
      alignItems: "center",
    },
    statValue: {
      fontSize: 18,
      fontWeight: "bold",
    },
    statLabel: {
      fontSize: 12,
      marginTop: 4,
    },
    chartCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 15,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    chartSubtitle: {
      fontSize: 12,
      marginBottom: 10,
    },
    chart: {
      marginVertical: 8,
      borderRadius: 16,
    },
    confidenceContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 5,
    },
    confidenceText: {
      fontSize: 12,
      marginLeft: 5,
    },
    recommendationsCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 15,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    recommendationItem: {
      flexDirection: "row",
      marginBottom: 10,
      alignItems: "flex-start",
    },
    recommendationText: {
      fontSize: 14,
      marginLeft: 10,
      flex: 1,
      lineHeight: 20,
    },
    disclaimer: {
      flexDirection: "row",
      backgroundColor: colors.disabled,
      borderRadius: 12,
      padding: 16,
      marginBottom: 15,
      alignItems: "flex-start",
    },
    disclaimerText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 10,
      flex: 1,
      lineHeight: 18,
    },
    aiPowered: {
      alignItems: "center",
      marginBottom: 20,
    },
    aiPoweredText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    viewHistoryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      borderRadius: 8,
      marginBottom: 15,
      borderWidth: 1,
    },
    viewHistoryButtonText: {
      fontSize: 14,
      fontWeight: "500",
      marginLeft: 8,
    },
    historicalOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    historicalModal: {
      borderRadius: 12,
      margin: 20,
      maxHeight: "80%",
      width: "90%",
    },
    historicalModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
    },
    historicalModalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      flex: 1,
    },
    historicalModalContent: {
      maxHeight: 400,
      padding: 20,
    },
    historicalDataItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    historicalDataInfo: {
      flex: 1,
    },
    historicalDataDate: {
      fontSize: 14,
      fontWeight: "500",
    },
    historicalDataTime: {
      fontSize: 12,
      marginTop: 2,
    },
    historicalDataValue: {
      fontSize: 16,
      fontWeight: "600",
    },
    noHistoricalData: {
      textAlign: "center",
      fontSize: 16,
      marginTop: 20,
    },
  })
