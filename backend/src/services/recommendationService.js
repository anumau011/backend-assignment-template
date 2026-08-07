const Program = require("../models/Program");
const Student = require("../models/Student");
const HttpError = require("../utils/httpError");

async function buildProgramRecommendations(studentId) {
  const student = await Student.findById(studentId).lean();

  if (!student) {
    throw new HttpError(404, "Student not found.");
  }

  const targetCountries = student.targetCountries || [];
  const interestedFields = student.interestedFields || [];
  const maxBudget = student.maxBudgetUsd || 0;
  const preferredIntake = student.preferredIntake || "";
  const ieltsScore = student.englishTest?.score || 0;

  const pipeline = [
    {
      $addFields: {
        isCountryMatch: {
          $in: ["$country", targetCountries],
        },
        isFieldMatch: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: interestedFields,
                  as: "stField",
                  cond: {
                    $regexMatch: {
                      input: "$field",
                      regex: "$$stField",
                      options: "i",
                    },
                  },
                },
              },
            },
            0,
          ],
        },
        isBudgetMatch: {
          $lte: ["$tuitionFeeUsd", maxBudget],
        },
        isIntakeMatch: {
          $and: [
            { $ne: [preferredIntake, ""] },
            { $in: [preferredIntake, "$intakes"] },
          ],
        },
        isIeltsMatch: {
          $lte: ["$minimumIelts", ieltsScore],
        },
      },
    },
    {
      $addFields: {
        matchScore: {
          $add: [
            { $cond: ["$isCountryMatch", 35, 0] },
            { $cond: ["$isFieldMatch", 30, 0] },
            { $cond: ["$isBudgetMatch", 20, 0] },
            { $cond: ["$isIntakeMatch", 10, 0] },
            { $cond: ["$isIeltsMatch", 5, 0] },
          ],
        },
        reasons: {
          $concatArrays: [
            {
              $cond: [
                "$isCountryMatch",
                [{ $concat: ["Preferred country match: ", "$country"] }],
                [],
              ],
            },
            {
              $cond: [
                "$isFieldMatch",
                [{ $concat: ["Field alignment: ", "$field"] }],
                [],
              ],
            },
            {
              $cond: [
                "$isBudgetMatch",
                ["Within budget range"],
                [],
              ],
            },
            {
              $cond: [
                "$isIntakeMatch",
                [{ $concat: ["Preferred intake available: ", preferredIntake] }],
                [],
              ],
            },
            {
              $cond: [
                "$isIeltsMatch",
                ["English test score meets requirement"],
                [],
              ],
            },
          ],
        },
      },
    },
    {
      $sort: { matchScore: -1, tuitionFeeUsd: 1 },
    },
    {
      $limit: 5,
    },
    {
      $project: {
        isCountryMatch: 0,
        isFieldMatch: 0,
        isBudgetMatch: 0,
        isIntakeMatch: 0,
        isIeltsMatch: 0,
      },
    },
  ];

  const recommendations = await Program.aggregate(pipeline);

  return {
    data: {
      student: {
        id: student._id,
        fullName: student.fullName,
        targetCountries: student.targetCountries,
        interestedFields: student.interestedFields,
      },
      recommendations,
    },
    meta: {
      implementationStatus: "mongodb-aggregation-pipeline",
    },
  };
}

module.exports = {
  buildProgramRecommendations,
};
