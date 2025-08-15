import { ref, get, onValue, off, push, set, remove } from 'firebase/database'
import { realtimeDb, auth } from '../config/firebase'

class HealthMetricsService {
  constructor() {
    this.listeners = new Map()
    this.currentUser = null

    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
      this.currentUser = user
      if (!user) {
        // Clean up listeners when user logs out
        this.cleanupAllListeners()
      }
    })
  }

  // Clear current readings from database
  async clearCurrentReadings() {
    try {
      console.log('🗑️ Clearing current readings from Firebase...')
      const currentReadingsRef = ref(realtimeDb, 'current_readings')
      await remove(currentReadingsRef)
      console.log('✅ Current readings cleared successfully')
    } catch (error) {
      console.error('❌ Error clearing current readings:', error)
      throw error
    }
  }

  // Get current readings from the specific Firebase endpoint
  async getCurrentReadings() {
    try {
      console.log('🔍 Fetching current readings from Firebase current_readings endpoint...')
      const currentReadingsRef = ref(realtimeDb, 'current_readings')
      const snapshot = await get(currentReadingsRef)
      
      if (snapshot.exists()) {
        const data = snapshot.val()
        console.log('📊 Raw current readings data from Firebase:', JSON.stringify(data, null, 2))
        
        // Transform the data to match our expected format - using your specific field names
        const readings = {}
        
        // Handle temperature - using temperature_celsius field
        if (data.temperature_celsius !== undefined && data.temperature_celsius !== null) {
          readings.temperature = {
            value: Number(data.temperature_celsius),
            unit: 'celsius',
            device_id: 'device_sensor',
            recorded_at: data.timestamp ? new Date(data.timestamp) : new Date(),
            metric_type: 'temperature',
            // Additional info from your data
            temp_valid: data.temp_valid,
            temperature_fahrenheit: data.temperature_fahrenheit
          }
          console.log('🌡️ Temperature reading found:', data.temperature_celsius, '°C')
        }
        
        // Handle heart rate - using heart_rate_bpm field
        if (data.heart_rate_bpm !== undefined && data.heart_rate_bpm !== null) {
          readings.heart_rate = {
            value: Number(data.heart_rate_bpm),
            unit: 'bpm',
            device_id: 'device_sensor',
            recorded_at: data.timestamp ? new Date(data.timestamp) : new Date(),
            metric_type: 'heart_rate',
            // Additional info from your data
            heart_rate_avg: data.heart_rate_avg
          }
          console.log('❤️ Heart rate reading found:', data.heart_rate_bpm, 'bpm')
        }
        
        // Log additional sensor data for reference
        if (data.wifi_rssi !== undefined) {
          console.log('📶 WiFi RSSI:', data.wifi_rssi)
        }
        if (data.timestamp !== undefined) {
          console.log('⏰ Timestamp:', data.timestamp)
        }
        
        console.log('✅ Processed current readings:', JSON.stringify(readings, null, 2))
        return readings
      } else {
        console.log('📊 No current readings available in Firebase - current_readings node is empty or does not exist')
        return {}
      }
    } catch (error) {
      console.error('❌ Error getting current readings from Firebase:', error)
      throw error
    }
  }

  // Real-time listener for current readings
  subscribeToCurrentReadings(callback) {
    try {
      console.log('👂 Setting up real-time listener for current_readings endpoint...')
      const currentReadingsRef = ref(realtimeDb, 'current_readings')
      const listenerId = `current_readings_${Date.now()}_${Math.random()}`

      const handleData = (snapshot) => {
        try {
          if (snapshot.exists()) {
            const data = snapshot.val()
            console.log('🔄 Real-time update from current_readings:', JSON.stringify(data, null, 2))
          
            // Transform the data to match our expected format - using your specific field names
            const readings = {}
          
            // Handle temperature - using temperature_celsius field
            if (data.temperature_celsius !== undefined && data.temperature_celsius !== null) {
              readings.temperature = {
                value: Number(data.temperature_celsius),
                unit: 'celsius',
                device_id: 'device_sensor',
                recorded_at: data.timestamp ? new Date(data.timestamp) : new Date(),
                metric_type: 'temperature',
                // Additional info from your data
                temp_valid: data.temp_valid,
                temperature_fahrenheit: data.temperature_fahrenheit
              }
              console.log('🌡️ Real-time temperature update:', data.temperature_celsius, '°C')
            }
          
            // Handle heart rate - using heart_rate_bpm field
            if (data.heart_rate_bpm !== undefined && data.heart_rate_bpm !== null) {
              readings.heart_rate = {
                value: Number(data.heart_rate_bpm),
                unit: 'bpm',
                device_id: 'device_sensor',
                recorded_at: data.timestamp ? new Date(data.timestamp) : new Date(),
                metric_type: 'heart_rate',
                // Additional info from your data
                heart_rate_avg: data.heart_rate_avg
              }
              console.log('❤️ Real-time heart rate update:', data.heart_rate_bpm, 'bpm')
            }
          
            console.log('📡 Sending current readings to UI:', JSON.stringify(readings, null, 2))
            callback(readings)
          } else {
            console.log('📊 Current readings node is empty or deleted - no data to display')
            callback({})
          }
        } catch (error) {
          console.error('❌ Error processing current readings real-time update:', error)
          callback({})
        }
      }

      const handleError = (error) => {
        console.error('❌ Current readings real-time listener error:', error)
        callback({})
      }

      // Set up the listener
      onValue(currentReadingsRef, handleData, handleError)

      // Store listener reference
      this.listeners.set(listenerId, {
        ref: currentReadingsRef,
        handler: handleData,
      })

      // Return cleanup function
      const unsubscribe = () => {
        try {
          const listener = this.listeners.get(listenerId)
          if (listener) {
            off(listener.ref, 'value', listener.handler)
            this.listeners.delete(listenerId)
            console.log('🧹 Cleaned up current readings listener:', listenerId)
          }
        } catch (error) {
          console.error('❌ Error cleaning up current readings listener:', error)
        }
      }

      console.log('✅ Real-time listener for current_readings set up successfully:', listenerId)
      return unsubscribe
    } catch (error) {
      console.error('❌ Error setting up current readings listener:', error)
      return () => {}
    }
  }

  // Get user's metrics reference in Realtime Database (for historical data)
  getUserMetricsRef() {
    if (!this.currentUser) {
      throw new Error("User not authenticated")
    }
    return ref(realtimeDb, `users/${this.currentUser.uid}/metrics`)
  }

  // Add a new health metric (for historical tracking)
  async addMetric(metricData) {
    try {
      const metricsRef = this.getUserMetricsRef()

      const timestamp = Date.now()
      const metric = {
        metric_type: metricData.metric_type,
        value: metricData.value,
        unit: metricData.unit,
        device_id: metricData.device_id || "unknown",
        notes: metricData.notes || "",
        recorded_at: timestamp,
        created_at: timestamp,
        date_string: new Date().toISOString().split("T")[0],
        hour: new Date().getHours(),
        day_of_week: new Date().getDay(),
      }

      const newMetricRef = push(metricsRef)
      await set(newMetricRef, metric)

      console.log("✅ Metric added to user history:", metricData.metric_type, metricData.value)
      return { id: newMetricRef.key, ...metric }
    } catch (error) {
      console.error("❌ Error adding metric:", error)
      throw error
    }
  }

  // Get metrics with optional filtering (for historical data)
  async getMetrics(options = {}) {
    try {
      if (!this.currentUser) {
        console.warn("User not authenticated")
        return []
      }

      const metricsRef = this.getUserMetricsRef()
      console.log("📥 Fetching historical metrics from user data...")

      const snapshot = await get(metricsRef)
      const metrics = []

      if (snapshot.exists()) {
        const data = snapshot.val()
        console.log("📊 Raw historical data keys:", Object.keys(data).length)

        Object.entries(data).forEach(([key, metric]) => {
          if (typeof metric === "object" && metric !== null) {
            // Apply filters - only temperature and heart_rate
            if (options.metric_type && metric.metric_type !== options.metric_type) {
              return
            }

            // Only include temperature and heart_rate metrics
            if (metric.metric_type === 'temperature' || metric.metric_type === 'heart_rate') {
              metrics.push({
                id: key,
                ...metric,
                recorded_at: new Date(metric.recorded_at || Date.now()),
                created_at: new Date(metric.created_at || Date.now()),
              })
            }
          }
        })
      }

      // Sort by recorded_at descending (client-side sorting)
      metrics.sort((a, b) => b.recorded_at.getTime() - a.recorded_at.getTime())

      // Apply limit after sorting
      const finalMetrics = options.limit && options.limit > 0 ? metrics.slice(0, options.limit) : metrics

      console.log(`📊 Retrieved ${finalMetrics.length} historical metrics`)
      return finalMetrics
    } catch (error) {
      console.error("❌ Error getting historical metrics:", error)
      return []
    }
  }

  // Get latest metric for each type from historical data
  async getLatestMetrics() {
    try {
      const allMetrics = await this.getMetrics({ limit: 100 })
      const latestMetrics = {}

      // Group by metric type and get the latest for each (only temperature and heart_rate)
      const metricsByType = {}
      allMetrics.forEach((metric) => {
        if (metric.metric_type === 'temperature' || metric.metric_type === 'heart_rate') {
          if (!metricsByType[metric.metric_type]) {
            metricsByType[metric.metric_type] = []
          }
          metricsByType[metric.metric_type].push(metric)
        }
      })

      // Get the latest for each type
      Object.keys(metricsByType).forEach((type) => {
        const typeMetrics = metricsByType[type].sort((a, b) => b.recorded_at.getTime() - a.recorded_at.getTime())
        if (typeMetrics.length > 0) {
          latestMetrics[type] = typeMetrics[0]
        }
      })

      console.log("📈 Latest historical metrics:", Object.keys(latestMetrics))
      return latestMetrics
    } catch (error) {
      console.error("❌ Error getting latest historical metrics:", error)
      return {}
    }
  }

  // Real-time listener for historical metrics
  subscribeToMetrics(callback, options = {}) {
    try {
      if (!this.currentUser) {
        console.warn("User not authenticated, cannot subscribe to historical metrics")
        return () => {}
      }

      const metricsRef = this.getUserMetricsRef()
      const listenerId = `metrics_${Date.now()}_${Math.random()}`

      const handleData = (snapshot) => {
        try {
          const metrics = []

          if (snapshot.exists()) {
            const data = snapshot.val()

            Object.entries(data).forEach(([key, metric]) => {
              if (typeof metric === "object" && metric !== null) {
                // Apply filters
                if (options.metric_type && metric.metric_type !== options.metric_type) {
                  return
                }

                // Only include temperature and heart_rate metrics
                if (metric.metric_type === 'temperature' || metric.metric_type === 'heart_rate') {
                  metrics.push({
                    id: key,
                    ...metric,
                    recorded_at: new Date(metric.recorded_at || Date.now()),
                    created_at: new Date(metric.created_at || Date.now()),
                  })
                }
              }
            })
          }

          // Sort by recorded_at descending (client-side sorting)
          metrics.sort((a, b) => b.recorded_at.getTime() - a.recorded_at.getTime())

          // Apply limit
          const finalMetrics = options.limit && options.limit > 0 ? metrics.slice(0, options.limit) : metrics

          console.log(`🔄 Historical metrics real-time update: ${finalMetrics.length} metrics`)
          callback(finalMetrics)
        } catch (error) {
          console.error("❌ Error processing historical real-time data:", error)
          callback([])
        }
      }

      const handleError = (error) => {
        console.error("❌ Historical metrics real-time listener error:", error)
        callback([])
      }

      // Set up the listener
      onValue(metricsRef, handleData, handleError)

      // Store listener reference
      this.listeners.set(listenerId, {
        ref: metricsRef,
        handler: handleData,
      })

      // Return cleanup function
      const unsubscribe = () => {
        try {
          const listener = this.listeners.get(listenerId)
          if (listener) {
            off(listener.ref, "value", listener.handler)
            this.listeners.delete(listenerId)
            console.log("🧹 Cleaned up historical metrics listener:", listenerId)
          }
        } catch (error) {
          console.error("❌ Error cleaning up historical metrics listener:", error)
        }
      }

      console.log("👂 Set up historical metrics real-time listener:", listenerId)
      return unsubscribe
    } catch (error) {
      console.error("❌ Error setting up historical metrics listener:", error)
      return () => {}
    }
  }

  // Clean up all listeners
  cleanupAllListeners() {
    console.log("🧹 Cleaning up all listeners...")
    this.listeners.forEach((listener, id) => {
      try {
        off(listener.ref, "value", listener.handler)
      } catch (error) {
        console.error("❌ Error cleaning up listener:", id, error)
      }
    })
    this.listeners.clear()
  }
}

export default new HealthMetricsService()
