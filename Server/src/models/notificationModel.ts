import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  sender: { type: String, enum: ['user', 'admin'], required: true },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['user', 'admin'], required: true },
  text: { type: String, required: true },
  reactions: [reactionSchema],
  createdAt: { type: Date, default: Date.now }
});

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  solvedAt: { type: Date, default: null },
  priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
  messages: [messageSchema],
  adminUnread: { type: Number, default: 1 },
  userUnread: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
