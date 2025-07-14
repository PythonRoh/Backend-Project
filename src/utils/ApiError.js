// This is a custom error class that extends the built-in JavaScript Error class.
// It helps create structured API error responses with additional properties like statusCode,
// error messages, error details, and stack traces — all in a consistent format.

class ApiError extends Error {
    constructor(
        statusCode,                     // HTTP status code (e.g., 404, 500)
        message = "Something went wrong", // Default error message if not provided
        errors = [],                    // Array of additional error details (optional)
        stack = ""                      // Optional stack trace (usually for debugging)
    ) {
        super(message);                 // Call the parent Error class constructor with the message

        this.statusCode = statusCode;  
        this.data = null;              // Placeholder for any extra data (can be used if needed)
        this.message = message;        // Store the message explicitly (already done by Error, but keeping for clarity)
        this.success = false;          // Always false, since this represents an error
        this.errors = errors;          // Additional error details (e.g., validation errors)

        // Capture the stack trace for debugging.
        // If a custom stack is provided, use it; otherwise, generate it from this constructor.
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };
