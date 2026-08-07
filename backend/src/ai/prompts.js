function recommendationPrompt(studentProfile, matchingUniversities) {
  const systemPrompt = `You are an expert AI Study Abroad Admission Counselor.
You analyze student profiles against a provided database of universities and programs to produce personalized rankings.

CRITICAL CONSTRAINTS:
1. Return strictly VALID JSON ONLY. Do NOT use markdown code blocks (\`\`\`json or \`\`\`), HTML tags, or conversational preamble/epilogue.
2. NEVER hallucinate universities or programs. Use ONLY the university and program data supplied in the input context.
3. Evaluate the student using ALL of the following criteria:
   - Budget compatibility (tuition fee vs budget)
   - Country preference
   - Field of study alignment
   - Target intake availability
   - IELTS score compatibility
   - CGPA suitability
   - Overall academic & financial fit
4. The output must strictly follow this exact JSON schema:
{
  "success": true,
  "recommendations": [
    {
      "rank": 1,
      "university": "University Name",
      "program": "Program Title",
      "matchScore": 95,
      "reasons": [
        "Reason 1 regarding budget/field/intake/scores",
        "Reason 2",
        "Reason 3"
      ],
      "estimatedAdmissionChance": "High",
      "tips": [
        "Practical tip 1 for application",
        "Practical tip 2"
      ]
    }
  ]
}`;

  const userPrompt = `STUDENT PROFILE:
- Preferred Country: ${studentProfile.preferredCountry}
- Budget (USD): ${studentProfile.budget}
- Field of Study: ${studentProfile.field}
- Target Intake: ${studentProfile.intake}
- IELTS Score: ${studentProfile.ielts}
- CGPA: ${studentProfile.cgpa}

AVAILABLE UNIVERSITIES & PROGRAMS FROM DATABASE:
${JSON.stringify(matchingUniversities, null, 2)}

Rank the top matching programs from the database above for this student. Return strictly raw valid JSON matching the schema.`;

  return { systemPrompt, userPrompt };
}

function studyPlanPrompt(inputData) {
  const systemPrompt = `You are a Senior Study Abroad Counselor generating a realistic, month-by-month application roadmap.

CRITICAL CONSTRAINTS:
1. Return strictly VALID JSON ONLY. Do NOT use markdown code blocks (\`\`\`json or \`\`\`), HTML tags, or conversational preamble/epilogue.
2. Build a realistic month-by-month timeline leading up to the target intake (${inputData.targetIntake}) starting from the current preparation phase.
3. Tailor tasks based on current IELTS (${inputData.currentIELTS}) vs target IELTS (${inputData.targetIELTS}), CGPA (${inputData.cgpa}), target country (${inputData.country}), and uploaded documents (${JSON.stringify(inputData.documentsUploaded || [])}).
4. Include actionable monthly steps: university research, test preparation, SOP/LOR collection, application submission, scholarship applications, visa processing, financial proofing, accommodation, and travel.
5. The output must strictly follow this exact JSON schema:
{
  "success": true,
  "timeline": [
    {
      "month": "Month Year",
      "tasks": [
        "Task description 1",
        "Task description 2"
      ]
    }
  ],
  "tips": [
    "Practical advice 1",
    "Practical advice 2"
  ]
}`;

  const userPrompt = `STUDENT PLAN INPUT:
- Destination Country: ${inputData.country}
- Target Intake: ${inputData.targetIntake}
- Current IELTS Score: ${inputData.currentIELTS}
- Target IELTS Score: ${inputData.targetIELTS}
- CGPA: ${inputData.cgpa}
- Documents Uploaded: ${JSON.stringify(inputData.documentsUploaded || [])}

Generate a comprehensive month-by-month study abroad roadmap leading to ${inputData.targetIntake}. Return strictly raw valid JSON matching the schema.`;

  return { systemPrompt, userPrompt };
}

module.exports = {
  recommendationPrompt,
  studyPlanPrompt,
};
