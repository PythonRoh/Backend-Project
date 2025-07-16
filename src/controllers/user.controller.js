import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser };
