import mongoose from "mongoose";
import { ApiErrorResponse } from "../utils/ApiErrorResponse.js";

const errorHandler = (err, req, res, next) => {
    let error = err;

    // If error is not instance of ApiErrorResponse, wrap it
    if (!(error instanceof ApiErrorResponse)) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Something went wrong";
        const errors = error.errors || [];
        error = new ApiErrorResponse(statusCode, message, errors, error.stack);
    }

    // Prepare response
    const resData = {
        success: false,
        message: error.message,
        errors: error.errors || [],
        ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {})
    };

    return res.status(error.statusCode).json(resData);
};

export { errorHandler };
