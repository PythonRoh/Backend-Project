import { Router } from "express";
import {
  changeCurrentPassword,
  changeUsername,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
// "upload" is a multer middleware for handling file uploads
// check "middleware/multer.middleware.js" for more details
const router = Router();

// router.route("/register").post(registerUser);

// here we make a request to route "/register" and call the registerUser function
// But in between this i need to perform something like uploading an image etc.
// Therefore we will need the multer middleware here ("upload")

router.route("/register").post(
  upload.fields([
    // we expect two fields: "avatar" and "coverImages", so 2 objects in the array
    {
      name: "avatar",
      maxCount: 1, // only one avatar image
    },
    {
      name: "coverImage",
      maxCount: 1, // only one cover images
    },
  ]),
  registerUser
);

// login route
router.route("/login").post(loginUser);

// ---------- secured routes ----------

// ( middleware "verifyJWT" will be injected, ref : "src\middlewares\auth.middleware.js")
// what this does is when we send a request to "/logout", before getting a response frm logoutUser funct,
// it will first check if the user is logged in or not, and then only proceed to logoutUser function
// attaches a new user object to the request as req.user
// so that we can know which user is trying to log out
router.route("/logout").post(verifyJWT, logoutUser);

// here middleware "verifyJWT" not required, becoz
// we are not checking if the user is logged in or not, we just want to refresh the access token
router.route("/refresh-token").post(refreshAccessToken);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/change-username").post(verifyJWT, changeUsername);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);

// here first we will check if the user is logged in or not using "verifyJWT" middleware
// then we will use multer middleware to handle file uploads
router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

// the callback function "getUserChannelProfile" will use the username from the URL
// to get the user details from the database
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory);
export default router;
