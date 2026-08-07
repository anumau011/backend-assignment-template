const { validationResult } = require("express-validator");
const HttpError = require("../../utils/httpError");

function validateResult(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    throw new HttpError(400, "Validation failed", formattedErrors);
  }

  next();
}

module.exports = validateResult;
