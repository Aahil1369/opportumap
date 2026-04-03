import Groq from 'groq-sdk';
export const runtime = 'nodejs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { question, answer, jobTitle, category } = await request.json();
    if (!question || !answer) {
      return Response.json({ error: 'Question and answer required' }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `You are a senior interviewer evaluating a ${jobTitle || 'candidate'}'s answer to an interview question. Be honest and specific — not harsh, but not gentle either. Your goal is to help them actually improve.

Question: ${question}
Category: ${category || 'general'}

Candidate's answer:
"${answer}"

Return ONLY valid JSON (no markdown):
{
  "score": <1-10, where 7+ is good, 5-6 is acceptable, below 5 needs major work>,
  "verdict": "<one sentence summary — would this answer impress an interviewer? Be honest.>",
  "whatWorked": ["<specific thing they did well — only if genuine>"],
  "whatToImprove": ["<specific weakness with concrete fix>"],
  "strongerVersion": "<rewrite of their answer that would score a 9/10 — same role/context but much better>",
  "tips": ["<1-2 quick tips for this specific question type>"]
}`,
        },
      ],
      max_tokens: 1000,
    });

    let text = completion.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    const data = JSON.parse(text);
    data.whatWorked = data.whatWorked || [];
    data.whatToImprove = data.whatToImprove || [];
    data.tips = data.tips || [];
    return Response.json(data);
  } catch (err) {
    console.error('Interview feedback error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
