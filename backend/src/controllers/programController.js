const Program = require("../models/Program");
const asyncHandler = require("../utils/asyncHandler");

function parseBoolean(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

const listPrograms = asyncHandler(async (req, res) => {
  const {
    country,
    degreeLevel,
    intake,
    field,
    q,
    maxTuition,
    scholarshipAvailable,
    sortBy = "relevance",
    page = 1,
    limit = 10,
  } = req.query;

  const filters = {};

  if (country) {
    filters.country = { $regex: new RegExp(`^${country}$`, "i") };
  }

  if (degreeLevel) {
    filters.degreeLevel = degreeLevel.toLowerCase();
  }

  if (field) {
    filters.field = { $regex: field, $options: "i" };
  }

  if (intake) {
    filters.intakes = { $regex: new RegExp(`^${intake}$`, "i") };
  }

  if (maxTuition) {
    filters.tuitionFeeUsd = { $lte: Number(maxTuition) };
  }

  const scholarshipFlag = parseBoolean(scholarshipAvailable);
  if (typeof scholarshipFlag === "boolean") {
    filters.scholarshipAvailable = scholarshipFlag;
  }

  if (q) {
    const searchRegex = { $regex: q, $options: "i" };
    filters.$or = [
      { title: searchRegex },
      { universityName: searchRegex },
      { field: searchRegex },
      { country: searchRegex },
      { city: searchRegex },
    ];
  }

  const pageNumber = Math.max(Number(page), 1);
  const pageSize = Math.min(Math.max(Number(limit), 1), 100);

  const sortMap = {
    tuitionAsc: { tuitionFeeUsd: 1 },
    tuitionDesc: { tuitionFeeUsd: -1 },
    relevance: { scholarshipAvailable: -1, tuitionFeeUsd: 1 },
  };

  const selectedSort = sortMap[sortBy] || sortMap.relevance;

  const [items, total] = await Promise.all([
    Program.find(filters)
      .populate("university", "name country city partnerType qsRanking scholarshipAvailable popularScore")
      .sort(selectedSort)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Program.countDocuments(filters),
  ]);

  res.json({
    success: true,
    data: items,
    meta: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

module.exports = {
  listPrograms,
};
