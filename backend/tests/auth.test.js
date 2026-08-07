const request = require("supertest");
const app = require("../src/app");
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

describe("Authentication APIs", () => {
  const sampleUser = {
    fullName: "John Candidate",
    email: "john.candidate@example.com",
    password: "Password123!",
    role: "student",
    targetCountries: ["Canada", "UK"],
    interestedFields: ["Computer Science"],
    preferredIntake: "September",
    maxBudgetUsd: 25000,
    englishTest: {
      exam: "IELTS",
      score: 7,
    },
  };

  test("POST /api/auth/register - Should register a new student and return JWT token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(sampleUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(sampleUser.email.toLowerCase());
    expect(res.body.data.user.password).toBeUndefined();
  });

  test("POST /api/auth/register - Should reject duplicate email registration", async () => {
    await request(app).post("/api/auth/register").send(sampleUser);

    const res = await request(app)
      .post("/api/auth/register")
      .send(sampleUser);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("already registered");
  });

  test("POST /api/auth/login - Should authenticate valid user and return token", async () => {
    await request(app).post("/api/auth/register").send(sampleUser);

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: sampleUser.email,
        password: sampleUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(sampleUser.email.toLowerCase());
  });

  test("POST /api/auth/login - Should reject invalid password", async () => {
    await request(app).post("/api/auth/register").send(sampleUser);

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: sampleUser.email,
        password: "WrongPassword!",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("GET /api/auth/me - Should return profile of authenticated user", async () => {
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send(sampleUser);

    const token = registerRes.body.data.token;

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe(sampleUser.email.toLowerCase());
  });

  test("GET /api/auth/me - Should reject request without Bearer token", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
