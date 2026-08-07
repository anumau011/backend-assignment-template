const jwt = require("jsonwebtoken");
const env = require("../config/env");
const Student = require("../models/Student");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");

function generateToken(user) {
  return jwt.sign(
    {
      sub: user._id,
      role: user.role,
      email: user.email,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
}

function sanitizeUser(user) {
  const userObject = user.toObject ? user.toObject() : { ...user };
  delete userObject.password;
  delete userObject.__v;
  userObject.id = userObject._id;
  return userObject;
}

const register = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    password,
    role = "student",
    targetCountries,
    interestedFields,
    preferredIntake,
    maxBudgetUsd,
    englishTest,
  } = req.body;

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await Student.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new HttpError(400, "Email address is already registered.");
  }

  const student = new Student({
    fullName,
    email: normalizedEmail,
    password,
    role,
    targetCountries: targetCountries || [],
    interestedFields: interestedFields || [],
    preferredIntake: preferredIntake || "",
    maxBudgetUsd: maxBudgetUsd || 0,
    englishTest: englishTest || { exam: "IELTS", score: 0 },
    profileComplete: true,
  });

  await student.save();

  const token = generateToken(student);

  res.status(201).json({
    success: true,
    message: "User registered successfully.",
    data: {
      token,
      user: sanitizeUser(student),
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = email.toLowerCase().trim();
  const student = await Student.findOne({ email: normalizedEmail });

  if (!student) {
    throw new HttpError(401, "Invalid email address or password.");
  }

  const isMatch = await student.comparePassword(password);

  if (!isMatch) {
    throw new HttpError(401, "Invalid email address or password.");
  }

  const token = generateToken(student);

  res.json({
    success: true,
    message: "Login successful.",
    data: {
      token,
      user: sanitizeUser(student),
    },
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

module.exports = {
  login,
  me,
  register,
};
