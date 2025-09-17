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
import llmPredictionService from "../services/llmPredictionService"
import healthMetricsService from "../services/healthMetricsService"
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
  const [last20Measurements, setLast20Measurements] = useState([])

  useEffect(() => {
    initializeTheme()
    loadAnalysis()
    loadLast20Measurements()
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

      console.log("🤖 Loading LLM-powered health analysis...")

      const temperatureData = await healthMetricsService.getMetrics({
        metric_type: "temperature",
        limit: 30,
      })
      const heartRateData = await healthMetricsService.getMetrics({
        metric_type: "heart_rate",
        limit: 30,
      })

      const llmAnalysis = await llmPredictionService.generateEnhancedHealthAnalysis(
        temperatureData,
        heartRateData,
        { age: 30, gender: "unknown" }, // You can get this from user profile
      )

      setAnalysis(llmAnalysis)
      console.log("✅ LLM analysis loaded successfully")
    } catch (error) {
      console.error("Error loading LLM analysis:", error)
      setError("Failed to generate AI health predictions. Please check your internet connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadAnalysis()
    await loadLast20Measurements()
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
    if (metricType === "temperature" && trend === "increasing") {
      return colors.error
    }

    if (metricType === "temperature" && trend === "decreasing") {
      return colors.success
    }

    if (metricType === "heart_rate") {
      if (trend === "stable") return colors.success
      return colors.warning
    }

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
          data: forecast.map((item) => item.value || item.temperature || item.heart_rate),
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
      <View
        style={[styles.historicalOverlay, { backgroundColor: colors.overlay }]}
        onPress={() => setShowHistoricalData(false)}
      >
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
        {analysis.llm_powered && metricData.trend_interpretation && (
          <View style={[styles.llmInsightCard, { backgroundColor: colors.card }]}>
            <View style={styles.llmInsightHeader}>
              <MaterialIcons name="psychology" size={20} color={colors.primary} />
              <Text style={[styles.llmInsightTitle, { color: colors.text }]}>AI Insight</Text>
            </View>
            <Text style={[styles.llmInsightText, { color: colors.text }]}>{metricData.trend_interpretation}</Text>
          </View>
        )}

        <View style={styles.metricOverview}>
          <View style={[styles.metricInfoCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.metricInfoLabel, { color: colors.textSecondary }]}>Status</Text>
            <View style={styles.trendContainer}>
              <MaterialIcons
                name={getTrendIcon(metricData.trend || metricData.status)}
                size={24}
                color={getTrendColor(metricData.trend || metricData.status, activeTab)}
              />
              <Text
                style={[styles.trendText, { color: getTrendColor(metricData.trend || metricData.status, activeTab) }]}
              >
                {metricData.status || formatTrendText(metricData.trend, activeTab)}
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

        <TouchableOpacity
          style={[styles.viewHistoryButton, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => loadHistoricalMetricsForType(activeTab)}
        >
          <MaterialIcons name="history" size={20} color={colors.primary} />
          <Text style={[styles.viewHistoryButtonText, { color: colors.primary }]}>View 30-Day History</Text>
        </TouchableOpacity>

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

        <View style={[styles.recommendationsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommendations</Text>
          {metricData.recommendations &&
            metricData.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <MaterialIcons name="check-circle" size={18} color={colors.primary} />
                <Text style={[styles.recommendationText, { color: colors.text }]}>{rec}</Text>
              </View>
            ))}

          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <>
              <Text style={[styles.generalRecsTitle, { color: colors.text }]}>General Health Recommendations:</Text>
              {analysis.recommendations.map((rec, index) => (
                <View key={`general-${index}`} style={styles.recommendationItem}>
                  <MaterialIcons name="lightbulb-outline" size={18} color={colors.warning} />
                  <Text style={[styles.recommendationText, { color: colors.text }]}>{rec}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {analysis.llm_powered && analysis.when_to_seek_care && (
          <View style={[styles.seekCareCard, { backgroundColor: colors.card, borderColor: colors.warning }]}>
            <View style={styles.seekCareHeader}>
              <MaterialIcons name="local-hospital" size={20} color={colors.warning} />
              <Text style={[styles.seekCareTitle, { color: colors.warning }]}>When to Seek Care</Text>
            </View>
            <Text style={[styles.seekCareText, { color: colors.text }]}>{analysis.when_to_seek_care}</Text>
          </View>
        )}
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

  const loadLast20Measurements = async () => {
    try {
      console.log("📊 Loading last 20 measurements from realtime database...")
      const temperatureData = await healthMetricsService.getMetrics({
        metric_type: "temperature",
        limit: 20,
      })
      const heartRateData = await healthMetricsService.getMetrics({
        metric_type: "heart_rate",
        limit: 20,
      })

      const allMeasurements = [...temperatureData, ...heartRateData]
        .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
        .slice(0, 20)

      setLast20Measurements(allMeasurements)
      console.log("✅ Loaded", allMeasurements.length, "recent measurements")
    } catch (error) {
      console.error("❌ Error loading last 20 measurements:", error)
    }
  }

  const renderLast20Measurements = () => {
    const colors = themeService.getColors(currentTheme)

    if (last20Measurements.length === 0) {
      return (
        <View style={[styles.measurementsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.measurementsTitle, { color: colors.text }]}>Recent Measurements</Text>
          <Text style={[styles.noDataText, { color: colors.textSecondary }]}>No recent measurements available</Text>
        </View>
      )
    }

    return (
      <View style={[styles.measurementsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.measurementsTitle, { color: colors.text }]}>Last 20 Measurements</Text>
        <ScrollView style={styles.measurementsList} showsVerticalScrollIndicator={false}>
          {last20Measurements.map((measurement, index) => (
            <View
              key={`${measurement.id}-${index}`}
              style={[styles.measurementItem, { borderBottomColor: colors.border }]}
            >
              <View style={styles.measurementHeader}>
                <MaterialIcons
                  name={measurement.metric_type === "temperature" ? "device-thermostat" : "monitor-heart"}
                  size={16}
                  color={measurement.metric_type === "temperature" ? "#ff4444" : "#4285f4"}
                />
                <Text style={[styles.measurementType, { color: colors.text }]}>
                  {measurement.metric_type === "temperature" ? "Temperature" : "Heart Rate"}
                </Text>
                <Text style={[styles.measurementTime, { color: colors.textSecondary }]}>
                  {moment(measurement.recorded_at).format("MMM D, HH:mm")}
                </Text>
              </View>
              <Text style={[styles.measurementValue, { color: colors.text }]}>
                {measurement.value}
                {measurement.metric_type === "temperature" ? "°C" : " bpm"}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    )
  }

  const colors = themeService.getColors(currentTheme)
  const styles = createStyles(colors)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Generating AI-powered health analysis...
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[styles.header, { color: colors.text }]}>AI Health Analysis</Text>

      {analysis && analysis.generated_at && (
        <Text style={styles.lastUpdated}>
          Last updated: {moment(analysis.generated_at).format("MMM D, YYYY h:mm A")}
          <Text style={[styles.llmBadge, { color: colors.primary }]}> • AI Enhanced</Text>
        </Text>
      )}

      {renderLast20Measurements()}

      {renderOverallHealth()}

      <View style={styles.tabsContainer}>
        {renderMetricTab("temperature", "Temperature", "device-thermostat")}
        {renderMetricTab("heart_rate", "Heart Rate", "monitor-heart")}
      </View>

      {renderMetricAnalysis()}

      {renderHistoricalDataView()}

      <View style={styles.disclaimer}>
        <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
          This analysis is powered by AI and should not replace professional medical advice.
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
    measurementsCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    measurementsTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 12,
    },
    measurementsList: {
      maxHeight: 300,
    },
    measurementItem: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      marginBottom: 8,
    },
    measurementHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    measurementType: {
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 8,
      flex: 1,
    },
    measurementTime: {
      fontSize: 12,
    },
    measurementValue: {
      fontSize: 16,
      fontWeight: "bold",
      marginLeft: 24,
    },
    llmInsightCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 15,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    llmInsightHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    llmInsightTitle: {
      fontSize: 16,
      fontWeight: "bold",
      marginLeft: 8,
    },
    llmInsightText: {
      fontSize: 14,
      lineHeight: 20,
    },
    generalRecsTitle: {
      fontSize: 14,
      fontWeight: "bold",
      marginTop: 15,
      marginBottom: 10,
    },
    seekCareCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 15,
      borderWidth: 1,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    seekCareHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    seekCareTitle: {
      fontSize: 16,
      fontWeight: "bold",
      marginLeft: 8,
    },
    seekCareText: {
      fontSize: 14,
      lineHeight: 20,
    },
    llmBadge: {
      fontSize: 12,
      fontWeight: "bold",
    },
  })
