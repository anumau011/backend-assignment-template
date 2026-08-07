const express = require("express");

const {
  listPopularUniversities,
  listUniversities,
} = require("../controllers/universityController");
const {
  validateDiscoveryQuery,
} = require("../middleware/validators/discoveryValidator");

const router = express.Router();

router.get("/", validateDiscoveryQuery, listUniversities);
router.get("/popular", listPopularUniversities);

module.exports = router;
