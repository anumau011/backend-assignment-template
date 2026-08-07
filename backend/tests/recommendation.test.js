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

describe("Recommendation Engine API", () => {
  test("GET /api/recommendations/:studentId - Should aggregate recommendations based on student preferences", async () => {
    // 1. Register student
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Aarav Malhotra",
        email: "aarav.test@example.com",
        password: "Password123!",
        targetCountries: ["Canada"],
        interestedFields: ["Computer Science"],
        preferredIntake: "September",
        maxBudgetUsd: 25000,
        englishTest: { exam: "IELTS", score: 7.0 },
      });

    const token = registerRes.body.data.token;
    const studentId = registerRes.body.data.user.id;

    // 2. Create sample university and program
    const university = await University.create({
      name: "University of Windsor",
      country: "Canada",
      city: "Windsor",
      partnerType: "direct",
      qsRanking: 547,
      scholarshipAvailable: true,
      popularScore: 88,
    });

    await Program.create({
      university: university._id,
      universityName: university.name,
      country: "Canada",
      city: "Windsor",
      title: "Master of Applied Computing",
      field: "Computer Science",
      degreeLevel: "master",
      tuitionFeeUsd: 22800,
      intakes: ["September", "May"],
      durationMonths: 16,
      minimumIelts: 6.5,
      scholarshipAvailable: true,
    });

    // 3. Fetch recommendations
    const res = await request(app)
      .get(`/api/recommendations/${studentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recommendations).toHaveLength(1);

    const rec = res.body.data.recommendations[0];
    expect(rec.title).toBe("Master of Applied Computing");
    expect(rec.matchScore).toBeGreaterThan(0);
    expect(rec.reasons).toContain("Preferred country match: Canada");
    expect(rec.reasons).toContain("Within budget range");
  });
});
