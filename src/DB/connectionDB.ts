import mongoose from "mongoose";
import { MONGO_URL } from "../config/config.service";

export const checkConnectionDB = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log(`Database connected successfully, ${MONGO_URL}`);
  } catch (error) {
    console.log(`Database connected failed, ${error}`);
  }
};