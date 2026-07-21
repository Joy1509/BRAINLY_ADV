<div align="center">
  
# 🧠 Second Brain (Brainly Advanced)

**An intelligent, highly secure, full-stack AI ecosystem featuring biometric authentication and generative AI.**

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
[![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)](#)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](#)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
[![FastAPI](https://img.shields.io/badge/fastapi-109989?style=for-the-badge&logo=FASTAPI&logoColor=white)](#)

</div>

---

## 📖 Overview

**Second Brain** is a comprehensive full-stack application designed to serve as an intelligent, cross-platform digital assistant. It leverages advanced Artificial Intelligence to deliver a secure and highly interactive user experience. By combining traditional full-stack paradigms with cutting-edge **Machine Learning** models, the application provides an unparalleled level of security and utility.

## ✨ Key Features

### 🔐 Advanced Biometric Security
- **Facial Recognition Login:** Utilizes a custom Python computer vision pipeline to encode and authenticate users via their facial features in real-time.
- **Voice Biometrics:** Analyzes unique vocal frequencies and patterns, converting speech to secure authentication tokens.

### 🤖 Generative AI Chatbot
- **Context-Aware Assistance:** Integrated with powerful Large Language Models (like Groq) to provide an intelligent conversational interface.
- **Personalized Memory:** The chatbot retains context across sessions to act as a true "Second Brain."

### ⚡ Real-Time Ecosystem
- **Socket.IO Integration:** Instantaneous real-time bidirectional communication.
- **Live Notifications & Inbox:** Users receive real-time alerts, messages, and system updates directly in a dedicated Inbox Panel.

### 🛡️ Administrative Control
- **Admin Dashboard:** A fully-featured control panel for administrators to manage user access, oversee system metrics, and elevate privileges.
- **Role-Based Access Control (RBAC):** Strict middleware ensuring endpoints are protected from unauthorized access.

### 🌐 Cross-Platform Excellence
- **Expo & React Native Web:** A unified codebase that seamlessly compiles into a responsive Web Application, as well as native iOS and Android apps.
- **Polished UI/UX:** Features dynamic Card UIs, intuitive Modals, and robust state management.

---

## 🏗️ System Architecture

The application is built on a microservice-inspired architecture, divided into three distinct modules:

1. **Frontend (`/App`)**: The client-facing application built with React Native and Expo.
2. **Backend Server (`/Server`)**: A robust Node.js/Express server handling core business logic, WebSockets, and secure communication with the database (PostgreSQL hosted on Supabase).
3. **AI Microservices (`/model`)**: 
   - `face_auth`: A dedicated Python service handling facial encoding, matching, and anti-spoofing.
   - `voice_model`: A Python service responsible for audio processing, passphrase verification, and vocal pattern matching.

---

## 💻 Local Development Setup

To run this project locally on your machine, you must run the Database, the Backend, the AI Models, and the Frontend sequentially.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (v3.9 or higher)
- A [Supabase](https://supabase.com/) account for PostgreSQL hosting
- API Keys for your AI provider (e.g., Groq, Google Cloud)

### 1. Database Setup
1. Create a new project on **Supabase**.
2. Copy your PostgreSQL connection string (`DATABASE_URL`).

### 2. Backend Setup
```bash
# Navigate to the Server directory
cd Server

# Install Node dependencies
npm install

# Create a .env file
touch .env
```
Add the following to your `Server/.env` file:
```env
PORT=3001
DATABASE_URL=your_supabase_connection_string
JWT_SECRET=your_super_secret_jwt_key
FACE_AUTH_API_URL=http://127.0.0.1:8000
VOICE_AUTH_API_URL=http://127.0.0.1:8001
```
Start the server:
```bash
npm start
```

### 3. AI Models Setup
Open a **new terminal window** to start the Python services.

**For Face Authentication:**
```bash
cd model/face_auth
python -m venv venv
# Activate the virtual environment:
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python main.py # (or your specific start command)
```

**For Voice Authentication:**
```bash
cd model/voice_model
python -m venv venv
# Activate the virtual environment
pip install -r requirements.txt
python main.py
```

### 4. Frontend Setup
Open a **third terminal window**.
```bash
cd App

# Install dependencies
npm install

# Create a .env file
touch .env
```
Add the following to your `App/.env` file:
```env
EXPO_PUBLIC_API_URL=http://localhost:3001
```
Start the application:
```bash
npm run web
```
Your application will now be running locally at `http://localhost:8081`.

---

## 🚀 Production Deployment

- **Frontend:** Built and deployed as a static web application to **Netlify** using `npx expo export -p web`.
- **Backend:** Deployed as a Node Web Service on **Render**.
- **AI Models:** Deployed as Python Web Services on **Render** (or Hugging Face Spaces).

*(Make sure to update the environment variables on Render and Netlify with their respective live URLs once deployed).*

---

## 🔒 Security Guidelines
- **Do not commit `.env` files.** The `.gitignore` is pre-configured to ignore them.
- Ensure all API keys are kept secret. The repository utilizes GitHub Secret Scanning to prevent accidental exposure of cloud credentials.

<div align="center">
  <i>Built with ❤️ for a smarter, more secure future.</i>
</div>
