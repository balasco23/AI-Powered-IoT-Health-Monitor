import { collection, addDoc, getDocs, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore"
import { db, auth } from "../config/firebase"

class CommunicationsService {
  constructor() {
    this.currentUser = null
    this.unsubscribers = []

    auth.onAuthStateChanged((user) => {
      this.currentUser = user
    })
  }

  // Get user's communications collection reference
  getUserCommunicationsRef() {
    if (!this.currentUser) {
      throw new Error("User not authenticated")
    }
    return collection(db, "users", this.currentUser.uid, "communications")
  }

  // Send message to doctor
  async sendMessage(messageData) {
    try {
      const communicationsRef = this.getUserCommunicationsRef()

      const message = {
        message: messageData.message,
        is_urgent: messageData.is_urgent || false,
        status: "sent",
        message_type: messageData.message_type || "general", // general, symptom, emergency
        attachments: messageData.attachments || [],
        created_at: serverTimestamp(),
        date_string: new Date().toISOString().split("T")[0],
      }

      const docRef = await addDoc(communicationsRef, message)

      // If urgent, you could trigger push notifications here
      if (message.is_urgent) {
        await this.handleUrgentMessage(message)
      }

      console.log("Message sent with ID: ", docRef.id)
      return { id: docRef.id, ...message }
    } catch (error) {
      console.error("Error sending message: ", error)
      throw error
    }
  }

  // Get communications history
  async getCommunications(options = {}) {
    try {
      const communicationsRef = this.getUserCommunicationsRef()

      let q = query(communicationsRef, orderBy("created_at", "desc"))

      if (options.limit) {
        q = query(q, limit(options.limit))
      }

      const querySnapshot = await getDocs(q)
      const communications = []

      querySnapshot.forEach((doc) => {
        communications.push({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate(),
          responded_at: doc.data().responded_at?.toDate(),
        })
      })

      return communications
    } catch (error) {
      console.error("Error getting communications: ", error)
      throw error
    }
  }

  // Handle urgent messages (placeholder for notification logic)
  async handleUrgentMessage(message) {
    try {
      // Here you would implement:
      // - Push notifications to healthcare providers
      // - Email alerts
      // - SMS notifications
      // - Integration with hospital systems

      console.log("Urgent message received:", message.message)

      // Example: Log to a separate urgent messages collection
      const urgentRef = collection(db, "urgent_messages")
      await addDoc(urgentRef, {
        user_id: this.currentUser.uid,
        user_email: this.currentUser.email,
        message: message.message,
        created_at: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error handling urgent message: ", error)
    }
  }

  // Real-time listener for communications
  subscribeToCommunications(callback, options = {}) {
    try {
      const communicationsRef = this.getUserCommunicationsRef()

      let q = query(communicationsRef, orderBy("created_at", "desc"))

      if (options.limit) {
        q = query(q, limit(options.limit))
      }

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const communications = []
          querySnapshot.forEach((doc) => {
            communications.push({
              id: doc.id,
              ...doc.data(),
              created_at: doc.data().created_at?.toDate(),
              responded_at: doc.data().responded_at?.toDate(),
            })
          })

          callback(communications)
        },
        (error) => {
          console.error("Error in communications subscription: ", error)
        },
      )

      this.unsubscribers.push(unsubscribe)
      return unsubscribe
    } catch (error) {
      console.error("Error subscribing to communications: ", error)
      throw error
    }
  }

  // Clean up subscriptions
  unsubscribeAll() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe())
    this.unsubscribers = []
  }
}

export default new CommunicationsService()
