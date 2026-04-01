import mongoose from "mongoose";

const shareSchema = new mongoose.Schema({
  shareId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 } // 1 hour
});

const Share = mongoose.model("Share", shareSchema);
export default Share;