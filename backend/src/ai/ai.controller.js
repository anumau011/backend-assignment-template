const asyncHandler = require("../utils/asyncHandler");
const aiService = require("./ai.service");

const getAIRecommendations = asyncHandler(async (req, res) => {
  const { preferredCountry, budget, field, intake, ielts, cgpa } = req.body;
  const userId = req.user ? req.user._id.toString() : null;

  const result = await aiService.generateUniversityRecommendation(
    {
      preferredCountry,
      budget: Number(budget),
      field,
      intake,
      ielts: Number(ielts),
      cgpa: Number(cgpa),
    },
    userId
  );

  res.json(result);
});

const getAIStudyPlan = asyncHandler(async (req, res) => {
  const { country, targetIntake, currentIELTS, targetIELTS, cgpa, documentsUploaded } = req.body;
  const userId = req.user ? req.user._id.toString() : null;

  const result = await aiService.generateStudyPlan(
    {
      country,
      targetIntake,
      currentIELTS: Number(currentIELTS),
      targetIELTS: Number(targetIELTS),
      cgpa: Number(cgpa),
      documentsUploaded: documentsUploaded || [],
    },
    userId
  );

  res.json(result);
});

module.exports = {
  getAIRecommendations,
  getAIStudyPlan,
};
