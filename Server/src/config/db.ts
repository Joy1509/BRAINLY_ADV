import mongoose from "mongoose";

const dbConnect = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined in environment variables');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected Successfully to MongoDB");
  } catch (error) {
    console.error('MongoDB connection error:', error instanceof Error ? error.message : error);
  }
};

export default dbConnect;
