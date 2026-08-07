const express = require("express");

const {
  createApplication,
  listApplications,
  updateApplicationStatus,
} = require("../controllers/applicationController");
const { requireAuth } = require("../middleware/auth");
const {
  validateCreateApplication,
  validateUpdateApplicationStatus,
} = require("../middleware/validators/applicationValidator");

const router = express.Router();

router.use(requireAuth);

router.get("/", listApplications);
router.post("/", validateCreateApplication, createApplication);
router.patch("/:id/status", validateUpdateApplicationStatus, updateApplicationStatus);

module.exports = router;
