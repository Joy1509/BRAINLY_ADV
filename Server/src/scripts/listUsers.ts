import mongoose from 'mongoose';
import User from '../models/userModel';
import dotenv from 'dotenv';

dotenv.config();

async function listUsers() {
  await mongoose.connect(process.env.MONGO_URI || '');
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set in .env');
  const users = await User.find({}).lean();
  console.log(`\nFound ${users.length} users:\n`);
  users.forEach(u => console.log(JSON.stringify(u, null, 2)));
  process.exit(0);
}

listUsers().catch(err => { console.error(err); process.exit(1); });
