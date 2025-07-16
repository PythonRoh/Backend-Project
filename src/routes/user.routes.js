import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
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
export default router;
