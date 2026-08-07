const request = require("supertest");
const app = require("../src/app");
const Program = require("../src/models/Program");
const University = require("../src/models/University");
const cacheService = require("../src/services/cacheService");
const { clearTestDb, setupTestDb, teardownTestDb } = require("./setup");

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  await cacheService.flush();
});

describe("AI Platform Endpoints", () => {
  test("POST /api/ai/recommend - Validation error when fields are missing", async () => {
    const res = await request(app).post("/api/ai/recommend").send({
      preferredCountry: "Canada",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  test("POST /api/ai/study-plan - Validation error when fields are missing", async () => {
    const res = await request(app).post("/api/ai/study-plan").send({
      country: "Canada",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  test("POST /api/ai/recommend - Should return cached recommendation response when present in cache", async () => {
    const payload = {
      preferredCountry: "Canada",
      budget: 30000,
      field: "Computer Science",
      intake: "Fall",
      ielts: 7,
      cgpa: 8.2,
    };

    // Pre-seed cache
    const aiService = require("../src/ai/ai.service");
    const cacheKey = aiService.generateCacheKey("ai:recommendation", null, payload);

    await cacheService.set(
      cacheKey,
      {
        success: true,
        recommendations: [
          {
            rank: 1,
            university: "University of Windsor",
            program: "Master of Applied Computing",
            matchScore: 96,
            reasons: ["Within budget", "Field alignment"],
            estimatedAdmissionChance: "High",
            tips: ["Apply early"],
          },
        ],
      },
      86400
    );

    const res = await request(app).post("/api/ai/recommend").send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta.cache).toBe("hit");
    expect(res.body.recommendations).toHaveLength(1);
    expect(res.body.recommendations[0].university).toBe("University of Windsor");
  });

  test("POST /api/ai/study-plan - Should return cached study plan response when present in cache", async () => {
    const payload = {
      country: "Canada",
      targetIntake: "Fall 2027",
      currentIELTS: 6,
      targetIELTS: 7,
      cgpa: 8.2,
      documentsUploaded: ["Passport"],
    };

    const aiService = require("../src/ai/ai.service");
    const cacheKey = aiService.generateCacheKey("ai:study-plan", null, payload);

    await cacheService.set(
      cacheKey,
      {
        success: true,
        timeline: [
          {
            month: "August 2026",
            tasks: ["Research universities"],
          },
        ],
        tips: ["Start IELTS early"],
      },
      86400
    );

    const res = await request(app).post("/api/ai/study-plan").send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta.cache).toBe("hit");
    expect(res.body.timeline).toHaveLength(1);
    expect(res.body.tips).toContain("Start IELTS early");
  });
});
