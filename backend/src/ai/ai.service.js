const crypto = require("crypto");
const OpenAI = require("openai");

const env = require("../config/env");
const Program = require("../models/Program");
const cacheService = require("../services/cacheService");
const HttpError = require("../utils/httpError");
const { recommendationPrompt, studyPlanPrompt } = require("./prompts");

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: env.groqApiKey || process.env.GROQ_API_KEY || "dummy-key",
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  generateCacheKey(prefix, userId, payload) {
    const serialized = JSON.stringify(payload);
    const hash = crypto.createHash("sha256").update(serialized).digest("hex");
    return `${prefix}:${userId || "anonymous"}:${hash}`;
  }

  cleanAndParseJSON(rawContent) {
    if (!rawContent || typeof rawContent !== "string") {
      throw new Error("Empty response received from AI model.");
    }

    let cleaned = rawContent.trim();

    // Remove markdown codeblock formatting if present
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    try {
      return JSON.parse(cleaned);
    } catch (parseError) {
      throw new Error(`Failed to parse AI JSON response: ${parseError.message}`);
    }
  }

  async callGroqWithRetryAndTimeout(messages, maxRetries = 3, timeoutMs = 20000) {
    if (!env.groqApiKey && !process.env.GROQ_API_KEY) {
      throw new HttpError(
        500,
        "GROQ_API_KEY environment variable is missing. Please set your API key in .env."
      );
    }

    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const completion = await this.openai.chat.completions.create(
          {
            model: env.aiModel,
            messages,
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 2048,
          },
          {
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        const rawContent = completion.choices?.[0]?.message?.content;
        const parsed = this.cleanAndParseJSON(rawContent);
        return parsed;
      } catch (error) {
        lastError = error;

        // Handle specific AbortError / Timeout
        if (error.name === "AbortError") {
          lastError = new HttpError(504, "AI service request timed out. Please try again.");
        } else if (error.status === 401 || error.message?.includes("API key")) {
          throw new HttpError(401, "Invalid Groq API key configured.");
        } else if (error.status === 429) {
          lastError = new HttpError(429, "AI service rate limit exceeded. Please try again shortly.");
        }

        // Exponential backoff delay before retrying
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    }

    if (lastError instanceof HttpError) {
      throw lastError;
    }

    throw new HttpError(
      500,
      `AI service error after ${maxRetries} attempts: ${lastError.message || "Failed to process request"}`
    );
  }

  async generateUniversityRecommendation(studentProfile, userId = null) {
    const cacheKey = this.generateCacheKey("ai:recommendation", userId, studentProfile);
    const cachedPayload = await cacheService.get(cacheKey);

    if (cachedPayload) {
      return {
        ...cachedPayload,
        meta: { cache: "hit" },
      };
    }

    // Fetch matching programs from MongoDB
    const countryFilter = studentProfile.preferredCountry
      ? { country: { $regex: new RegExp(`^${studentProfile.preferredCountry}$`, "i") } }
      : {};

    let matchingPrograms = await Program.find(countryFilter)
      .populate("university", "name country city partnerType qsRanking scholarshipAvailable popularScore")
      .limit(15)
      .lean();

    if (!matchingPrograms || matchingPrograms.length === 0) {
      matchingPrograms = await Program.find()
        .populate("university", "name country city partnerType qsRanking scholarshipAvailable popularScore")
        .limit(10)
        .lean();
    }

    // Format clean DB context for AI prompt
    const sanitizedUniversities = matchingPrograms.map((prog) => ({
      programId: prog._id,
      programTitle: prog.title,
      universityName: prog.universityName || prog.university?.name,
      country: prog.country,
      city: prog.city,
      field: prog.field,
      degreeLevel: prog.degreeLevel,
      tuitionFeeUsd: prog.tuitionFeeUsd,
      intakes: prog.intakes,
      minimumIelts: prog.minimumIelts,
      scholarshipAvailable: prog.scholarshipAvailable,
    }));

    const { systemPrompt, userPrompt } = recommendationPrompt(studentProfile, sanitizedUniversities);

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const aiResponse = await this.callGroqWithRetryAndTimeout(messages);

    if (!aiResponse || typeof aiResponse !== "object") {
      throw new HttpError(500, "Received invalid or empty object from AI service.");
    }

    const result = {
      success: true,
      recommendations: aiResponse.recommendations || [],
    };

    // Cache in Redis/Memory for 24 hours (86400 seconds)
    await cacheService.set(cacheKey, result, 86400);

    return {
      ...result,
      meta: { cache: "miss" },
    };
  }

  async generateStudyPlan(studyPlanInput, userId = null) {
    const cacheKey = this.generateCacheKey("ai:study-plan", userId, studyPlanInput);
    const cachedPayload = await cacheService.get(cacheKey);

    if (cachedPayload) {
      return {
        ...cachedPayload,
        meta: { cache: "hit" },
      };
    }

    const { systemPrompt, userPrompt } = studyPlanPrompt(studyPlanInput);

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const aiResponse = await this.callGroqWithRetryAndTimeout(messages);

    if (!aiResponse || typeof aiResponse !== "object") {
      throw new HttpError(500, "Received invalid or empty object from AI service.");
    }

    const result = {
      success: true,
      timeline: aiResponse.timeline || [],
      tips: aiResponse.tips || [],
    };

    // Cache for 24 hours (86400 seconds)
    await cacheService.set(cacheKey, result, 86400);

    return {
      ...result,
      meta: { cache: "miss" },
    };
  }
}

module.exports = new AIService();
