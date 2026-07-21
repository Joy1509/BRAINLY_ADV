import express from 'express';
import { isAuthenticated } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';
import User from '../models/userModel';

const router = express.Router();

// Admin dashboard - placeholder
router.get('/dashboard', isAuthenticated, requireAdmin, async (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to admin dashboard',
    data: {
      totalUsers: await User.countDocuments(),
      adminUsers: await User.countDocuments({ role: 'admin' }),
      regularUsers: await User.countDocuments({ role: 'user' })
    }
  });
});

// Get all users - admin only
router.get('/users', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Update user role - admin only
router.patch('/users/:userId/role', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
});

export default router;