import mongoose from "mongoose";

const faceAuthSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  faceEmbedding: { 
    type: [Number], 
    required: true,
    validate: {
      validator: function(arr: number[]) {
        return arr.length > 100; // MediaPipe produces ~1400+ dimensions
      },
      message: 'Face embedding must have sufficient dimensions'
    }
  },
  embeddingVersion: { 
    type: String, 
    default: "facenet_v1" 
  },
  confidence: { 
    type: Number, 
    required: true,
    min: 0,
    max: 1 
  },
  registeredAt: { 
    type: Date, 
    default: Date.now 
  },
  lastUsed: { 
    type: Date, 
    default: Date.now 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true,
  collection: 'faceauth'
});

// Index for faster user lookups
faceAuthSchema.index({ userId: 1 });
faceAuthSchema.index({ isActive: 1 });

const FaceAuth = mongoose.model("FaceAuth", faceAuthSchema);
export default FaceAuth;