import mongoose from "mongoose";

const voiceAuthSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  username: { type: String, required: true },
  passphrase: { type: String, required: true },
  encryptedPassphrase: { 
    type: String, 
    required: true 
  },
  salt: { 
    type: String, 
    required: true 
  },
  voiceSamples: {
    type: Number,
    default: 0
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  totalLoginAttempts: { 
    type: Number, 
    default: 0 
  },
  successfulLogins: { 
    type: Number, 
    default: 0 
  },
  lastSuccessfulLogin: { 
    type: Date, 
    default: null 
  },
  lastAttempt: { 
    type: Date, 
    default: Date.now 
  },
  registeredAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// userId already has unique: true, so it creates an index automatically
voiceAuthSchema.index({ username: 1 });

const VoiceAuth = mongoose.model("VoiceAuth", voiceAuthSchema);
export default VoiceAuth;
