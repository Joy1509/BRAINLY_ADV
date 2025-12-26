import mongoose from 'mongoose';
import userContent from '../models/contentModel';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/secondbrain';

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    const res = await userContent.updateMany(
      { $or: [{ tags: { $exists: false } }, { tags: { $size: 0 } }], tag: { $exists: true, $ne: null } },
      [{ $set: { tags: ['$tag'] } }]
    );

    console.log('Migration result:', res);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed', err);
    process.exit(1);
  }
}

migrate();