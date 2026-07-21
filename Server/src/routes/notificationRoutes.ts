import { Router, Response } from 'express';
import Notification from '../models/notificationModel';
import { isAuthenticated, AuthRequest } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';
import { getIO } from '../socket';

const router = Router();

// User: create new notification (escalate from chatbot)
router.post('/create', isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { subject, message, priority } = req.body;
    const userId = req.userID as string;
    const username = (req as any).username;

    // get username from DB if not in token
    const User = (await import('../models/userModel')).default;
    const user = await User.findById(userId).select('username');
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }

    const notification = await Notification.create({
      userId,
      username: user.username,
      subject,
      priority: priority || 'normal',
      messages: [{ sender: 'user', text: message }],
      adminUnread: 1,
      userUnread: 0,
    });

    getIO().to('admins').emit('new_notification', notification);

    res.status(201).json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create notification' });
  }
});

// User: get their own notifications
router.get('/mine', isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await Notification.find({ userId: req.userID }).sort({ updatedAt: -1 });
    res.json({ success: true, notifications });
  } catch {
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// User: mark their notifications as read
router.patch('/mine/read', isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany({ userId: req.userID }, { userUnread: 0 });
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Failed to mark read' });
  }
});

// User: reply in their thread
router.post('/:id/reply', isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userID },
      { $push: { messages: { sender: 'user', text } }, $inc: { adminUnread: 1 } },
      { new: true }
    );
    if (!notification) { res.status(404).json({ message: 'Not found' }); return; }

    getIO().to('admins').emit('notification_reply', notification);
    getIO().to(`user_${notification.userId}`).emit('notification_updated', notification);

    res.json({ success: true, notification });
  } catch {
    res.status(500).json({ message: 'Failed to reply' });
  }
});

// Admin: get all notifications
router.get('/all', isAuthenticated, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const notifications = await Notification.find().sort({ updatedAt: -1 });
    res.json({ success: true, notifications });
  } catch {
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// Admin: mark all as read
router.patch('/all/read', isAuthenticated, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany({}, { adminUnread: 0 });
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Failed to mark read' });
  }
});

// Admin: reply to a notification
router.post('/:id/admin-reply', isAuthenticated, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { $push: { messages: { sender: 'admin', text } }, $inc: { userUnread: 1 }, adminUnread: 0 },
      { new: true }
    );
    if (!notification) { res.status(404).json({ message: 'Not found' }); return; }

    getIO().to(`user_${notification.userId}`).emit('notification_updated', notification);
    getIO().to('admins').emit('notification_updated', notification);

    res.json({ success: true, notification });
  } catch {
    res.status(500).json({ message: 'Failed to reply' });
  }
});

// User or Admin: toggle reaction on a message
router.patch('/:id/react', isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { msgIndex, emoji } = req.body;
    const role = req.userRole as 'user' | 'admin';

    const notification = await Notification.findById(req.params.id);
    if (!notification) { res.status(404).json({ message: 'Not found' }); return; }

    const msg = notification.messages[msgIndex];
    if (!msg) { res.status(400).json({ message: 'Invalid message index' }); return; }

    const reactions = (msg as any).reactions as { emoji: string; sender: string }[];
    const existing = reactions.findIndex(r => r.sender === role && r.emoji === emoji);

    if (existing >= 0) {
      // toggle off
      reactions.splice(existing, 1);
    } else {
      // remove any previous reaction from this sender, then add new
      const prev = reactions.findIndex(r => r.sender === role);
      if (prev >= 0) reactions.splice(prev, 1);
      reactions.push({ emoji, sender: role });
    }

    await notification.save();

    getIO().to(`user_${notification.userId}`).emit('notification_updated', notification);
    getIO().to('admins').emit('notification_updated', notification);

    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ message: 'Failed to react' });
  }
});

// User or Admin: mark as solved
router.patch('/:id/solve', isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.userRole as string;
    const query = role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, userId: req.userID };
    const notification = await Notification.findOneAndUpdate(
      query,
      { status: 'closed', solvedAt: new Date() },
      { new: true }
    );
    if (!notification) { res.status(404).json({ message: 'Not found' }); return; }
    getIO().to(`user_${notification.userId}`).emit('notification_updated', notification);
    getIO().to('admins').emit('notification_updated', notification);
    res.json({ success: true, notification });
  } catch {
    res.status(500).json({ message: 'Failed to mark solved' });
  }
});

// User or Admin: delete a notification
router.delete('/:id', isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.userRole as string;
    const query = role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, userId: req.userID };
    const notification = await Notification.findOneAndDelete(query);
    if (!notification) { res.status(404).json({ message: 'Not found' }); return; }
    getIO().to(`user_${notification.userId}`).emit('notification_deleted', req.params.id);
    getIO().to('admins').emit('notification_deleted', req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Failed to delete' });
  }
});

// Auto-delete solved notifications older than 24hrs (runs every hour)
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await Notification.deleteMany({ status: 'closed', solvedAt: { $lte: cutoff } });
  } catch (err) {
    console.error('Auto-delete failed:', err);
  }
}, 60 * 60 * 1000);

export default router;
