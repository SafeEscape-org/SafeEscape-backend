# 🛡️ SafeEscape Backend - Emergency Management System

![SafeEscape](https://img.shields.io/badge/SafeEscape-Emergency_Management-orange)
![Node.js](https://img.shields.io/badge/Node.js-v16+-green)
![Express](https://img.shields.io/badge/Express-v4.17+-blue)
![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.5+-brightgreen)
![Cloud Run](https://img.shields.io/badge/Cloud_Run-Deployed-blue)

## 🌟 Overview

SafeEscape is a comprehensive emergency management platform designed to provide real-time alerts, intelligent evacuation routes, and AI-powered assistance during disasters in India. The system integrates multiple data sources, AI capabilities, and location-based services to deliver critical information when it matters most.

## 🚨 Key Features

### **Essential Functionalities**
1. **Real-Time Alerts**
   - Integrates with IMD (Indian Meteorological Department) and NDMA (National Disaster Management Authority) APIs for earthquake, cyclone, flood, and extreme weather alerts.
   - Push notifications in multiple languages (Hindi, English, regional languages).
   - **Multi-channel alerts** via Socket.IO, PubSub, and Firebase
   - **Geographically targeted notifications** based on user location
   - **Priority-based delivery** with severity classification

2. **Evacuation Routes & Shelters**
   - GPS-based mapping of nearest shelters, hospitals, and police stations using Google Maps API.
   - Offline mode for areas with limited connectivity.
   - **Smart evacuation routing** with Google Maps API
   - **Safe zone identification** based on disaster type

3. **First Aid & Emergency Procedures**
   - Offline-accessible step-by-step first aid guides (e.g., CPR, bleeding control).
   - AI chatbot for quick emergency responses.

4. **SOS & Emergency Contacts**
   - One-tap SOS button to notify emergency contacts and authorities.
   - Integration with 112 India Emergency Helpline.

5. **Community Reporting & Help Requests**
   - Users can report incidents (fires, landslides, accidents) with images/videos.
   - Crowdsource help requests & volunteer coordination.

### **🧠 AI-Powered Services**
- **Intelligent evacuation optimization** using Vertex AI
- **Emergency response chatbot** with contextual awareness
- **Disaster risk prediction** for proactive preparedness

### **📱 User Communication**
- **Real-time bidirectional communication** with Socket.IO
- **Room-based targeting** for location-specific messaging
- **Multi-device synchronization** with Firebase


### **🏗️ Architecture**

┌─────────────────────────────────────────────────────────┐
│                SafeEscape Backend System                │
└────────────────┬──────────────────────┬─────────────────┘
                 │                      │                  
┌────────────────▼────┐    ┌────────────▼────────────────┐
│   API Services      │    │    Real-time Services       │
│                     │    │                             │
│  ┌───────────────┐  │    │  ┌─────────────────────┐    │
│  │  Emergency    │  │    │  │     Socket.IO       │    │
│  │  Controllers  │  │    │  │       Server        │    │
│  └───────┬───────┘  │    │  └──────────┬──────────┘    │
│          │          │    │             │               │
│  ┌───────▼───────┐  │    │  ┌──────────▼──────────┐    │
│  │  Evacuation   │  │    │  │     PubSub          │    │
│  │   Services    │  │    │  │     Service         │    │
│  └───────┬───────┘  │    │  └──────────┬──────────┘    │
└──────────┼──────────┘    └─────────────┼────────────────┘
           │                             │                 
┌──────────▼─────────────────────────────▼────────────────┐
│                   Vertex AI Layer                       │
│                                                         │
│  ┌───────────────┐   ┌──────────────┐  ┌─────────────┐  │
│  │   Emergency   │   │  Evacuation  │  │  Disaster   │  │
│  │   Chatbot     │   │  Optimizer   │  │  Prediction │  │
│  └───────────────┘   └──────────────┘  └─────────────┘  │
└────────────────────────────┬─────────────────────────────┘
                             │                              
┌────────────────────────────▼─────────────────────────────┐
│                 External Services Layer                  │
│                                                          │
│  ┌───────────┐  ┌────────────┐  ┌───────────────┐        │
│  │  Weather  │  │ Earthquake │  │ Google Maps   │        │
│  │  Service  │  │  Service   │  │    API        │        │
│  └───────────┘  └────────────┘  └───────────────┘        │
└─────────────────────────────────────────────────────────┘

## 🛠️ Technology Stack

**Runtime Environment:** Node.js
**Web Framework:** Express.js
**Real-time Communication:** Socket.IO
**Message Broker:** Google Cloud PubSub
**Database & Authentication:** Firebase
**AI/ML Processing:** Google Vertex AI
**Maps & Geocoding:** Google Maps API
**Deployment:** Google Cloud Run
**Monitoring:** Google Cloud Monitoring

## 🔧 Installation & Setup

**Clone the repository**
```bash
git clone https://github.com/SafeEscape-org/SafeEscape-backend.git
cd SafeEscape-backend
```

**Install dependencies**
```bash
npm install
```

**Configure environment**
```bash
cp .env.example .env
```

**Set up Firebase credentials**
- Download your Firebase service account JSON
- Place it in firebase-serviceAccount.json

**Start the development server**
```bash
npm run dev
```

## 🔄 CI/CD Pipeline
The SafeEscape backend uses GitHub Actions for CI/CD:

- Automated testing on push and PR
- Security scanning to detect vulnerabilities
- Continuous deployment to Google Cloud Run

## 👥 Contributing
- Fork the repository
- Create feature branch (git checkout -b feature/amazing-feature)
- Commit changes (git commit -m 'Add amazing feature')
- Push to branch (git push origin feature/amazing-feature)
- Open a Pull Request

## 📄 License
SafeEscape Custom License
Copyright © 2025 SafeEscape Team

This software and associated documentation files (the "SafeEscape Emergency Management System") is proprietary software. All rights are reserved by the SafeEscape Team


### ⭐ Star this repository if you find it useful!
