import mongoose, {Types} from "mongoose"

const contentSchema = new mongoose.Schema({
  link:{type: String,require: true},
  contentType: {type: String, require: true},
  title: {type: String, require: true},
  // legacy single tag kept for backward compatibility
  tag: {type: String, require: false},
  // store all tags as an array of strings
  tags: { type: [String], default: [] },
  // auto-generated link summary (optional)
  summary: { type: String, default: "" },
  userId: {type: Types.ObjectId, ref: 'User', require: true}
})

const userContent = mongoose.model("content",contentSchema);
export default userContent;