import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { db, auth } from "../config/firebase"
import healthMetricsService from "./healthMetricsService"

class PredictiveAnalysisService {
  constructor() {
    this.currentUser = null

    auth.onAuthStateChanged((user) => {
      this.currentUser = user
    })
  }

  // Generate health predictions based on historical data
  async generatePredictions() {
    try {
      if (!this.currentUser) {
        throw new Error("User not authenticated")
      }

      // Get recent metrics for analysis
      const recentMetrics = await healthMetricsService.getMetrics({ limit: 30 })

      const predictions = {}

      // Analyze blood pressure trends
      const bpMetrics = recentMetrics.filter((m) => m.metric_type === "blood_pressure")
      if (bpMetrics.length >= 5) {
        predictions.blood_pressure = await this.analyzeBPTrend(bpMetrics)
      }

      // Analyze temperature trends
      const tempMetrics = recentMetrics.filter((m) => m.metric_type === "temperature")
      if (tempMetrics.length >= 5) {
        predictions.temperature = await this.analyzeTempTrend(tempMetrics)
      }

      // Analyze heart rate trends
      const hrMetrics = recentMetrics.filter((m) => m.metric_type === "heart_rate")
      if (hrMetrics.length >= 5) {
        predictions.heart_rate = await this.analyzeHRTrend(hrMetrics)
      }

      // Store predictions
      await this.storePredictions(predictions)

      return predictions
    } catch (error) {
      console.error("Error generating predictions: ", error)
      throw error
    }
  }

  // Analyze blood pressure trends
  async analyzeBPTrend(bpMetrics) {
    const systolicValues = bpMetrics.map((m) => m.value.systolic)
    const diastolicValues = bpMetrics.map((m) => m.value.diastolic)

    const systolicTrend = this.calculateTrend(systolicValues)
    const diastolicTrend = this.calculateTrend(diastolicValues)

    const avgSystolic = systolicValues.reduce((a, b) => a + b, 0) / systolicValues.length
    const avgDiastolic = diastolicValues.reduce((a, b) => a + b, 0) / diastolicValues.length

    const riskLevel = this.assessBPRisk(avgSystolic, avgDiastolic)
    const forecast = this.generateBPForecast(bpMetrics.slice(0, 7))

    return {
      type: "blood_pressure_trend",
      systolic_trend: systolicTrend,
      diastolic_trend: diastolicTrend,
      average_systolic: Math.round(avgSystolic),
      average_diastolic: Math.round(avgDiastolic),
      risk_level: riskLevel,
      forecast: forecast,
      confidence_score: 0.75,
      recommendations: this.generateBPRecommendations(systolicTrend, diastolicTrend, riskLevel),
      generated_at: new Date(),
    }
  }

  // Analyze temperature trends
  async analyzeTempTrend(tempMetrics) {
    const tempValues = tempMetrics.map((m) => m.value)
    const trend = this.calculateTrend(tempValues)
    const avgTemp = tempValues.reduce((a, b) => a + b, 0) / tempValues.length

    const riskLevel = this.assessTempRisk(avgTemp)
    const forecast = this.generateTempForecast(tempMetrics.slice(0, 7))

    return {
      type: "temperature_trend",
      trend: trend,
      average_temperature: Number.parseFloat(avgTemp.toFixed(1)),
      risk_level: riskLevel,
      forecast: forecast,
      confidence_score: 0.7,
      recommendations: this.generateTempRecommendations(trend, riskLevel),
      generated_at: new Date(),
    }
  }

  // Analyze heart rate trends
  async analyzeHRTrend(hrMetrics) {
    const hrValues = hrMetrics.map((m) => m.value)
    const trend = this.calculateTrend(hrValues)
    const avgHR = hrValues.reduce((a, b) => a + b, 0) / hrValues.length

    const riskLevel = this.assessHRRisk(avgHR)
    const forecast = this.generateHRForecast(hrMetrics.slice(0, 7))

    return {
      type: "heart_rate_trend",
      trend: trend,
      average_heart_rate: Math.round(avgHR),
      risk_level: riskLevel,
      forecast: forecast,
      confidence_score: 0.65,
      recommendations: this.generateHRRecommendations(trend, riskLevel),
      generated_at: new Date(),
    }
  }

  // Calculate trend direction
  calculateTrend(values) {
    if (values.length < 3) return "stable"

    const recent = values.slice(0, Math.ceil(values.length / 2))
    const older = values.slice(Math.ceil(values.length / 2))

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length

    const difference = recentAvg - olderAvg
    const threshold = values[0] * 0.05 // 5% threshold

    if (Math.abs(difference) < threshold) return "stable"
    return difference > 0 ? "increasing" : "decreasing"
  }

  // Risk assessment functions
  assessBPRisk(systolic, diastolic) {
    if (systolic > 140 || diastolic > 90) return "high"
    if (systolic > 130 || diastolic > 85) return "medium"
    return "low"
  }

