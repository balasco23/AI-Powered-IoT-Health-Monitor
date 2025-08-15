import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore"
import { db, auth } from "../config/firebase"

class AlertsService {
  constructor() {
    this.currentUser = null
    this.unsubscribers = []

    auth.onAuthStateChanged((user) => {
      this.currentUser = user
    })
  }

  // Get user's alerts collection reference
  getUserAlertsRef() {
    if (!this.currentUser) {
      throw new Error("User not authenticated")
    }
    return collection(db, "users", this.currentUser.uid, "alerts")
  }

  // Get alerts with optional filtering
  async getAlerts(options = {}) {
    try {
      const alertsRef = this.getUserAlertsRef()

      let q = query(alertsRef)

      // Filter by acknowledged status
      if (options.acknowledged !== undefined) {
        q = query(q, where("acknowledged", "==", options.acknowledged))
      }

      // Filter by severity
      if (options.severity) {
        q = query(q, where("severity", "==", options.severity))
      }

      // Add ordering
      q = query(q, orderBy("created_at", "desc"))

      // Add limit
      if (options.limit) {
        q = query(q, limit(options.limit))
      }

      const querySnapshot = await getDocs(q)
      const alerts = []

      querySnapshot.forEach((doc) => {
        alerts.push({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate(),
          acknowledged_at: doc.data().acknowledged_at?.toDate(),
        })
      })

      return alerts
    } catch (error) {
      console.error("Error getting alerts: ", error)
      throw error
    }
  }

  // Get unacknowledged alerts count
  async getUnacknowledgedCount() {
    try {
      const alerts = await this.getAlerts({ acknowledged: false })
      return alerts.length
    } catch (error) {
      console.error("Error getting unacknowledged count: ", error)
      return 0
    }
  }

  // Acknowledge an alert
  async acknowledgeAlert(alertId) {
    try {
      const alertRef = doc(db, "users", this.currentUser.uid, "alerts", alertId)

      await updateDoc(alertRef, {
        acknowledged: true,
        acknowledged_at: serverTimestamp(),
      })

      console.log("Alert acknowledged successfully")
    } catch (error) {
      console.error("Error acknowledging alert: ", error)
      throw error
    }
  }

  // Real-time listener for alerts
  subscribeToAlerts(callback, options = {}) {
    try {
      const alertsRef = this.getUserAlertsRef()

      let q = query(alertsRef, orderBy("created_at", "desc"))

      if (options.acknowledged !== undefined) {
        q = query(q, where("acknowledged", "==", options.acknowledged))
      }

      if (options.limit) {
        q = query(q, limit(options.limit))
      }

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const alerts = []
          querySnapshot.forEach((doc) => {
            alerts.push({
              id: doc.id,
              ...doc.data(),
              created_at: doc.data().created_at?.toDate(),
              acknowledged_at: doc.data().acknowledged_at?.toDate(),
            })
          })

          callback(alerts)
        },
        (error) => {
          console.error("Error in alerts subscription: ", error)
        },
      )

      this.unsubscribers.push(unsubscribe)
      return unsubscribe
    } catch (error) {
      console.error("Error subscribing to alerts: ", error)
      throw error
    }
  }

  // Clean up subscriptions
  unsubscribeAll() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe())
    this.unsubscribers = []
  }
}

export default new AlertsService()
