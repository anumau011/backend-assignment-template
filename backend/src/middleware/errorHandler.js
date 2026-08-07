function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || error.status || 500;

  let message = error.message || "Internal server error";
  let errors = error.errors || error.details || undefined;

  // Handle Mongoose Duplicate Key Error (E11000)
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "field";
    message = `Duplicate value entered for ${field}.`;
  }

  // Handle Mongoose Validation Error
  if (error.name === "ValidationError") {
    message = "Database validation failed.";
    errors = Object.values(error.errors || {}).map((err) => ({
      field: err.path,
      message: err.message,
    }));
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    message = "Invalid authentication token.";
  }

  if (error.name === "TokenExpiredError") {
    message = "Authentication token has expired.";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
}

module.exports = errorHandler;