  assessTempRisk(avgTemp) {
    if (avgTemp > 37.5) return "high"
    if (avgTemp > 37.0 || avgTemp < 36.0) return "medium"
    return "low"
  }

  assessHRRisk(avgHR) {
    if (avgHR > 100 || avgHR < 60) return "high"
    if (avgHR > 90 || avgHR < 65) return "medium"
    return "low"
  }

  // Forecast generation functions
  generateBPForecast(recentData) {
    const forecast = []
    const latest = recentData[0]

    for (let i = 1; i <= 7; i++) {
      forecast.push({
        day: i,
        systolic: Math.max(90, Math.min(160, latest.value.systolic + (Math.random() * 6 - 3))),
        diastolic: Math.max(60, Math.min(100, latest.value.diastolic + (Math.random() * 4 - 2))),
      })
    }

    return forecast
  }

  generateTempForecast(recentData) {
    const forecast = []
    const latest = recentData[0]

    for (let i = 1; i <= 7; i++) {
      forecast.push({
        day: i,
        temperature: Number.parseFloat(
          Math.max(35.5, Math.min(38.0, latest.value + (Math.random() * 0.6 - 0.3))).toFixed(1),
        ),
      })
    }

    return forecast
  }

  generateHRForecast(recentData) {
    const forecast = []
    const latest = recentData[0]

    for (let i = 1; i <= 7; i++) {
      forecast.push({
        day: i,
        heart_rate: Math.max(50, Math.min(120, latest.value + (Math.random() * 10 - 5))),
      })
    }

    return forecast
  }

  // Recommendation generation functions
  generateBPRecommendations(systolicTrend, diastolicTrend, riskLevel) {
    const recommendations = []

    if (riskLevel === "high") {
      recommendations.push("Consult your healthcare provider immediately")
      recommendations.push("Monitor blood pressure daily")
    }

    if (systolicTrend === "increasing" || diastolicTrend === "increasing") {
      recommendations.push("Reduce sodium intake to less than 2,300mg per day")
      recommendations.push("Engage in 30 minutes of moderate exercise daily")
      recommendations.push("Practice stress management techniques")
      recommendations.push("Limit alcohol consumption")
    } else {
      recommendations.push("Maintain your current healthy lifestyle")
      recommendations.push("Continue regular exercise routine")
    }

    recommendations.push("Keep monitoring your blood pressure regularly")
    return recommendations
  }

  generateTempRecommendations(trend, riskLevel) {
    const recommendations = []

    if (riskLevel === "high") {
      recommendations.push("Seek medical attention if fever persists")
      recommendations.push("Stay hydrated with plenty of fluids")
    }

    if (trend === "increasing") {
      recommendations.push("Monitor for other symptoms of illness")
      recommendations.push("Rest and avoid strenuous activities")
      recommendations.push("Consider over-the-counter fever reducers if appropriate")
    } else {
      recommendations.push("Continue monitoring your temperature")
      recommendations.push("Maintain good hygiene practices")
    }

    recommendations.push("Get adequate rest and nutrition")
    return recommendations
  }

  generateHRRecommendations(trend, riskLevel) {
    const recommendations = []

    if (riskLevel === "high") {
      recommendations.push("Consult your healthcare provider about heart rate patterns")
      recommendations.push("Monitor heart rate during different activities")
    }

    if (trend === "increasing") {
      recommendations.push("Practice relaxation techniques")
      recommendations.push("Reduce caffeine intake")
      recommendations.push("Ensure adequate sleep")
    } else if (trend === "decreasing") {
      recommendations.push("Maintain regular physical activity")
      recommendations.push("Monitor for symptoms of fatigue")
    }

    recommendations.push("Continue regular cardiovascular exercise")
    return recommendations
  }

  // Store predictions in Firestore
  async storePredictions(predictions) {
    try {
      const predictionsRef = doc(db, "users", this.currentUser.uid, "predictions", "latest")

      await setDoc(predictionsRef, {
        predictions: predictions,
        generated_at: serverTimestamp(),
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
      })

      console.log("Predictions stored successfully")
    } catch (error) {
      console.error("Error storing predictions: ", error)
      throw error
    }
  }

  // Get stored predictions
  async getPredictions() {
    try {
      const predictionsRef = doc(db, "users", this.currentUser.uid, "predictions", "latest")
      const docSnap = await getDoc(predictionsRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        return {
          ...data,
          generated_at: data.generated_at?.toDate(),
          valid_until: data.valid_until?.toDate(),
        }
      } else {
        // Generate new predictions if none exist
        return await this.generatePredictions()
      }
    } catch (error) {
      console.error("Error getting predictions: ", error)
      throw error
    }
  }
}

export default new PredictiveAnalysisService()
