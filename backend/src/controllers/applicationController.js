const { validStatusTransitions } = require("../config/constants");
const Application = require("../models/Application");
const Program = require("../models/Program");
const Student = require("../models/Student");
const cacheService = require("../services/cacheService");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");

const listApplications = asyncHandler(async (req, res) => {
  const { studentId, status } = req.query;
  const filters = {};

  // If user is a student, restrict listing to their own applications
  if (req.user && req.user.role === "student") {
    filters.student = req.user._id;
  } else if (studentId) {
    filters.student = studentId;
  }

  if (status) {
    filters.status = status;
  }

  const applications = await Application.find(filters)
    .populate("student", "fullName email role targetCountries englishTest")
    .populate("program", "title degreeLevel tuitionFeeUsd minimumIelts field")
    .populate("university", "name country city partnerType qsRanking")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: applications,
  });
});

const createApplication = asyncHandler(async (req, res) => {
  const { programId, intake, studentId, note } = req.body;

  let targetStudentId = req.user._id;

  if (req.user.role === "counselor" && studentId) {
    targetStudentId = studentId;
  }

  const studentExists = await Student.findById(targetStudentId);
  if (!studentExists) {
    throw new HttpError(404, "Target student not found.");
  }

  const program = await Program.findById(programId);
  if (!program) {
    throw new HttpError(404, "Program not found.");
  }

  // Check duplicate application
  const existingApp = await Application.findOne({
    student: targetStudentId,
    program: program._id,
    intake,
  });

  if (existingApp) {
    throw new HttpError(
      400,
      `An application for this student, program, and intake (${intake}) already exists.`
    );
  }

  const initialStatus = "draft";
  const initialTimelineNote = note || "Application created.";

  const application = new Application({
    student: targetStudentId,
    program: program._id,
    university: program.university,
    destinationCountry: program.country,
    intake,
    status: initialStatus,
    timeline: [
      {
        status: initialStatus,
        note: initialTimelineNote,
        changedAt: new Date(),
      },
    ],
  });

  await application.save();

  const populatedApplication = await Application.findById(application._id)
    .populate("student", "fullName email role")
    .populate("program", "title degreeLevel tuitionFeeUsd")
    .populate("university", "name country city");

  // Invalidate dashboard overview cache
  await cacheService.delete("dashboard-overview");

  res.status(201).json({
    success: true,
    message: "Application created successfully.",
    data: populatedApplication,
  });
});

const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const application = await Application.findById(id);

  if (!application) {
    throw new HttpError(404, "Application not found.");
  }

  // Authorization check: students can only update their own applications
  if (
    req.user.role === "student" &&
    application.student.toString() !== req.user._id.toString()
  ) {
    throw new HttpError(403, "Access denied. You can only manage your own applications.");
  }

  const allowedTransitions = validStatusTransitions[application.status] || [];

  if (!allowedTransitions.includes(status)) {
    throw new HttpError(
      400,
      `Invalid status transition from '${application.status}' to '${status}'. Allowed transitions: ${
        allowedTransitions.length > 0 ? allowedTransitions.join(", ") : "none"
      }.`
    );
  }

  application.status = status;
  application.timeline.push({
    status,
    note: note || `Status updated to ${status}.`,
    changedAt: new Date(),
  });

  await application.save();

  const populatedApplication = await Application.findById(application._id)
    .populate("student", "fullName email role")
    .populate("program", "title degreeLevel tuitionFeeUsd")
    .populate("university", "name country city");

  // Invalidate dashboard overview cache
  await cacheService.delete("dashboard-overview");

  res.json({
    success: true,
    message: `Application status updated to '${status}' successfully.`,
    data: populatedApplication,
  });
});

module.exports = {
  createApplication,
  listApplications,
  updateApplicationStatus,
};
