import healthMetricsService from "./healthMetricsService"
import { ref, set } from "firebase/database"
import { realtimeDb } from "../config/firebase"

class SimulationService {
  constructor() {
    this.isRunning = false
    this.intervalId = null
    console.log("🚫 SimulationService: Simulation is disabled. App will only read from database.")
  }

  // Start simulation
  startSimulation(interval = 15000) {
    console.log("🚫 Simulation disabled. App will only read current_readings from Firebase database.")
    console.log("💡 To update readings, upload data to Firebase 'current_readings' endpoint:")
    console.log("   - temperature: [your value]")
    console.log("   - heart_rate: [your value]")
    return
  }

  // Stop simulation
  stopSimulation() {
    console.log("🚫 No simulation to stop - app only reads from database")
  }

  // Generate realistic health metrics - only temperature and heart rate
  async generateAndSendMetrics() {
    // This method is now disabled
    return
  }

  // Update the current_readings endpoint - only temperature and heart rate
  async updateCurrentReadings() {
    // This method is now disabled
    return
  }

  // Send to user's personal metrics for historical tracking - only temperature and heart rate
  async sendToPersonalMetrics() {
    // This method is now disabled
    return
  }

  // Generate realistic temperature values
  generateTemperature(timeOfDay) {
    // This method is now disabled
    return null
  }

  // Generate realistic heart rate values
  generateHeartRate(isResting, isActive) {
    // This method is now disabled
    return null
  }

  // Get current simulated metrics
  getCurrentMetrics() {
    return {
      temperature: null,
      heartRate: null,
    }
  }

  // Check if simulation is running
  isSimulationRunning() {
    return false
  }
}

export default new SimulationService()
