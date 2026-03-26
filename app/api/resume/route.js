import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume');
    if (!file) return Response.json({ error: 'No file' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64 } },
            {
              text: `Analyze this resume and return a JSON object with these exact fields (no markdown, no code blocks, just raw JSON):
{
  "skills": "comma-separated list of technical and professional skills",
  "experience": one of: "student", "0-2", "3-5", "5-10", "10+",
  "summary": "2-sentence professional summary of this person"
}`,
            },
          ],
        },
      ],
    });

    const text = response.text.trim().replace(/```json|```/g, '').trim();
    const data = JSON.parse(text);
    return Response.json(data);
  } catch (err) {
    console.error('Resume scan error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
