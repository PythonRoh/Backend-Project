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

    if (!incommingRefreshToken) {
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

const changeCurrentPassword = asyncHandler(async (req, res) => {
  // TODO:
  // here we don't have to confirm if user is logged in or not, cokkies available or not, THIS will be handeled at routes itself with the verifyJWT middleware we custom created
  // now, we want user so that we can change incomming pw with db stored pw
  // for that we need user info, that we will be getting from "verifyJWT" middleware (src\middlewares\auth.middleware.js)

  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;

  // before this save a pre-hook will be run, (ref "user.models.js", or check screenshots), which will encrypt "newPassword" before saving in DB
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  //TODO:
  // this is realtively easy
  // hame bass current user details chahiye
  // simply return req.user as a response (user frm "verifyJWT" ref: "src\middlewares\auth.middleware.js")
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  //TODO:
  // fetch details from req.body
  // fetch user frm db nd update via "findByIdAndUpdate()"
  // set fullName and email by $set operator
  // set new : true, to give updated user details
  // send response to user
  const { fullName, email } = req.body;

  if (!(fullName || email)) {
    throw new ApiError(400, "All fields are required");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?.id,
    {
      // mongodb operator used $set
      // update the user details
      $set: {
        fullName,
        email,
      },
    },
    {
      // this enables updated user DB to be returned to user durin res
      // user details stored in "updatedUser" variable
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Account details updated successfully")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  // TODO:
  // fetch avatar frm req.files
  // check if avatar is present or not, throw error if not
  // upload avatar to cloudinary
  // update user avatar in db via findByIdAndUpdate()
  // set new : true, to give updated user details
  // send response to user

  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // ******* TODO: delete old avatar from cloudinary ********
  // (probably will need a new utility function)

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(
      400,
      "Error while uploading updated Avatar on Cloudinary"
    );
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar changed successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  // TODO:
  // fetch CoverImage frm req.files
  // check if CoverImage is present or not, throw error if not
  // upload CoverImage to cloudinary
  // update user CoverImage in db via findByIdAndUpdate()
  // set new : true, to give updated user details
  // send response to user

  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(
      400,
      "Error while uploading updated coverImage on Cloudinary"
    );
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "coverImage changed successfully"));
});

// this is an experiment , but its 100% correct :
// idea is to give access to user to changeUsername, but it has to be unique, not used by anyone else
const changeUsername = asyncHandler(async (req, res) => {
  //TODO:
  // "newUsername" lelo req se (req.body)
  // validate id newUsername given correct or not
  // tho check karo ki ye "newUsername" db meinexist na kare
  // IMPT : await User.findOne({username: newUsername}); this will return the user object matching "newUsename"
  // if user object exists, throw error
  // if not, fetch the user details frm the one requesting  it (using verifyJWT which added user object to req {req.user})
  // fetch cuurent user obj frm db, via findByid(req.user._id)
  // then simply update the username( user.username = newUsername)
  // send response

  const { newUsername } = req.body;

  // 1. Check if the new username is provided
  if (!newUsername || newUsername.trim() === "") {
    throw new ApiError(400, "New username is required");
  }

  // 2. Check if username already exists in DB (case-insensitive optional)
  const usernameExists = await User.findOne({ username: newUsername });

  // 3. If exists and it's not the current user, throw error
  if (
    usernameExists &&
    usernameExists._id.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(400, "Username already taken");
  }

  // 4. Find current user
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // 5. Update and save
  user.username = newUsername;
  await user.save({ validateBeforeSave: false }); // optionally skip validation

  // 6. Response
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { username: user.username },
        "Username updated successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  changeUsername,
};
