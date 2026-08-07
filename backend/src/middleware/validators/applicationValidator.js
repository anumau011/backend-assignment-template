const { body, param } = require("express-validator");
const { applicationStatuses } = require("../../config/constants");
const validateResult = require("./validateResult");

const validateCreateApplication = [
  body("programId")
    .trim()
    .notEmpty()
    .withMessage("Program ID is required.")
    .isMongoId()
    .withMessage("Program ID must be a valid MongoDB ObjectId."),
  body("intake")
    .trim()
    .notEmpty()
    .withMessage("Intake is required (e.g. September, January)."),
  body("studentId")
    .optional()
    .isMongoId()
    .withMessage("Student ID must be a valid MongoDB ObjectId."),
  body("note")
    .optional()
    .isString()
    .withMessage("Note must be a string."),
  validateResult,
];

const validateUpdateApplicationStatus = [
  param("id")
    .isMongoId()
    .withMessage("Application ID must be a valid MongoDB ObjectId."),
  body("status")
    .trim()
    .notEmpty()
    .withMessage("Status is required.")
    .isIn(applicationStatuses)
    .withMessage(`Status must be one of: ${applicationStatuses.join(", ")}`),
  body("note")
    .optional()
    .isString()
    .withMessage("Note must be a string."),
  validateResult,
];

module.exports = {
  validateCreateApplication,
  validateUpdateApplicationStatus,
};
