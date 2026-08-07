const express = require("express");

const { listPrograms } = require("../controllers/programController");
const {
  validateDiscoveryQuery,
} = require("../middleware/validators/discoveryValidator");

const router = express.Router();

router.get("/", validateDiscoveryQuery, listPrograms);

module.exports = router;
