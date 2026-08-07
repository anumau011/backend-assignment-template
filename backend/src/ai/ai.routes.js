const express = require("express");

const {
  validateRecommendAI,
  validateStudyPlanAI,
} = require("../middleware/validators/aiValidator");
const { getAIRecommendations, getAIStudyPlan } = require("./ai.controller");

const router = express.Router();

router.post("/recommend", validateRecommendAI, getAIRecommendations);
router.post("/study-plan", validateStudyPlanAI, getAIStudyPlan);

module.exports = router;
