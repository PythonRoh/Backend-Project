// This middleware is used to authenticate the user before allowing access to protected routes.
// It checks whether a valid JWT (JSON Web Token) exists in either the cookies or the Authorization header.
// If a token is present, it verifies the token using the server's secret key to ensure it's not tampered with.
// Then, it extracts the user ID from the decoded token and fetches the corresponding user from the database.
// If the user is found and valid, it attaches the user object to the request as `req.user`, allowing subsequent route handlers to know which user is making the request.
// If the token is missing, invalid, expired, or the user doesn't exist, it throws a 401 Unauthorized error.
// In the context of logout, this middleware ensures that the logout request is being made by an already authenticated (logged-in) user,
// so the logout logic can safely clear the token (cookie) and perform any necessary cleanup.

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // we will be getting the user info frm the stored cookies (refer "user.controller.js"), there while sending response to user at loginUser() {at the very end}, we added cookie middleware and sent the accessToken to user {if the user was succesfully logged in}

    //Yes, cookie is a middleware , so here it can be readily used by req i.e req.cookies (refer "app.js")

    // form where to get loggedIn user info,
    // frm the stored cookie he has
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    // use accessTokenSecret linked with JWT to get value frm hash
    // decodedToken is the entire data we sent as accessToken in "user.models.js"
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      // TODO: discuss about frontend
      throw new ApiError(401, "Invalid Access Token");
    }

    // if user exists, add it by creating a new object to the req we have
    // that's what Middlewares do !!
    req.user = user; // a new object "user" linked to req, and given value "user"

    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
