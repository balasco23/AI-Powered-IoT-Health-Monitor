class HealthTipsService {
  constructor() {
    this.tips = [
      {
        id: 1,
        title: "Stay Hydrated",
        tip: "Drink at least 8 glasses of water daily to maintain energy levels and support organ function.",
        icon: "water-drop",
        category: "hydration",
      },
      {
        id: 2,
        title: "Get Moving",
        tip: "Take a 10-minute walk every hour to boost circulation and reduce stress.",
        icon: "directions-walk",
        category: "exercise",
      },
      {
        id: 3,
        title: "Deep Breathing",
        tip: "Practice deep breathing for 5 minutes to reduce stress and lower blood pressure.",
        icon: "air",
        category: "mental-health",
      },
      {
        id: 4,
        title: "Healthy Sleep",
        tip: "Aim for 7-9 hours of quality sleep each night for optimal health and recovery.",
        icon: "bedtime",
        category: "sleep",
      },
      {
        id: 5,
        title: "Eat Colorfully",
        tip: "Include fruits and vegetables of different colors in your meals for varied nutrients.",
        icon: "restaurant",
        category: "nutrition",
      },
      {
        id: 6,
        title: "Stretch Daily",
        tip: "Spend 10 minutes stretching to improve flexibility and reduce muscle tension.",
        icon: "self-improvement",
        category: "exercise",
      },
      {
        id: 7,
        title: "Mindful Eating",
        tip: "Eat slowly and mindfully to improve digestion and recognize hunger cues.",
        icon: "psychology",
        category: "nutrition",
      },
      {
        id: 8,
        title: "Social Connection",
        tip: "Connect with friends or family today - social bonds are vital for mental health.",
        icon: "people",
        category: "mental-health",
      },
      {
        id: 9,
        title: "Limit Screen Time",
        tip: "Take regular breaks from screens to reduce eye strain and improve sleep quality.",
        icon: "visibility-off",
        category: "lifestyle",
      },
      {
        id: 10,
        title: "Practice Gratitude",
        tip: "Write down three things you're grateful for to boost mood and mental well-being.",
        icon: "favorite",
        category: "mental-health",
      },
      {
        id: 11,
        title: "Healthy Snacking",
        tip: "Choose nuts, fruits, or yogurt instead of processed snacks for sustained energy.",
        icon: "local-dining",
        category: "nutrition",
      },
      {
        id: 12,
        title: "Fresh Air",
        tip: "Spend at least 15 minutes outdoors daily for vitamin D and improved mood.",
        icon: "wb-sunny",
        category: "lifestyle",
      },
      {
        id: 13,
        title: "Hand Hygiene",
        tip: "Wash your hands frequently with soap for at least 20 seconds to prevent illness.",
        icon: "wash",
        category: "hygiene",
      },
      {
        id: 14,
        title: "Posture Check",
        tip: "Maintain good posture while sitting and standing to prevent back pain.",
        icon: "accessibility",
        category: "lifestyle",
      },
      {
        id: 15,
        title: "Limit Caffeine",
        tip: "Avoid caffeine 6 hours before bedtime to improve sleep quality.",
        icon: "local-cafe",
        category: "sleep",
      },
      {
        id: 16,
        title: "Portion Control",
        tip: "Use smaller plates to naturally reduce portion sizes and prevent overeating.",
        icon: "restaurant-menu",
        category: "nutrition",
      },
      {
        id: 17,
        title: "Regular Check-ups",
        tip: "Schedule regular health check-ups to catch potential issues early.",
        icon: "medical-services",
        category: "healthcare",
      },
      {
        id: 18,
        title: "Stress Management",
        tip: "Try meditation or yoga for 10 minutes to manage daily stress effectively.",
        icon: "spa",
        category: "mental-health",
      },
      {
        id: 19,
        title: "Healthy Fats",
        tip: "Include omega-3 rich foods like fish, nuts, and seeds in your diet.",
        icon: "set-meal",
        category: "nutrition",
      },
      {
        id: 20,
        title: "Stay Active",
        tip: "Take the stairs instead of the elevator to add more movement to your day.",
        icon: "stairs",
        category: "exercise",
      },
      {
        id: 21,
        title: "Digital Detox",
        tip: "Have a phone-free hour before bed to improve sleep and reduce anxiety.",
        icon: "phone-disabled",
        category: "mental-health",
      },
      {
        id: 22,
        title: "Fiber Intake",
        tip: "Include whole grains and legumes in your diet for better digestive health.",
        icon: "grass",
        category: "nutrition",
      },
      {
        id: 23,
        title: "Temperature Control",
        tip: "Keep your bedroom cool (60-67°F) for optimal sleep quality.",
        icon: "ac-unit",
        category: "sleep",
      },
      {
        id: 24,
        title: "Laugh More",
        tip: "Watch something funny or spend time with people who make you laugh.",
        icon: "sentiment-very-satisfied",
        category: "mental-health",
      },
      {
        id: 25,
        title: "Meal Prep",
        tip: "Prepare healthy meals in advance to avoid unhealthy food choices.",
        icon: "kitchen",
        category: "nutrition",
      },
      {
        id: 26,
        title: "Eye Care",
        tip: "Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.",
        icon: "visibility",
        category: "lifestyle",
      },
      {
        id: 27,
        title: "Heart Health",
        tip: "Include cardio exercises like walking, swimming, or cycling in your routine.",
        icon: "favorite",
        category: "exercise",
      },
      {
        id: 28,
        title: "Dental Care",
        tip: "Brush twice daily and floss regularly for optimal oral health.",
        icon: "clean-hands",
        category: "hygiene",
      },
      {
        id: 29,
        title: "Vitamin D",
        tip: "Get 10-15 minutes of sunlight daily or consider vitamin D supplements.",
        icon: "wb-sunny",
        category: "nutrition",
      },
      {
        id: 30,
        title: "Mental Breaks",
        tip: "Take short mental breaks throughout the day to maintain focus and productivity.",
        icon: "psychology",
        category: "mental-health",
      },
      {
        id: 31,
        title: "Stay Consistent",
        tip: "Small, consistent healthy choices compound over time for lasting health benefits.",
        icon: "trending-up",
        category: "lifestyle",
      },
    ]
  }

  getDailyTip() {
    // Get current date and use it to select a tip
    const today = new Date()
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24)
    const tipIndex = dayOfYear % this.tips.length
    return this.tips[tipIndex]
  }

  getTipByCategory(category) {
    return this.tips.filter((tip) => tip.category === category)
  }

  getRandomTip() {
    const randomIndex = Math.floor(Math.random() * this.tips.length)
    return this.tips[randomIndex]
  }

  getAllTips() {
    return this.tips
  }
}

export default new HealthTipsService()
