# Second Brain (Brainly Advanced) 🧠

An advanced AI-powered full-stack application featuring Voice Authentication, Face Authentication, an intelligent GenAI Chatbot, and real-time features.

## 🌟 Features

- **Biometric Authentication:** Highly secure login using Face Recognition and Voice Biometrics.
- **GenAI Chatbot:** Intelligent, context-aware chatbot powered by advanced LLMs (Groq).
- **Admin Dashboard:** Comprehensive dashboard for managing users and monitoring system activity.
- **Real-time Communication:** Powered by Socket.IO for instant notifications and inbox updates.
- **OAuth Integration:** Support for seamless third-party social logins.
- **Cross-Platform Frontend:** Built with Expo (React Native Web) for seamless web and mobile support.

## 🏗️ Architecture

The project is divided into three distinct microservices:

1. **Frontend (`/App`)**: The user interface built with Expo and React Native Web.
2. **Backend Server (`/Server`)**: A Node.js & Express server handling business logic, WebSockets, and database operations (PostgreSQL via Supabase).
3. **AI Models (`/model`)**: 
   - `face_auth`: A Python API handling facial encoding and recognition.
   - `voice_model`: A Python API for processing audio samples, converting speech, and authenticating voice patterns.

---

## 🚀 Deployment Guide

This application is designed to be deployed across Netlify and Render.

### 1. Deploy the AI Models (Render)
Deploy your Python models as Web Services so your Node backend can communicate with them.
- **Environment:** Python 3
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** (Varies based on FastAPI/Flask implementation, e.g., `uvicorn api:app --host 0.0.0.0 --port $PORT`)

### 2. Deploy the Backend (Render)
Deploy the `/Server` folder as a Node.js Web Service.
- **Environment:** Node.js
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Required Environment Variables:**
  - `DATABASE_URL`: Your Supabase PostgreSQL connection string.
  - API Keys: Your Groq API Key, GCP Credentials, and JWT Secrets.
  - Model URLs: Links to your deployed Face and Voice models.

### 3. Deploy the Frontend (Netlify)
Deploy the `/App` folder to Netlify as a static web application.
- **Build Command:** `npx expo export -p web`
- **Publish Directory:** `dist`
- **Required Environment Variables:**
  - `EXPO_PUBLIC_API_URL`: The live URL of your Render backend.

---

## 💻 Local Development Setup

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- A PostgreSQL database (or Supabase project)

### 1. Start the Models
```bash
cd model/voice_model
python -m venv venv
source venv/bin/activate  # (On Windows: venv\Scripts\activate)
pip install -r requirements.txt
python api.py
```

### 2. Start the Backend
```bash
cd Server
npm install
npm start
```

### 3. Start the Frontend
```bash
cd App
npm install
npm run web
```

---

## 🔒 Security Note
**Never commit your `.env` files.** This repository uses `.gitignore` to prevent virtual environments (`venv/`) and secrets from being pushed to the public. If you accidentally leak an API key, GitHub Secret Scanning will block the push to protect your accounts.
