# AI-Powered-IoT-Health-Monitor

A comprehensive AI-powered health monitoring application that provides real-time vital sign tracking, predictive health analysis, and personalized health insights using advanced machine learning.

## 🏥 Problem Statement

Healthcare systems worldwide face a critical gap in continuous patient monitoring and early intervention, leading to preventable hospitalizations, delayed diagnoses, and poor health outcomes. Balasco bridges this gap by transforming smartphones into intelligent health monitoring devices, making preventive healthcare accessible to everyone.

## ✨ Features

### 🔄 Real-Time Health Monitoring
- **Live Vital Signs**: Continuous temperature and heart rate tracking
- **Automatic Data Storage**: Historical data collection for trend analysis
- **Real-Time Dashboard**: Instant health status overview

### 🤖 AI-Powered Predictions
- **DeepSeek LLM Integration**: Advanced health analysis using free AI models
- **7-Day Health Forecasts**: Predictive health trends with confidence scores
- **Personalized Insights**: Context-aware recommendations based on age, gender, and health patterns

### 📊 Advanced Analytics
- **20-Day History Tracking**: Comprehensive historical health data visualization
- **Dynamic Graphs**: Adaptive charts based on available metrics
- **Trend Analysis**: Intelligent pattern recognition in health data

### 💬 Health Communication
- **Direct Healthcare Contact**: Emergency and routine healthcare professional communication
- **Daily Health Tips**: Categorized advice for nutrition, exercise, and mental health
- **Medical Guidance**: "When to seek care" recommendations

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Expo CLI
- Firebase account
- OpenRouter API account (for AI features)

### Installation

1. **Clone the repository**
\`\`\`bash
git clone <your-repo-url>
cd balasco-health-app
\`\`\`

2. **Install dependencies**
\`\`\`bash
npm install
\`\`\`

3. **Configure Firebase**
   - Create a Firebase project
   - Enable Firestore Database
   - Update `config/firebase.js` with your Firebase configuration

4. **Configure AI Service**
   - Sign up for OpenRouter API
   - Update the API key in `services/llmPredictionService.js`:
\`\`\`javascript
const OPENROUTER_API_KEY = "your-api-key-here";
\`\`\`

5. **Start the development server**
\`\`\`bash
expo start
\`\`\`

## 🛠️ Technology Stack

- **Frontend**: React Native with Expo
- **Database**: Firebase Firestore
- **AI/ML**: DeepSeek LLM via OpenRouter API
- **Charts**: React Native Chart Kit
- **Authentication**: Firebase Auth
- **Real-time Updates**: Firebase Real-time Database

## 📱 Usage

### Dashboard
- View current vital signs
- Access real-time health metrics
- Navigate to different app sections

### Metrics Tracking
- Monitor temperature and heart rate trends
- View historical data graphs
- Access 20-day health history

### AI Health Predictions
- Get intelligent health forecasts
- Receive personalized recommendations
- View detailed health risk assessments

### Health Communication
- Contact healthcare professionals
- Access emergency services
- Get daily health tips

## 🔧 Configuration

### Firebase Setup
1. Create a new Firebase project
2. Enable Firestore and Realtime Database
3. Set up authentication (optional)
4. Update `config/firebase.js` with your credentials

### AI Service Configuration
The app uses DeepSeek LLM through OpenRouter API:
\`\`\`javascript
// In services/llmPredictionService.js
const OPENROUTER_API_KEY = "sk-or-v1-your-key-here";
const MODEL = "deepseek/deepseek-chat-v3.1:free";
\`\`\`

## 📊 Data Structure

### Health Metrics
\`\`\`javascript
{
  userId: "user123",
  timestamp: "2024-01-15T10:30:00Z",
  temperature: 36.5,
  heartRate: 72,
  metadata: {
    age: 30,
    gender: "male"
  }
}
\`\`\`

### AI Predictions
\`\`\`javascript
{
  overallHealthScore: 85,
  riskLevel: "low",
  forecast: [...],
  recommendations: [...],
  confidence: 0.92
}
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation updates
- `style:` - Code formatting
- `refactor:` - Code restructuring
- `test:` - Adding tests

## 🔒 Privacy & Security

- All health data is encrypted and stored securely in Firebase
- AI predictions are processed through secure API endpoints
- No personal health information is shared with third parties
- Users maintain full control over their data

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Contact the development team
- Check the documentation wiki

## 🚀 Roadmap

- [ ] Integration with wearable devices
- [ ] Advanced AI models for specialized conditions
- [ ] Telemedicine video consultations
- [ ] Multi-language support
- [ ] iOS and Android native apps

---

**Made with ❤️ for better healthcare accessibility**
