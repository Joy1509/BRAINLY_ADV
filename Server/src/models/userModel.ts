import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, default: "" },
  provider: { type: String, default: "local" },
  providerId: { type: String, default: "" },
  avatar: { type: String, default: "" },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  
  // Face authentication fields
  faceRegistered: { type: Boolean, default: false },
  faceRegisteredAt: { type: Date, default: null },
  
  // Voice authentication fields
  voiceRegistered: { type: Boolean, default: false },
  voiceRegisteredAt: { type: Date, default: null },
  
  lastLogin: { type: Date, default: null },
  lastLoginMethod: { type: String, default: "email" } // "email", "face", "voice", "google", "github"
}, { timestamps: true });

const user = mongoose.model("User", userSchema);
export default user;
