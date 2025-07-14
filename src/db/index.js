import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    // try console logging this --  will give a good idea on data fetched from the db
    // console.log(
    //   `\n MongoDB connected ! DB HOST: ${connectionInstance}`
    // );

    // to check if the db is connected to correct mongodb or not
    console.log(
      `\n MongoDB connected ! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MONGODB connection error ", error);

    process.exit(1); // exit the process with an error status code
  }
};

export default connectDB;
