class LLMPredictionService {
  constructor() {
    this.apiKey = "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"
    this.baseUrl = "https://openrouter.ai/api/v1/chat/completions"
    this.model = "deepseek/deepseek-chat-v3.1:free"
  }

  // Generate health predictions using LLM
  async generateHealthPrediction(temperatureData, heartRateData, userContext = {}) {
    try {
      console.log("🤖 Generating LLM-powered health prediction...")

      // Prepare the health data context
      const healthContext = this.prepareHealthContext(temperatureData, heartRateData, userContext)

      // Create the prompt for the LLM
      const prompt = this.createHealthPredictionPrompt(healthContext)

      // Call the LLM API
      const response = await this.callLLMAPI(prompt)

      // Parse and structure the response
      const prediction = this.parseHealthPrediction(response)

      console.log("✅ LLM health prediction generated successfully")
      return prediction
    } catch (error) {
      console.error("❌ Error generating LLM health prediction:", error)
      throw error
    }
  }

  // Prepare health context from temperature and heart rate data
  prepareHealthContext(temperatureData, heartRateData, userContext) {
    const context = {
      timestamp: new Date().toISOString(),
      userAge: userContext.age || "unknown",
      userGender: userContext.gender || "unknown",
      temperature: {
        current: null,
        recent: [],
        trend: "unknown",
        average: null,
      },
      heartRate: {
        current: null,
        recent: [],
        trend: "unknown",
        average: null,
      },
    }

    // Process temperature data
    if (temperatureData && temperatureData.length > 0) {
      const tempValues = temperatureData.map((d) => d.value).filter((v) => v != null)
      if (tempValues.length > 0) {
        context.temperature.current = tempValues[0]
        context.temperature.recent = tempValues.slice(0, 10) // Last 10 readings
        context.temperature.average = tempValues.reduce((a, b) => a + b, 0) / tempValues.length
        context.temperature.trend = this.calculateTrend(tempValues)
      }
    }

    // Process heart rate data
    if (heartRateData && heartRateData.length > 0) {
      const hrValues = heartRateData.map((d) => d.value).filter((v) => v != null)
      if (hrValues.length > 0) {
        context.heartRate.current = hrValues[0]
        context.heartRate.recent = hrValues.slice(0, 10) // Last 10 readings
        context.heartRate.average = hrValues.reduce((a, b) => a + b, 0) / hrValues.length
        context.heartRate.trend = this.calculateTrend(hrValues)
      }
    }

    return context
  }

  // Calculate trend from values
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

