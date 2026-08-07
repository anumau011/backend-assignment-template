const request = require("supertest");
const app = require("../src/app");
const Program = require("../src/models/Program");
const University = require("../src/models/University");
const { clearTestDb, setupTestDb, teardownTestDb } = require("./setup");

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe("Application Workflow APIs", () => {
  let studentToken;
  let studentId;
  let programId;

  beforeEach(async () => {
    // 1. Create student
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Test Student",
        email: "student.app@example.com",
        password: "Password123!",
        role: "student",
      });

    studentToken = regRes.body.data.token;
    studentId = regRes.body.data.user.id;

    // 2. Create university & program
    const university = await University.create({
      name: "Heriot-Watt University Dubai",
      country: "UAE",
      city: "Dubai",
    });

    const program = await Program.create({
      university: university._id,
      universityName: university.name,
      country: "UAE",
      city: "Dubai",
      title: "MSc Business Analytics",
      field: "Business Analytics",
      degreeLevel: "master",
      tuitionFeeUsd: 18500,
      intakes: ["September", "January"],
    });

    programId = program._id.toString();
  });

  test("POST /api/applications - Should create an application successfully", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        programId,
        intake: "September",
        note: "Initial application submission",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("draft");
    expect(res.body.data.timeline).toHaveLength(1);
    expect(res.body.data.timeline[0].status).toBe("draft");
  });

  test("POST /api/applications - Edge Case: Should prevent duplicate application for same student, program, and intake", async () => {
    await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        programId,
        intake: "September",
      });

    const duplicateRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        programId,
        intake: "September",
      });

    expect(duplicateRes.status).toBe(400);
    expect(duplicateRes.body.success).toBe(false);
    expect(duplicateRes.body.message).toContain("already exists");
  });

  test("PATCH /api/applications/:id/status - Should execute valid status transitions", async () => {
    // Create draft app
    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        programId,
        intake: "January",
      });

    const appId = appRes.body.data._id;

    // Transition: draft -> submitted
    const updateRes = await request(app)
      .patch(`/api/applications/${appId}/status`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        status: "submitted",
        note: "Submitted documents",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.status).toBe("submitted");
    expect(updateRes.body.data.timeline).toHaveLength(2);
  });

  test("PATCH /api/applications/:id/status - Edge Case: Should reject invalid status transition", async () => {
    // Create draft app
    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        programId,
        intake: "January",
      });

    const appId = appRes.body.data._id;

    // Invalid direct transition: draft -> offer-received
    const invalidRes = await request(app)
      .patch(`/api/applications/${appId}/status`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        status: "offer-received",
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.success).toBe(false);
    expect(invalidRes.body.message).toContain("Invalid status transition");
  });
});
