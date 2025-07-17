import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
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

// secured routes ( middleware "verifyJWT" will be injected, ref : "src\middlewares\auth.middleware.js")
// what this does is when we send a request to "/logout", before getting a response frm logoutUser funct,
// it will first check if the user is logged in or not, and then only proceed to logoutUser function
// attaches a new user object to the request as req.user
// so that we can know which user is trying to log out
router.route("/logout").post(verifyJWT, logoutUser);
export default router;
