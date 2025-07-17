import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// method to generate access and refresh token
// ayncHandeler not required here, since function to be used in this scope only
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const userResponse = await User.findById(userId);
    const accessToken = userResponse.generateAccessToken();
    const refreshToken = userResponse.generateRefreshToken();

    // update the refresh token available in useResponse we get frm DB
    // ( refresh token is an attribute in user DB )
    userResponse.refreshToken = refreshToken;

    // save the DB, but keep in mid to not run validation check for "required: true" field in user DB
    await userResponse.save({ validateBeforeSave: false });

    // return newly created access and refreshToken
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  // ------------- fetch user details from request body -------------
  const { fullName, email, username, password } = req.body;
  // console.log("email: ", email);

  // ------------- validation of user details ---------------
  // check if any field is empty
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if email is valid
  if (email.length < 5 || !email.includes("@")) {
    throw new ApiError(400, "Invalid email address");
  }

  // check if username is valid
  if (password.length < 3) {
    throw new ApiError(400, "Password must be at least 6 characters long");
  }

  // -------------- check if user already exists --------------
  // find user by email or username
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  // if user exists, throw an error
  if (existedUser) {
    throw new ApiError(409, "User already exists with this email or username");
  }

  // -------------- check for images and avatar from local storage (not in Cloudinary) --------------
  // multer stores the uploaded file in req.files
  // console.log("Files uploaded:", req.files);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  // to handle if the user has not uploaded a cover image
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  // since in our db , avatar img was required : true,
  // we will check if avatar is present
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  // -------------- upload images to Cloudinary --------------
  const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
  const coverImageResponse = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  // if avatar upload failed, throw an error (becoz required : true in DB)
  if (!avatarResponse) {
    throw new ApiError(500, "Failed to upload avatar image");
  }

  // -------------- create user object and save to database --------------
  const user = await User.create({
    fullName,
    avatar: avatarResponse.url, // store the secure URL of the avatar
    coverImage: coverImageResponse ? coverImageResponse.url : null, // store the secure URL of the cover image
    email,
    password, // password will be hashed by mongoose pre-save hook
    username: username.toLowerCase(), // store username in lowercase
  });

  // -------------- remove sensitive fields from response --------------
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // -------------- check for user creation and return response --------------
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // -------------- return response of user using ApiResponse (utils) ----------------
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // TODOS:
  // fetch data from req.body
  // search db via username or email for user
  // if user found, check password frm user : else, throw error
  // if password valid, provide access token & refresh token : else throw error
  // finally, send a secure cookie and response (successfully logged in)

  // ---------------- fetch data from req -------------------------
  const { email, username, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  // ------------------ serach user from DB ------------------------
  const userResponse = await User.findOne({
    $or: [{ username }, { email }],
  });

  // handle if user not present
  if (!userResponse) {
    throw new ApiError(404, "User does not exist");
  }

  // -------- check pw validity frm returned valid userResponse -------

  // our returned userResponse has a method - isPasswordCorrect() that checks validity of pW (check "src\models\user.model.js" for more)
  const isPasswordValid = await userResponse.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid User credentials");
  }

  // ------------ generate access Token and Refresh Token --------------
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    userResponse._id
  );

  // -------------------- send response to user ---------------------
  // why again called to db here ?
  // earlier we made "userResponse" object by calling db, but there "refreshToken" attribute is still EMPTY since we are calling generateAccessAndRefreshTokens() later, so we call db again and omit password and refreshToken frm sendin to user

  const loggedInUser = await User.findById(userResponse._id).select(
    "-password -refreshToken"
  );

  // ------------------ send cookies ---------------------
  // by httpOnly true and secure true, cookie is only modifiable via server, not by frontEnd
  const options = {
    httpOnly: true,
    secure: true,
  };

  // ------------------- send response to user ---------------------
  // cookie-parser middleware used here ( refer "src\app.js" )
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // TODOS:
  // clear cookies since logging-Out the user
  // clear "refreshToken" present user.models since logging-Out
  // BUT, how to get the info of which user to delete
  // We can't take request frm user for doing that, accessing this might give some other user's email, who can be mistakenly logged off

  // --- NOTE : below code is written only after a custom middleware "verifyJWT" is created in "src\middlewares\auth.middleware.js"
  // and this middleware is integrated to route Query for "/logout" in "src\routes\user.routes.js"

  // search and update the required user DB before logging out
  await User.findByIdAndUpdate(
    // req.user is the user object we added in "verifyJWT" middleware
    // this is the user who is trying to log out
    req.user._id,
    {
      $set: {
        // refreshToken attribute frm "user.models.js" is set undefined
        refreshToken: undefined,
      },
    },
    {
      // return response is new updated value
      new: true,
    }
  );

  // clear cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    //TODO:
    // to refresh the access token we need the refresh token from the user
    // only then we can match it with db and generate new tokens

    const incommingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (incommingRefreshToken) {
      throw new ApiError(401, "Unauthorised request");
    }

    // now user has encryted refresh token,
    // but we need the raw token that's stored in our database
    // so decrypt it...
    const decodedToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // now we have the user._id frm decoded refresh token
    // search db
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // now try matching the incommingRefreshToken with db Saved RefreshToken
    if (incommingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // now every checking is done, we have valid user, so generateAccess Refersh tokens
    // using the function that we created at top
    //  generateAccessAndRefreshTokens()
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    // set "option" for new cookie since NEW TOKENS will be sent to user via cookie
    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(
      401,
      error?.message || "Invalid refresh token, Token can't generate"
    );
  }
});
export { registerUser, loginUser, logoutUser, refreshAccessToken };
