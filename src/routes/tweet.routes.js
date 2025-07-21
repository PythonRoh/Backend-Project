import { Router } from "express";
import {
  createTweet,
  deleteTweet,
  getUserTweets,
  updateTweet,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file
// this is same as :
// router.route("/").post(verifyJWT, createTweet);
// This ensures that all routes in this file require a valid JWT token

router.route("/").post(createTweet);
router.route("/user/:userId").get(getUserTweets);

// Apply the update and delete routes for a specific tweet
router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);
// this is same as :
// router.route("/:tweetId").patch(updateTweet);
// router.route("/:tweetId").delete(deleteTweet);

// What actually runs (update or delete) is decided by the HTTP method used in the request.
// You cannot trigger both PATCH and DELETE at the same time via a single HTTP request.

export default router;
