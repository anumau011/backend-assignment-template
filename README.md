# Waygood Study Abroad Backend Platform

## Setup & Installation Instructions

### Local Development Setup

1. **Clone & Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env` file in `backend/`:
   ```env
   PORT=4000
   MONGODB_URI=mongodb://127.0.0.1:27017/waygood-evaluation
   JWT_SECRET=waygood-dev-secret-key-2026
   JWT_EXPIRES_IN=1d
   CACHE_TTL_SECONDS=300
   REDIS_URL=
   GROQ_API_KEY=your_groq_api_key_here
   AI_MODEL=llama-3.3-70b-versatile
   ```

3. **Seed Database**
   ```bash
   npm run seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   The API will run at `http://localhost:4000`.

---

## API Documentation & Interactive UI

- **Swagger UI Interactive Docs**: Navigate to `http://localhost:4000/api/docs` in your browser.
- **Postman Collection**: Import [Waygood_Postman_Collection.json](file:///d:/interassignment/docs/Waygood_Postman_Collection.json) into Postman.

---

## Suggested MongoDB Indexes

To optimize high-volume queries in production, the following indexes are declared in models:

1. **Student Collection**:
   - `{ email: 1 }` (Unique) for instant login lookups.
2. **University Collection**:
   - `{ country: 1 }` for filtering.
   - `{ popularScore: -1, qsRanking: 1 }` for sorted listing.
   - `{ name: "text", country: "text", city: "text" }` text index for search.
3. **Program Collection**:
   - Compound index: `{ country: 1, degreeLevel: 1, field: 1, tuitionFeeUsd: 1 }` for discovery filters.
   - Index on `university` foreign key.
4. **Application Collection**:
   - Compound unique index: `{ student: 1, program: 1, intake: 1 }` to prevent duplicate applications.
   - `{ status: 1 }`, `{ destinationCountry: 1 }` for dashboard aggregation queries.

---

## Running Test Suite

Run unit and integration tests using Jest and Supertest:
```bash
cd backend
npm test
```

---

## Docker Setup

Run backend, MongoDB, and Redis using Docker Compose:
```bash
docker-compose up --build -d
```
Stop containers:
```bash
docker-compose down
```

---

## Technical Stack & Architecture

- **Runtime**: Node.js (v22+)
- **Framework**: Express.js (v4)
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis (via `ioredis`) with automatic fallback to high-speed in-memory cache
- **Authentication**: JWT (JSON Web Tokens) & `bcryptjs` password hashing
- **Input Validation**: `express-validator` middleware
- **Security**: `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize`
- **Testing**: Jest + Supertest with `mongodb-memory-server`
- **Documentation**: Swagger UI / OpenAPI 3.0 (`swagger-ui-express`) & Postman Collection
- **Containerization**: Docker & Docker Compose

---

## Core Features & Completed Implementations

### 1. Authentication & Security Module
- **User Registration (`POST /api/auth/register`)**: Supports `student` and `counselor` roles. Validates user input, normalizes email, checks for existing user, hashes password via Mongoose pre-save hook, and returns signed JWT token.
- **User Login (`POST /api/auth/login`)**: Authenticates email and password using `comparePassword()` method and returns JWT token.
- **Profile API (`GET /api/auth/me`)**: Protected endpoint returning authenticated user metadata.
- **Security Best Practices**:
  - `helmet`: Sets protective HTTP headers.
  - `express-rate-limit`: Prevents brute-force on auth routes (20 req/15 min) and global API (300 req/15 min).
  - `express-mongo-sanitize`: Prevents NoSQL query injection attacks.

### 2. University & Program Discovery Module
- **University Discovery (`GET /api/universities`)**:
  - Filtering by `country` (case-insensitive regex), `partnerType`, `scholarshipAvailable`.
  - Full-text search (`q`) across name, country, city, and tags.
  - Pagination metadata (`page`, `limit`, `total`, `totalPages`).
  - Sorting by `name`, `ranking` (QS ranking), and `popular` score.
- **Popular Universities (`GET /api/universities/popular`)**: Returns top popular universities backed by Redis/in-memory cache.
- **Program Discovery (`GET /api/programs`)**:
  - Filtering by `country`, `degreeLevel`, `field`, `intake`, `maxTuition`, `scholarshipAvailable`.
  - Populate university metadata.
  - Sorting by `tuitionAsc`, `tuitionDesc`, and `relevance`.

### 3. Recommendation Engine (MongoDB Aggregation Pipeline)
- **Endpoint**: `GET /api/recommendations/:studentId`
- Implemented **100% within MongoDB Aggregation Pipeline** on the `Program` collection.
- **Scoring Pipeline**:
  - **Preferred Country Match (+35 points)**: Program `country` is in student's `targetCountries`.
  - **Field Alignment (+30 points)**: Regex match between program `field` and student's `interestedFields`.
  - **Budget Match (+20 points)**: Program `tuitionFeeUsd <= student.maxBudgetUsd`.
  - **Intake Availability (+10 points)**: Student's `preferredIntake` present in program `intakes`.
  - **IELTS Score Requirement (+5 points)**: Program `minimumIelts <= student.englishTest.score`.
- Dynamically computes `matchScore` and builds dynamic `reasons` string array natively inside MongoDB expressions using `$addFields`, `$cond`, `$concat`, and `$concatArrays`. Returns top 5 matched programs.

### 4. Application Workflow State Machine
- **Create Application (`POST /api/applications`)**:
  - Auto-fetches program and university details.
  - Prevents duplicate applications for the same student, program, and intake using service validation and MongoDB compound unique index `{ student: 1, program: 1, intake: 1 }`.
  - Initializes application status to `draft` and records initial history timeline entry.
- **Update Application Status (`PATCH /api/applications/:id/status`)**:
  - Enforces strict state transitions according to transition matrix:
    - `draft` $\rightarrow$ `["submitted"]`
    - `submitted` $\rightarrow$ `["under-review", "rejected"]`
    - `under-review` $\rightarrow$ `["offer-received", "rejected"]`
    - `offer-received` $\rightarrow$ `["visa-processing", "rejected"]`
    - `visa-processing` $\rightarrow$ `["enrolled", "rejected"]`
    - `enrolled` $\rightarrow$ `[]`
    - `rejected` $\rightarrow$ `[]`
  - Rejects invalid transitions with `400 Bad Request`.
  - Appends timeline history entry with timestamp and optional note.
  - Invalidates dashboard cache.

### 5. Performance & Caching Strategy
- **Redis Cache Integration**: Connected via `ioredis` with graceful fallback to `MemoryCacheService` if Redis is offline.
- **Cache Invalidation**: Invalidates `dashboard-overview` cache whenever new applications are created or status changes.
- **Lean Queries**: Applied `.lean()` across all read queries to omit Mongoose document overhead and maximize execution throughput.

### 6. AI-Powered University Recommendation

- **Endpoint:** `POST /api/ai/recommend`
- Built using **Groq API** with the **OpenAI SDK**.
- Generates personalized university and program recommendations based on:
  - Preferred Country
  - Budget
  - Field of Study
  - Target Intake
  - IELTS Score
  - CGPA
- Retrieves matching universities from MongoDB and uses AI to:
  - Rank universities by suitability.
  - Generate match scores.
  - Explain recommendation reasons.
  - Estimate admission chances.
  - Provide personalized application tips.
- Implements prompt templates, response validation, retry/timeout handling, and Redis/Memory cache for improved performance.

### 7. AI Study Abroad Planner

- **Endpoint:** `POST /api/ai/study-plan`
- Built using **Groq API** with the **OpenAI SDK**.
- Generates a personalized month-by-month study abroad roadmap based on:
  - Target Country
  - Target Intake
  - IELTS Progress
  - CGPA
  - Uploaded Documents
- AI creates a structured timeline covering:
  - University shortlisting
  - IELTS preparation
  - SOP & LOR preparation
  - Scholarship applications
  - University applications
  - Visa process
  - Financial planning
  - Accommodation & travel
- Returns structured JSON with timeline, personalized tips, and missing document recommendations.
- Uses reusable prompt templates, input validation, caching, and robust error handling for production-ready AI integration.

## Project Structure

```text
.
├── backend
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   ├── jest.config.js
│   ├── src
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config
│   │   │   ├── constants.js
│   │   │   ├── database.js
│   │   │   └── env.js
│   │   ├── controllers
│   │   │   ├── applicationController.js
│   │   │   ├── authController.js
│   │   │   ├── dashboardController.js
│   │   │   ├── healthController.js
│   │   │   ├── programController.js
│   │   │   ├── recommendationController.js
│   │   │   └── universityController.js
│   │   ├── data
│   │   │   └── seedData.js
│   │   ├── docs
│   │   │   └── swagger.yaml
│   │   ├── middleware
│   │   │   ├── auth.js
│   │   │   ├── errorHandler.js
│   │   │   ├── notFound.js
│   │   │   └── validators
│   │   │       ├── applicationValidator.js
│   │   │       ├── authValidator.js
│   │   │       ├── discoveryValidator.js
│   │   │       └── validateResult.js
│   │   ├── models
│   │   │   ├── Application.js
│   │   │   ├── Program.js
│   │   │   ├── Student.js
│   │   │   └── University.js
│   │   ├── routes
│   │   │   ├── applicationRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── dashboardRoutes.js
│   │   │   ├── healthRoutes.js
│   │   │   ├── programRoutes.js
│   │   │   ├── recommendationRoutes.js
│   │   │   └── universityRoutes.js
│   │   ├── scripts
│   │   │   └── seed.js
│   │   ├── services
│   │   │   ├── cacheService.js
│   │   │   └── recommendationService.js
│   │   └── utils
│   │       ├── asyncHandler.js
│   │       └── httpError.js
│   └── tests
│       ├── setup.js
│       ├── auth.test.js
│       ├── recommendation.test.js
│       └── application.test.js
├── docs
│   ├── Waygood_Candidate_Assignment.docx
│   └── Waygood_Postman_Collection.json
├── docker-compose.yml
├── package.json
└── README.md
```



## Assumptions & Architecture Decisions

1. **Role-Based Access Control**: Standard users are registered as `student` by default. Counselors have elevated privileges to view and manage applications on behalf of students.
2. **In-Memory Cache Fallback**: If Redis is not available locally or in container environment, system seamlessly falls back to Map-based in-memory caching without crashing.
3. **State Machine Integrity**: Terminal application states (`enrolled` and `rejected`) do not accept further status updates to prevent inconsistent application history.
