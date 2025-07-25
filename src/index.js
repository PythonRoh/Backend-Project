// require("dotenv").config({ path: './env' });
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

// load environment variables from.env file
dotenv.config({
  // path: ".env", // path to the.env file
  path: "./.env", // path to the.env file
});

// 1st METHOD : do a separate file for db connect
connectDB() // this returns a promise, so handle it with "then" & "catch"
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server running at port : ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("MONGO dB connection failed !!", error);
  });

/*
// 2nd METHOD : DO EVERYTHING IN index.js
import express from "express";

const app = express();
// iffy used to quickly execute the function to connect to db
(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`); // connect to db via mongodb URI
    app.on("error", (error) => {
      console.log("ERROR: ", error);
      throw error;
    });

    app.listen(process.env.PORT, () => {
      console.log(`App is listening on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("ERROR: ", error);
    throw error; // use the correct variable name
  }
})();
*/
