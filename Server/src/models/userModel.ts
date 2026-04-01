import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, default: "" },
  provider: { type: String, default: "local" },
  providerId: { type: String, default: "" },
  avatar: { type: String, default: "" }
}, { timestamps: true });

const user = mongoose.model("User", userSchema);
export default user;
