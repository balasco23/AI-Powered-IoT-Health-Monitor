import { collection, query, where, orderBy, getDocs, doc, setDoc, serverTimestamp } from "firebase/firestore"
import { db, auth } from "../config/firebase"

class AIPredictionService {
  constructor() {
    this.currentUser = null

    auth.onAuthStateChanged((user) => {
      this.currentUser = user
    })
  }

  // Get user's metrics collection reference
  getUserMetricsRef() {
    if (!this.currentUser) {
      throw new Error("User not authenticated")
    }
    return collection(db, "users", this.currentUser.uid, "metrics")
  }

  // Fetch historical data for analysis and prediction
  async fetchHistoricalData(metricType, days = 30) {
    try {
      const metricsRef = this.getUserMetricsRef()

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Create query
      const q = query(
        metricsRef,
        where("metric_type", "==", metricType),
        where("recorded_at", ">=", startDate),
        where("recorded_at", "<=", endDate),
        orderBy("recorded_at", "asc"),
      )

      const querySnapshot = await getDocs(q)
      const metrics = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        metrics.push({
          id: doc.id,
          ...data,
          recorded_at: data.recorded_at?.toDate(),
          value: data.value,
        })
      })

      return metrics
    } catch (error) {
      console.error(`Error fetching historical ${metricType} data:`, error)
      throw error
    }
  }

  // Calculate mean (average) of an array of numbers
  calculateMean(values) {
    if (!values || values.length === 0) return 0
    const sum = values.reduce((acc, val) => acc + val, 0)
    return sum / values.length
  }

  // Calculate median of an array of numbers
  calculateMedian(values) {
    if (!values || values.length === 0) return 0

    const sorted = [...values].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)

    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2
    }

    return sorted[middle]
  }

  // Calculate standard deviation of an array of numbers
  calculateStandardDeviation(values) {
    if (!values || values.length <= 1) return 0

    const mean = this.calculateMean(values)
    const squaredDifferences = values.map((value) => Math.pow(value - mean, 2))
    const variance = this.calculateMean(squaredDifferences)

    return Math.sqrt(variance)
  }

  // Calculate min value in an array
  calculateMin(values) {
    if (!values || values.length === 0) return 0
    return Math.min(...values)
  }

  // Calculate max value in an array
  calculateMax(values) {
    if (!values || values.length === 0) return 0
    return Math.max(...values)
  }

  // Analyze trends in historical data
  analyzeMetricTrend(metrics, metricType) {
    try {
      if (metrics.length < 5) {
        return "insufficient_data"
      }

      // Sort by date
      metrics.sort((a, b) => a.recorded_at - b.recorded_at)

      // Split data into two halves to compare trends
      const midpoint = Math.floor(metrics.length / 2)
      const olderHalf = metrics.slice(0, midpoint)
      const recentHalf = metrics.slice(midpoint)

      const olderAvg = olderHalf.reduce((sum, m) => sum + m.value, 0) / olderHalf.length
      const recentAvg = recentHalf.reduce((sum, m) => sum + m.value, 0) / recentHalf.length

      // Calculate percent change
      const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100

      // Determine trend
      if (Math.abs(percentChange) < 3) {
        return "stable"
      } else if (percentChange > 0) {
        return "increasing"
      } else {
        return "decreasing"
      }
    } catch (error) {
      console.error(`Error analyzing ${metricType} trend:`, error)
      return "unknown"
    }
  }

  // Calculate statistical metrics
  calculateStatistics(metrics, metricType) {
    try {
      if (metrics.length === 0) {
        return null
      }

      const values = metrics.map((m) => m.value)

      return {
        mean: this.calculateMean(values),
        median: this.calculateMedian(values),
        std: this.calculateStandardDeviation(values),
        min: this.calculateMin(values),
        max: this.calculateMax(values),
      }
    } catch (error) {
      console.error(`Error calculating ${metricType} statistics:`, error)
      return null
    }
  }

  // Generate predictions using statistical methods
  async generatePredictions(metricType, days = 7) {
    try {
      // Fetch historical data
      const historicalData = await this.fetchHistoricalData(metricType)

      if (historicalData.length < 5) {
        console.warn(`Not enough ${metricType} data for reliable predictions`)
        return this.generateFallbackPredictions(metricType, days)
      }

      // Sort by date
      historicalData.sort((a, b) => a.recorded_at - b.recorded_at)

      // Calculate statistics for prediction
      const stats = this.calculateStatistics(historicalData, metricType)

      // Analyze trend
      const trend = this.analyzeMetricTrend(historicalData, metricType)

      // Calculate trend factor (how much to adjust predictions based on trend)
      let trendFactor = 0
      if (trend === "increasing") trendFactor = 0.01
      else if (trend === "decreasing") trendFactor = -0.01

      // Generate predictions
      const predictions = []
      const lastDate = historicalData[historicalData.length - 1].recorded_at

      for (let i = 1; i <= days; i++) {
        const date = new Date(lastDate)
        date.setDate(date.getDate() + i)

        // Calculate predicted value with trend adjustment
        const dayFactor = i * trendFactor
        let predictedValue =
          stats.mean * (1 + dayFactor) + Math.random() * stats.std * 0.5 * (Math.random() > 0.5 ? 1 : -1)

        // Format temperature to 1 decimal place
        if (metricType === "temperature") {
          predictedValue = Number.parseFloat(predictedValue.toFixed(1))
          // Ensure temperature is within reasonable range
          predictedValue = Math.max(35.5, Math.min(38.0, predictedValue))
        } else {
          predictedValue = Math.round(predictedValue)
          // Ensure heart rate is within reasonable range
          if (metricType === "heart_rate") {
            predictedValue = Math.max(50, Math.min(120, predictedValue))
          }
        }

        predictions.push({
          day: i,
          date: date,
          value: predictedValue,
        })
      }

      return predictions
    } catch (error) {
      console.error(`Error generating ${metricType} predictions:`, error)
      return this.generateFallbackPredictions(metricType, days)
    }
  }

  // Generate fallback predictions when there's insufficient data
  generateFallbackPredictions(metricType, days = 7) {
    console.log(`Using fallback predictions for ${metricType}`)

    // Get baseline values
    let baselineValues

    switch (metricType) {
      case "temperature":
        baselineValues = 36.6
        break
      case "heart_rate":
        baselineValues = 72
        break
      default:
        baselineValues = 0
    }

    // Generate predictions with small random variations
    const predictions = []

    for (let i = 1; i <= days; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)

      if (metricType === "temperature") {
        predictions.push({
          day: i,
          date: date,
          value: Number.parseFloat(
            Math.max(35.5, Math.min(38.0, baselineValues + (Math.random() * 0.6 - 0.3))).toFixed(1),
          ),
        })
      } else {
        predictions.push({
          day: i,
          date: date,
          value: Math.max(50, Math.min(120, baselineValues + (Math.random() * 10 - 5))),
        })
      }
    }

    return predictions
  }

  // Assess health risk based on metrics
  assessRisk(metrics, metricType) {
    try {
      if (metrics.length === 0) {
        return "unknown"
      }

      // Get the most recent metrics
      const recentMetrics = [...metrics].sort((a, b) => b.recorded_at - a.recorded_at).slice(0, 5)

      if (metricType === "temperature") {
        const avgTemp = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length

        if (avgTemp >= 38.0) {
          return "high"
        } else if (avgTemp >= 37.5 || avgTemp < 36.0) {
          return "medium"
        } else {
          return "low"
        }
      } else if (metricType === "heart_rate") {
        const avgHR = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length

        if (avgHR >= 100 || avgHR <= 50) {
          return "high"
        } else if (avgHR >= 90 || avgHR <= 55) {
          return "medium"
        } else {
          return "low"
        }
      }

      return "unknown"
    } catch (error) {
      console.error(`Error assessing ${metricType} risk:`, error)
      return "unknown"
    }
  }

  // Generate personalized recommendations based on metrics and trends
  generateRecommendations(metrics, metricType, trend, risk) {
    const recommendations = []

    // Base recommendations on metric type, trend, and risk level
    if (metricType === "temperature") {
      if (risk === "high") {
        recommendations.push("Consult your healthcare provider if fever persists")
        recommendations.push("Stay hydrated with plenty of fluids")
        recommendations.push("Rest and avoid strenuous activities")
      } else if (risk === "medium") {
        recommendations.push("Monitor for other symptoms of illness")
        recommendations.push("Consider over-the-counter fever reducers if appropriate")
      } else {
        recommendations.push("Continue monitoring your temperature")
        recommendations.push("Maintain good hygiene practices")
      }

      recommendations.push("Get adequate rest and nutrition")
    } else if (metricType === "heart_rate") {
      if (risk === "high") {
        recommendations.push("Consult your healthcare provider about heart rate patterns")
        recommendations.push("Monitor heart rate during different activities")
      }

      if (trend === "increasing") {
        recommendations.push("Practice relaxation techniques")
        recommendations.push("Reduce caffeine intake")
        recommendations.push("Ensure adequate sleep")
      } else if (trend === "decreasing" && risk !== "low") {
        recommendations.push("Maintain regular physical activity")
        recommendations.push("Monitor for symptoms of fatigue")
      } else {
        recommendations.push("Continue regular cardiovascular exercise")
      }
    }

    // Add general health recommendations
    if (recommendations.length < 3) {
      recommendations.push("Maintain a balanced diet rich in fruits and vegetables")
      recommendations.push("Stay hydrated throughout the day")
      recommendations.push("Aim for 7-8 hours of quality sleep each night")
    }

    return recommendations
  }

  // Generate comprehensive health analysis
  async generateHealthAnalysis() {
    try {
      const analysis = {}

      // Analyze temperature
      const tempMetrics = await this.fetchHistoricalData("temperature")
      if (tempMetrics.length > 0) {
        const tempTrend = this.analyzeMetricTrend(tempMetrics, "temperature")
        const tempRisk = this.assessRisk(tempMetrics, "temperature")
        const tempStats = this.calculateStatistics(tempMetrics, "temperature")
        const tempPredictions = await this.generatePredictions("temperature")
        const tempRecommendations = this.generateRecommendations(tempMetrics, "temperature", tempTrend, tempRisk)

        analysis.temperature = {
          trend: tempTrend,
          risk_level: tempRisk,
          statistics: tempStats,
          forecast: tempPredictions,
          recommendations: tempRecommendations,
          confidence_score: tempMetrics.length > 10 ? 0.75 : 0.55,
        }
      }

      // Analyze heart rate
      const hrMetrics = await this.fetchHistoricalData("heart_rate")
      if (hrMetrics.length > 0) {
        const hrTrend = this.analyzeMetricTrend(hrMetrics, "heart_rate")
        const hrRisk = this.assessRisk(hrMetrics, "heart_rate")
        const hrStats = this.calculateStatistics(hrMetrics, "heart_rate")
        const hrPredictions = await this.generatePredictions("heart_rate")
        const hrRecommendations = this.generateRecommendations(hrMetrics, "heart_rate", hrTrend, hrRisk)

        analysis.heart_rate = {
          trend: hrTrend,
          risk_level: hrRisk,
          statistics: hrStats,
          forecast: hrPredictions,
          recommendations: hrRecommendations,
          confidence_score: hrMetrics.length > 10 ? 0.7 : 0.5,
        }
      }

      // Add overall health score and summary
      analysis.overall_health = this.calculateOverallHealth(analysis)
      analysis.generated_at = new Date()

      // Store analysis results in Firestore
      await this.storeAnalysisResults(analysis)

      return analysis
    } catch (error) {
      console.error("Error generating health analysis:", error)
      throw error
    }
  }

  // Calculate overall health score based on individual metrics
  calculateOverallHealth(analysis) {
    try {
      const metrics = Object.keys(analysis).filter((key) => key !== "overall_health" && key !== "generated_at")

      if (metrics.length === 0) {
        return {
          score: null,
          status: "unknown",
          summary: "Insufficient data to determine overall health status",
        }
      }

      // Calculate risk score (0-100, lower is better)
      let riskScore = 0
      let totalWeight = 0

      if (analysis.heart_rate) {
        const weight = 0.5
        totalWeight += weight

        if (analysis.heart_rate.risk_level === "high") {
          riskScore += 70 * weight
        } else if (analysis.heart_rate.risk_level === "medium") {
          riskScore += 35 * weight
        } else {
          riskScore += 10 * weight
        }
      }

      if (analysis.temperature) {
        const weight = 0.5
        totalWeight += weight

        if (analysis.temperature.risk_level === "high") {
          riskScore += 80 * weight
        } else if (analysis.temperature.risk_level === "medium") {
          riskScore += 30 * weight
        } else {
          riskScore += 5 * weight
        }
      }

      // Normalize score
      if (totalWeight > 0) {
        riskScore = riskScore / totalWeight
      }

      // Convert to health score (100 - risk score)
      const healthScore = Math.max(0, Math.min(100, 100 - riskScore))

      // Determine status
      let status
      if (healthScore >= 80) {
        status = "excellent"
      } else if (healthScore >= 60) {
        status = "good"
      } else if (healthScore >= 40) {
        status = "fair"
      } else {
        status = "concerning"
      }

      // Generate summary
      let summary
      if (status === "excellent") {
        summary = "Your health metrics indicate excellent overall health. Continue your healthy habits."
      } else if (status === "good") {
        summary = "Your health metrics are generally good. Minor improvements could optimize your health further."
      } else if (status === "fair") {
        summary = "Some health metrics show room for improvement. Consider following the recommendations provided."
      } else {
        summary = "Several health metrics indicate areas of concern. Please consult with your healthcare provider."
      }

      return {
        score: Math.round(healthScore),
        status: status,
        summary: summary,
      }
    } catch (error) {
      console.error("Error calculating overall health:", error)
      return {
        score: null,
        status: "unknown",
        summary: "Unable to calculate health score due to an error",
      }
    }
  }

  // Store analysis results in Firestore for future reference
  async storeAnalysisResults(analysis) {
    try {
      if (!this.currentUser) {
        throw new Error("User not authenticated")
      }

      const analysisRef = doc(db, "users", this.currentUser.uid, "health_analysis", "latest")

      await setDoc(analysisRef, {
        ...analysis,
        generated_at: serverTimestamp(),
      })

      console.log("Analysis stored successfully")
    } catch (error) {
      console.error("Error storing analysis results:", error)
    }
  }
}

export default new AIPredictionService()
