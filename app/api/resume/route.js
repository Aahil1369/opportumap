import Groq from 'groq-sdk';
export const runtime = 'nodejs';

// Polyfill browser globals required by pdf-parse/pdfjs-dist in Node.js
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      this.a=1;this.b=0;this.c=0;this.d=1;this.e=0;this.f=0;
      this.m11=1;this.m12=0;this.m13=0;this.m14=0;
      this.m21=0;this.m22=1;this.m23=0;this.m24=0;
      this.m31=0;this.m32=0;this.m33=1;this.m34=0;
      this.m41=0;this.m42=0;this.m43=0;this.m44=1;
    }
  };
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume');
    if (!file) return Response.json({ error: 'No file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
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
