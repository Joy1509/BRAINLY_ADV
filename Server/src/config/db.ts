import mongoose from "mongoose";

const dbConnect = async () => {
  if (!process.env.DBurl) {
    throw new Error("DBurl is not defined in environment variables");
  }

  await mongoose.connect(process.env.DBurl, {
    dbName: "SecondBrainly",
  });

  console.log("Connected Successfully");
};

export default dbConnect;
