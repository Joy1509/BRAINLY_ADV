import mongoose from 'mongoose';
import User from '../models/userModel';
import dotenv from 'dotenv';

dotenv.config();

async function promoteToAdmin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || '');
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set in .env');
    
    const email = process.argv[2];
    
    if (!email) {
      console.log('Usage: npm run promote-admin <email>');
      process.exit(1);
    }
    
    const user = await User.findOneAndUpdate(
      { $or: [{ email }, { username: email }] },
      { role: 'admin' },
      { new: true }
    );
    
    if (!user) {
      console.log(`User with email/username ${email} not found`);
      process.exit(1);
    }
    
    console.log(`Successfully promoted ${user.username} to admin`);
    process.exit(0);
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    process.exit(1);
  }
}

promoteToAdmin();