import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY || "",
  baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1",
});

const MODEL = process.env.AI_MODEL || "gpt-4o-mini";

interface GradeResult {
  score: number;       // 0-100
  feedback: string;    // per-question feedback
}

/**
 * Send student answers + rubric to the AI for grading.
 */
export async function gradeSubmission(
  questions: string[],
  answers: string[],
  rubric: string
): Promise<GradeResult> {
  const prompt = `You are a teaching assistant grading student work.

## Assignment Questions
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

## Student Answers
${answers.map((a, i) => `${i + 1}. ${a}`).join("\n")}

## Grading Rubric
${rubric}

## Instructions
Evaluate each answer against the rubric. Return valid JSON with exactly this shape:
{
  "score": <number 0-100>,
  "feedback": "<detailed feedback for each question>"
}
Return ONLY the JSON object, no markdown fences.`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const text = response.choices[0]?.message?.content?.trim() ?? "";

  try {
    const parsed = JSON.parse(text) as GradeResult;
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score))),
      feedback: String(parsed.feedback),
    };
  } catch {
    // If AI didn't return valid JSON, wrap the raw response
    return { score: 0, feedback: text || "AI grading failed — no response." };
  }
}
