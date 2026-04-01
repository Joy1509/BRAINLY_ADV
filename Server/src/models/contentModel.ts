import mongoose, {Types} from "mongoose"

const contentSchema = new mongoose.Schema({
  link:{type: String,require: false},
  contentType: {type: String, require: true},
  title: {type: String, require: true},
  text: { type: String, default: "" },
  tag: {type: String, require: false},
  tags: { type: [String], default: [] },
  summary: { type: String, default: "" },
  // Voice note fields
  audioUrl: { type: String, default: "" },
  audioDuration: { type: Number, default: 0 },
  metadata: {
    channelName: { type: String, default: "" },
    duration: { type: String, default: "" },
    viewCount: { type: String, default: "" },
    publishedAt: { type: String, default: "" }
  },
  userId: {type: Types.ObjectId, ref: 'User', require: true}
}, { timestamps: true })

const userContent = mongoose.model("content",contentSchema);
export default userContent;