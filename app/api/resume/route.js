import Groq from 'groq-sdk';
import pdfParse from 'pdf-parse';

export const runtime = 'nodejs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume');
    if (!file) return Response.json({ error: 'No file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text: resumeText } = await pdfParse(buffer);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: `Analyze this resume and return a JSON object with these exact fields (no markdown, no code blocks, just raw JSON):
{
  "skills": "comma-separated list of technical and professional skills",
  "experience": one of: "student", "0-2", "3-5", "5-10", "10+",
  "summary": "2-sentence professional summary of this person"
}

RESUME TEXT:
${resumeText.slice(0, 4000)}`,
        },
      ],
      max_tokens: 256,
    });

    const raw = completion.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    return Response.json(data);
  } catch (err) {
    console.error('Resume scan error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
