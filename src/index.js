import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

// Load environment variables
dotenv.config({ path: "./.env" });

// Start server after DB connects
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 8000;

    app.listen(PORT, () => {
      console.log(`✅ Server running at port: ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:", error);
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
