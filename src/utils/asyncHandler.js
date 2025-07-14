const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

// const asyncHandler = () => {}
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () => {}

// asyncHandler is a higher-order function that wraps any async route handler or middleware.
// Its purpose is to catch errors from async functions and forward them to the error handler,
// so we don't have to write repetitive try-catch blocks in every route.

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         // Execute the passed async function with the request, response, and next objects
//         await fn(req, res, next);
//     } catch (err) {
//         // If an error occurs, respond with appropriate status code and message.
//         // Alternatively, you could call next(err) to let a centralized error handler manage it.
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message,
//         });
//     }
// };
