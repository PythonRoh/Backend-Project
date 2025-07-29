import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

// app.use() -> to apply middleware to requests/responses cycles
//           -> allows us to use middleware like cors, cookie-parser, etc.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// set limit to json body size to 16kb to prevent server overload
app.use(express.json({ limit: "16kb" }));

// parse urlencoded form-data from request bodies
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// serve static files from the public folder
app.use(express.static("public"));

// parse cookies from request headers
app.use(cookieParser());

//routes import
import userRouter from "./routes/user.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";

//routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);

// http://localhost:8000/api/v1/users/register (or) .../users/login
export { app };
