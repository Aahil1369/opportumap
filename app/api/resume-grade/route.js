import Groq from 'groq-sdk';
export const runtime = 'nodejs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume');
    if (!file) return Response.json({ error: 'No file uploaded' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const { text: resumeText } = await pdfParse(buffer);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `You are an expert resume coach and recruiter. Analyze this resume thoroughly and return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "score": <integer 1-100, be honest and strict>,
  "grade": "<A+|A|A-|B+|B|B-|C+|C|C-|D|F>",
  "summary": "<2-3 sentence honest overall assessment>",
  "sectionScores": {
    "formatting": <1-100>,
    "experience": <1-100>,
    "skills": <1-100>,
    "education": <1-100>,
    "impact": <1-100>,
    "ats_compatibility": <1-100>
  },
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "improvements": [
    {"issue": "<specific problem>", "fix": "<concrete actionable fix>", "priority": "high|medium|low"}
  ],
  "jobMatches": [
    {"title": "<job title>", "matchScore": <1-100>, "reason": "<why this person qualifies>"}
  ],
  "keywords_missing": ["<keyword 1>", "<keyword 2>"],
  "name": "<candidate's name if visible, else null>"
}
Provide at least 3 strengths, 4 improvements, and 8 job matches. Be specific, not generic.

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
