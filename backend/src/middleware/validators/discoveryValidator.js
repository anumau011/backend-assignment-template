const { query } = require("express-validator");
const validateResult = require("./validateResult");

const validateDiscoveryQuery = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100."),
  query("maxTuition")
    .optional()
    .isNumeric()
    .withMessage("Max tuition must be a number."),
  query("scholarshipAvailable")
    .optional()
    .isBoolean()
    .withMessage("Scholarship available must be a boolean string ('true' or 'false')."),
  validateResult,
];

module.exports = {
  validateDiscoveryQuery,
};