  // Create the health prediction prompt for the LLM
  createHealthPredictionPrompt(healthContext) {
    return `You are an advanced AI health analyst. Analyze the following health data and provide a comprehensive health prediction and assessment.

HEALTH DATA:
- Current Temperature: ${healthContext.temperature.current ? `${healthContext.temperature.current}°C` : "No data"}
- Temperature Trend: ${healthContext.temperature.trend}
- Recent Temperature Readings: ${healthContext.temperature.recent.length > 0 ? healthContext.temperature.recent.join(", ") + "°C" : "No data"}
- Average Temperature: ${healthContext.temperature.average ? `${healthContext.temperature.average.toFixed(1)}°C` : "No data"}

- Current Heart Rate: ${healthContext.heartRate.current ? `${healthContext.heartRate.current} bpm` : "No data"}
- Heart Rate Trend: ${healthContext.heartRate.trend}
- Recent Heart Rate Readings: ${healthContext.heartRate.recent.length > 0 ? healthContext.heartRate.recent.join(", ") + " bpm" : "No data"}
- Average Heart Rate: ${healthContext.heartRate.average ? `${Math.round(healthContext.heartRate.average)} bpm` : "No data"}

USER CONTEXT:
- Age: ${healthContext.userAge}
- Gender: ${healthContext.userGender}
- Analysis Time: ${healthContext.timestamp}

INSTRUCTIONS:
Please provide a detailed health analysis in the following JSON format. Be precise, medically informed, and provide actionable insights:

{
  "overall_assessment": {
    "health_score": [0-100 integer],
    "status": "[excellent|good|fair|concerning|critical]",
    "summary": "[2-3 sentence overall health summary]"
  },
  "temperature_analysis": {
    "status": "[normal|elevated|fever|hypothermia]",
    "risk_level": "[low|medium|high]",
    "trend_interpretation": "[detailed explanation of temperature trend]",
    "7_day_forecast": [
      {"day": 1, "predicted_temp": [temperature in celsius], "confidence": [0-1]},
      {"day": 2, "predicted_temp": [temperature in celsius], "confidence": [0-1]},
      {"day": 3, "predicted_temp": [temperature in celsius], "confidence": [0-1]},
      {"day": 4, "predicted_temp": [temperature in celsius], "confidence": [0-1]},
      {"day": 5, "predicted_temp": [temperature in celsius], "confidence": [0-1]},
      {"day": 6, "predicted_temp": [temperature in celsius], "confidence": [0-1]},
      {"day": 7, "predicted_temp": [temperature in celsius], "confidence": [0-1]}
    ]
  },
  "heart_rate_analysis": {
    "status": "[normal|bradycardia|tachycardia|irregular]",
    "risk_level": "[low|medium|high]",
    "trend_interpretation": "[detailed explanation of heart rate trend]",
    "7_day_forecast": [
      {"day": 1, "predicted_hr": [heart rate in bpm], "confidence": [0-1]},
      {"day": 2, "predicted_hr": [heart rate in bpm], "confidence": [0-1]},
      {"day": 3, "predicted_hr": [heart rate in bpm], "confidence": [0-1]},
      {"day": 4, "predicted_hr": [heart rate in bpm], "confidence": [0-1]},
      {"day": 5, "predicted_hr": [heart rate in bpm], "confidence": [0-1]},
      {"day": 6, "predicted_hr": [heart rate in bpm], "confidence": [0-1]},
      {"day": 7, "predicted_hr": [heart rate in bpm], "confidence": [0-1]}
    ]
  },
  "health_recommendations": [
    "[specific actionable recommendation 1]",
    "[specific actionable recommendation 2]",
    "[specific actionable recommendation 3]",
    "[specific actionable recommendation 4]",
    "[specific actionable recommendation 5]"
  ],
  "risk_factors": [
    "[identified risk factor 1]",
    "[identified risk factor 2]",
    "[identified risk factor 3]"
  ],
  "when_to_seek_care": "[specific guidance on when to contact healthcare provider]",
  "confidence_score": [0-1 overall confidence in analysis],
  "data_quality": "[excellent|good|fair|poor] - assessment of input data quality"
}

Ensure all temperature values are in Celsius (35.0-42.0 range), heart rate values are in bpm (40-200 range), and provide medically sound analysis based on the available data.`
  }

