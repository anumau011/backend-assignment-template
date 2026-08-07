const express = require("express");

const { login, me, register } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const {
  validateLogin,
  validateRegister,
} = require("../middleware/validators/authValidator");

const router = express.Router();

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.get("/me", requireAuth, me);

module.exports = router;
