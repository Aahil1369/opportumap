import Groq from 'groq-sdk';
export const runtime = 'nodejs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { jobTitle, company, jobDescription } = await request.json();
    if (!jobTitle || !company) {
      return Response.json({ error: 'Job title and company are required' }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `You are a senior interviewer at ${company} hiring for a ${jobTitle} role. Generate a realistic interview question bank.

${jobDescription ? `Job description:\n${jobDescription.slice(0, 2000)}` : ''}

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "questions": [
    {
      "id": <1-15>,
      "category": "behavioral|technical|culture",
      "question": "<the interview question>",
      "why": "<why interviewers ask this — what they're really assessing>",
      "howToAnswer": "<specific advice on how to answer this for ${jobTitle} at ${company}>",
      "exampleAnswer": "<strong 2-sentence example answer using STAR method — be concise>"
    }
  ]
}

Generate exactly 15 questions:
- 5 behavioral (use STAR method — e.g. "Tell me about a time when...", "Describe a situation where...")
- 5 technical/role-specific (relevant to ${jobTitle} skills and responsibilities)
- 5 culture/company fit (specific to ${company}'s known culture and values)

Keep each field concise. exampleAnswer must be 2 sentences max. Make questions realistic and specific to this role, not generic.`,
        },
      ],
      max_tokens: 6000,
    });

    let text = completion.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // JSON was truncated — recover whatever complete question objects exist
      const partial = text.match(/\{[^{}]*"question"[^{}]*\}/g) || [];
      const questions = partial.map((q, i) => {
        try { return JSON.parse(q); } catch { return null; }
      }).filter(Boolean);
      if (questions.length === 0) throw new Error('Failed to parse interview questions. Please try again.');
      data = { questions };
    }
    return Response.json(data);
  } catch (err) {
    console.error('Interview questions error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