  // Call the LLM API
  async callLLMAPI(prompt) {
    try {
      console.log("🌐 Calling OpenRouter API with DeepSeek model...")

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://v0.app",
          "X-Title": "Balasco Health App",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent medical analysis
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API request failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid API response format")
      }

      console.log("✅ LLM API call successful")
      return data.choices[0].message.content
    } catch (error) {
      console.error("❌ LLM API call failed:", error)
      throw error
    }
  }

  // Parse the LLM response into structured data
  parseHealthPrediction(llmResponse) {
    try {
      console.log("📝 Parsing LLM response...")

      // Try to extract JSON from the response
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in LLM response")
      }

      const parsedResponse = JSON.parse(jsonMatch[0])

      // Validate and structure the response
      const prediction = {
        generated_at: new Date(),
        llm_powered: true,
        overall_health: {
          score: parsedResponse.overall_assessment?.health_score || null,
          status: parsedResponse.overall_assessment?.status || "unknown",
          summary: parsedResponse.overall_assessment?.summary || "Analysis unavailable",
        },
        temperature: {
          type: "temperature_trend",
          status: parsedResponse.temperature_analysis?.status || "unknown",
          risk_level: parsedResponse.temperature_analysis?.risk_level || "unknown",
          trend_interpretation: parsedResponse.temperature_analysis?.trend_interpretation || "No analysis available",
          forecast:
            parsedResponse.temperature_analysis?.["7_day_forecast"]?.map((day) => ({
              day: day.day,
              temperature: day.predicted_temp,
              value: day.predicted_temp,
              confidence: day.confidence,
            })) || [],
          confidence_score: parsedResponse.confidence_score || 0.5,
          recommendations:
            parsedResponse.health_recommendations?.filter(
              (rec) => rec.toLowerCase().includes("temperature") || rec.toLowerCase().includes("fever"),
            ) || [],
        },
        heart_rate: {
          type: "heart_rate_trend",
          status: parsedResponse.heart_rate_analysis?.status || "unknown",
          risk_level: parsedResponse.heart_rate_analysis?.risk_level || "unknown",
          trend_interpretation: parsedResponse.heart_rate_analysis?.trend_interpretation || "No analysis available",
          forecast:
            parsedResponse.heart_rate_analysis?.["7_day_forecast"]?.map((day) => ({
              day: day.day,
              heart_rate: day.predicted_hr,
              value: day.predicted_hr,
              confidence: day.confidence,
            })) || [],
          confidence_score: parsedResponse.confidence_score || 0.5,
          recommendations:
            parsedResponse.health_recommendations?.filter(
              (rec) => rec.toLowerCase().includes("heart") || rec.toLowerCase().includes("cardio"),
            ) || [],
        },
        recommendations: parsedResponse.health_recommendations || [],
        risk_factors: parsedResponse.risk_factors || [],
        when_to_seek_care: parsedResponse.when_to_seek_care || "Consult healthcare provider if symptoms persist",
        confidence_score: parsedResponse.confidence_score || 0.5,
        data_quality: parsedResponse.data_quality || "unknown",
      }

      console.log("✅ LLM response parsed successfully")
      return prediction
    } catch (error) {
      console.error("❌ Error parsing LLM response:", error)

      // Return fallback prediction structure
      return {
        generated_at: new Date(),
        llm_powered: true,
        overall_health: {
          score: null,
          status: "unknown",
          summary: "Unable to generate analysis due to parsing error",
        },
        temperature: {
          type: "temperature_trend",
          status: "unknown",
          risk_level: "unknown",
          trend_interpretation: "Analysis unavailable",
          forecast: [],
          confidence_score: 0.3,
          recommendations: [],
        },
        heart_rate: {
          type: "heart_rate_trend",
          status: "unknown",
          risk_level: "unknown",
          trend_interpretation: "Analysis unavailable",
          forecast: [],
          confidence_score: 0.3,
          recommendations: [],
        },
        recommendations: ["Unable to generate recommendations due to analysis error"],
        risk_factors: [],
        when_to_seek_care: "Consult healthcare provider if you have health concerns",
        confidence_score: 0.3,
        data_quality: "poor",
      }
    }
  }

  // Generate enhanced health analysis using both traditional methods and LLM
  async generateEnhancedHealthAnalysis(temperatureData, heartRateData, userContext = {}) {
    try {
      console.log("🚀 Starting enhanced health analysis with LLM...")

      // Generate LLM-powered prediction
      const llmPrediction = await this.generateHealthPrediction(temperatureData, heartRateData, userContext)

      // Add metadata
      llmPrediction.analysis_type = "llm_enhanced"
      llmPrediction.model_used = this.model
      llmPrediction.api_provider = "OpenRouter"

      console.log("✅ Enhanced health analysis completed")
      return llmPrediction
    } catch (error) {
      console.error("❌ Enhanced health analysis failed:", error)
      throw error
    }
  }
}

export default new LLMPredictionService()
