const express = require("express");

const { getOverview } = require("../controllers/dashboardController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/overview", requireAuth, getOverview);

module.exports = router;
