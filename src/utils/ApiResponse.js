// This is a custom response class for sending consistent success responses from your API.
// It helps structure the API output with a status code, data, message, and a success flag.

class ApiResponse {
    constructor(
        statusCode,              // HTTP status code (e.g., 200 for OK, 201 for Created)
        data,                    // Payload or result to return (e.g., user info, list of items, etc.)
        message = "Success"      // Optional message (defaults to "Success" if not provided)
    ) {
        this.statusCode = statusCode;       // HTTP status code of the response
        this.data = data;                   // Actual response data
        this.message = message;             // Response message (success message)
        this.success = statusCode < 400;    // Boolean flag; true if status is < 400 (i.e., success)
    }
}

export { ApiResponse };
