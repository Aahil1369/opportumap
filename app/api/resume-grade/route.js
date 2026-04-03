import Groq from 'groq-sdk';
export const runtime = 'nodejs';


const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume');
    if (!file) return Response.json({ error: 'No file uploaded' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const { text: resumeText } = await pdfParse(buffer);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `You are a brutally honest senior recruiter who has reviewed over 10,000 resumes. You do not sugarcoat. You do not inflate scores to make people feel good. Your job is to tell the truth so candidates actually improve.

SCORING CALIBRATION:
- Average resume: 35-55. Do NOT score average resumes above 55.
- Good resume: 56-70.
- Strong resume: 71-85. Rare. Must have quantified impact, clean formatting, strong keywords.
- Exceptional: 86-100. Almost never seen. Top 1% of candidates only.
- If a resume has vague bullets, buzzwords without evidence, or no quantified achievements, it CANNOT score above 55.

TONE: Direct, cold, professional. Like a recruiter's internal notes. No cheerleading. Every weakness gets a concrete fix.

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "score": <integer 1-100, calibrated as above>,
  "grade": "<A+|A|A-|B+|B|B-|C+|C|C-|D|F>",
  "summary": "<2-3 sentences. Honest assessment. What a recruiter would actually think when they see this.>",
  "sectionScores": {
    "formatting": <1-100>,
    "experience": <1-100>,
    "skills": <1-100>,
    "education": <1-100>,
    "impact": <1-100>,
    "ats_compatibility": <1-100>
  },
  "strengths": ["<specific, genuine strength — only include if it actually exists>"],
  "improvements": [
    {"issue": "<specific problem, be blunt>", "fix": "<concrete actionable fix with example if possible>", "priority": "high|medium|low"}
  ],
  "redFlags": ["<thing that would cause immediate rejection: ATS failure, unexplained gap, red-flag formatting, lying indicators, etc.>"],
  "clichesFound": ["<overused buzzword found: e.g. 'team player', 'passionate', 'results-driven' with no numbers>"],
  "rewrittenBullets": [
    {"original": "<weak bullet copied verbatim from resume>", "rewritten": "<strong version with action verb + metric + impact>"}
  ],
  "jobMatches": [
    {"title": "<job title>", "matchScore": <1-100>, "reason": "<why this person qualifies or doesn't>"}
  ],
  "keywords_missing": ["<ATS keyword missing from resume>"],
  "name": "<candidate's name if visible, else null>"
}
Provide at least 3 strengths (only if genuine), 5 improvements, 3 red flags (or state none if truly clean), 3 rewritten bullets, and 8 job matches. Be specific, not generic. If the resume has no quantified achievements, say so directly.

RESUME TEXT:
${resumeText.slice(0, 6000)}`,
        },
      ],
      max_tokens: 2048,
    });

    let text = completion.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    const data = JSON.parse(text);
    return Response.json(data);
  } catch (err) {
    console.error('Resume grade error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
