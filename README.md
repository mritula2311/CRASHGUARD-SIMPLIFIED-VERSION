# CrashGuard - AI-Powered Vehicle Crash Detection System

🚗 **Real-time crash detection and emergency alert system powered by AI and IoT sensors**

## Overview

CrashGuard is an intelligent vehicle safety system that uses machine learning to detect crashes in real-time and automatically send emergency alerts to designated contacts. The system combines sensor data analysis, GPS tracking, and automated notification services to provide immediate response to vehicle accidents.

## Features

### 🔍 **Real-time Crash Detection**
- Advanced DRQN (Deep Recurrent Q-Network) model for crash prediction
- Multi-sensor data analysis (accelerometer, gyroscope, GPS)
- Real-time risk assessment with confidence scoring
- Severity classification (Low, Medium, High, Critical)

### 📧 **Emergency Alert System**
- Automated email notifications to emergency contacts
- Professional SMTP integration with Gmail
- Customizable message templates for different emergency services
- Multiple recipient support (Family, Emergency Services, RTO, Hospital)

### 🗺️ **GPS Location Tracking**
- Real-time location monitoring
- Crash location mapping
- Accurate coordinates for emergency responders
- Visual map integration in dashboard

### 📊 **Dashboard Interface**
- Real-time sensor data visualization
- AI model predictions and confidence metrics
- Emergency contacts management
- System status monitoring
- Responsive design for desktop and mobile

### 🤖 **AI-Powered Features**
- Reinforcement learning model for crash prediction
- Sensor data pattern recognition
- Risk level assessment
- False positive reduction

## Technology Stack

### Frontend
- **Next.js 15.3.3** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Shadcn/ui** - Component library

### Backend & AI
- **Python** - Machine learning and email services
- **PyTorch** - Deep learning framework
- **DRQN Model** - Crash detection AI
- **Node.js** - Server-side operations

### Services & Integration
- **Gmail SMTP** - Email notifications
- **GPS Services** - Location tracking
- **Firebase** - Hosting and deployment
- **Git** - Version control

## Project Structure

```
CRASHGUARD-SIMPLIFIED-VERSION/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── actions.ts         # Server actions for email/alerts
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Main dashboard page
│   ├── components/            # React components
│   │   ├── ui/               # Shadcn UI components
│   │   ├── emergency-contacts-compact.tsx
│   │   ├── gps-location.tsx
│   │   └── reinforcement-model-panel.tsx
│   ├── services/             # Service layers
│   │   ├── emergency-contacts.ts
│   │   ├── gps-service.ts
│   │   ├── python-email-service.ts
│   │   └── reinforcement-model.ts
│   └── lib/                  # Utilities and types
│       ├── types.ts
│       └── utils.ts
├── python_email/             # Python email services
│   ├── crashguard_integration.py
│   ├── requirements.txt
│   ├── oauth_credentials.json
│   └── messages/            # Email templates
├── RENIFORCEMENT-MODEL/      # AI/ML models
│   ├── train_drqn.py
│   ├── run_realtime.py
│   ├── drqn.pt             # Trained model
│   └── data/               # Training data
└── docs/
    └── blueprint.md         # Technical documentation
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- Python 3.9+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mritula2311/CRASHGUARD-SIMPLIFIED-VERSION.git
   cd CRASHGUARD-SIMPLIFIED-VERSION
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   cd python_email
   pip install -r requirements.txt
   cd ..
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## Configuration

### Email Setup
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password for Gmail
3. Update `python_email/oauth_credentials.json` with your credentials
4. Configure emergency contacts in `src/services/emergency-contacts.ts`

### AI Model
The DRQN model is pre-trained and ready to use. For retraining:
```bash
cd RENIFORCEMENT-MODEL
python train_drqn.py
```

## Usage

### Dashboard Features
- **Real-time Monitoring**: View live sensor data and AI predictions
- **Emergency Contacts**: Manage emergency contact information
- **GPS Tracking**: Monitor vehicle location in real-time
- **System Status**: Check system health and connectivity

### Emergency Alerts
When a crash is detected:
1. AI model analyzes sensor data
2. Crash severity is determined
3. GPS location is captured
4. Emergency emails are sent automatically
5. Dashboard displays alert status

## Emergency Contacts

The system supports multiple emergency contact types:
- **Family**: Personal emergency contacts
- **Emergency Services**: 911, local emergency responders
- **Hospital**: Medical facilities
- **RTO**: Regional Transport Office
- **Insurance**: Vehicle insurance providers

## API Endpoints

- `POST /api/generate-alert` - Generate emergency alert
- `POST /api/send-email` - Send email notification
- `GET /api/sensor-data` - Get real-time sensor data
- `GET /api/gps-location` - Get current GPS coordinates

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Email: mritulashankar@gmail.com
- GitHub Issues: [Create an issue](https://github.com/mritula2311/CRASHGUARD-SIMPLIFIED-VERSION/issues)

## Acknowledgments

- AI/ML research community for crash detection algorithms
- Open source contributors
- Emergency services integration standards
- IoT sensor technology providers

---

**⚠️ Important**: This system is designed to assist in emergency situations but should not be the sole method of emergency communication. Always ensure multiple safety measures are in place.

**🚨 Emergency**: In case of actual emergency, call your local emergency services directly.
