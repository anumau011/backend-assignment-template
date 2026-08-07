const { body } = require("express-validator");
const validateResult = require("./validateResult");

const validateRecommendAI = [
  body("preferredCountry")
    .trim()
    .notEmpty()
    .withMessage("Preferred country is required."),
  body("budget")
    .notEmpty()
    .withMessage("Budget is required.")
    .isNumeric()
    .withMessage("Budget must be a number."),
  body("field")
    .trim()
    .notEmpty()
    .withMessage("Field of study is required."),
  body("intake")
    .trim()
    .notEmpty()
    .withMessage("Target intake is required."),
  body("ielts")
    .notEmpty()
    .withMessage("IELTS score is required.")
    .isNumeric()
    .withMessage("IELTS score must be a number."),
  body("cgpa")
    .notEmpty()
    .withMessage("CGPA is required.")
    .isNumeric()
    .withMessage("CGPA must be a number."),
  validateResult,
];

const validateStudyPlanAI = [
  body("country")
    .trim()
    .notEmpty()
    .withMessage("Country is required."),
  body("targetIntake")
    .trim()
    .notEmpty()
    .withMessage("Target intake is required."),
  body("currentIELTS")
    .notEmpty()
    .withMessage("Current IELTS score is required.")
    .isNumeric()
    .withMessage("Current IELTS score must be a number."),
  body("targetIELTS")
    .notEmpty()
    .withMessage("Target IELTS score is required.")
    .isNumeric()
    .withMessage("Target IELTS score must be a number."),
  body("cgpa")
    .notEmpty()
    .withMessage("CGPA is required.")
    .isNumeric()
    .withMessage("CGPA must be a number."),
  body("documentsUploaded")
    .optional()
    .isArray()
    .withMessage("documentsUploaded must be an array of string document titles."),
  validateResult,
];

module.exports = {
  validateRecommendAI,
  validateStudyPlanAI,
};
