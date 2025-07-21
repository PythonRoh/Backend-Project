import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  // This line creates a new tweet in the database with the given content,
  // and assigns the current logged-in user (from req.user._id) as its owner.
  const tweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });

  if (!tweet) {
    throw new ApiError(500, "Failed to create tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  // in routes we had "/user/:userId" so we can access userId from req.params
  const { userId } = req.params;

  // what is "isValidObjectId"?
  // isValidObjectId is a mongoose function that checks whether a value is syntactically valid as a MongoDB ObjectId
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid userId");
  }

  const tweets = await Tweet.aggregate([
    {
      // pipeline 1
      // $match stage filters documents based on the owner field
      // it ensures that only tweets belonging to the specified userId are processed
      $match: {
        // works ok for strings, so avoid the deprecation warning
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      // pipeline 2
      // $lookup stage performs a left outer join with the "users" collection
      // it retrieves the details of the user who owns each tweet
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            // sub-pipeline 1
            $project: {
              username: 1,
              "avatar.url": 1,
            },
          },
        ],
      },
    },
    {
      // pipeline 3
      // $lookup stage performs a left outer join with the "likes" collection
      // it retrieves the details of likes associated with each tweet
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likeDetails",
        pipeline: [
          {
            // sub-pipeline 1
            $project: {
              likedBy: 1,
            },
          },
        ],
      },
    },
    {
      // pipeline 4
      // this stage adds new fields to the documents
      // it calculates the likesCount and checks if the current user has liked the tweet
      $addFields: {
        likesCount: {
          $size: "$likeDetails",
        },
        ownerDetails: {
          $first: "$ownerDetails",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likeDetails.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      // pipeline 5
      // $sort stage sorts the tweets in descending order based on the createdAt field
      // this ensures that the most recent tweets appear first
      $sort: {
        createdAt: -1,
      },
    },
    {
      // pipeline 6
      // $project stage specifies which fields to include in the final output
      $project: {
        content: 1,
        ownerDetails: 1,
        likesCount: 1,
        createdAt: 1,
        isLiked: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { content } = req.body;
  const { tweetId } = req.params;

  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweetId");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  // Check if the current user is the owner of the tweet
  // req.user._id is the ID of the currently logged-in user
  if (tweet?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "only owner can edit their tweet");
  }

  const newTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );

  if (!newTweet) {
    throw new ApiError(500, "Failed to edit tweet. Please Try Again");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweetId");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "only owner can delete their tweet");
  }

  await Tweet.findByIdAndDelete(tweetId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
