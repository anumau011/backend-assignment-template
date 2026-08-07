const { body } = require("express-validator");
const validateResult = require("./validateResult");

const validateRegister = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required.")
    .isLength({ min: 2 })
    .withMessage("Full name must be at least 2 characters."),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Must be a valid email address.")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long."),
  body("role")
    .optional()
    .isIn(["student", "counselor"])
    .withMessage("Role must be either student or counselor."),
  body("targetCountries")
    .optional()
    .isArray()
    .withMessage("Target countries must be an array of strings."),
  body("interestedFields")
    .optional()
    .isArray()
    .withMessage("Interested fields must be an array of strings."),
  body("preferredIntake")
    .optional()
    .isString()
    .withMessage("Preferred intake must be a string."),
  body("maxBudgetUsd")
    .optional()
    .isNumeric()
    .withMessage("Max budget must be a number."),
  body("englishTest.score")
    .optional()
    .isNumeric()
    .withMessage("English test score must be a number."),
  validateResult,
];

const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Must be a valid email address.")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required."),
  validateResult,
];

module.exports = {
  validateLogin,
  validateRegister,
};
