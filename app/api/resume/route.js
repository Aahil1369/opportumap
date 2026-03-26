import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume');
    if (!file) return Response.json({ error: 'No file' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          {
            type: 'text',
            text: `Analyze this resume and return a JSON object with these exact fields:
{
  "skills": "comma-separated list of technical and professional skills",
  "experience": one of: "student", "0-2", "3-5", "5-10", "10+",
  "summary": "2-sentence professional summary of this person"
}
Return only valid JSON, no markdown.`,
          },
        ],
      }],
    });

    const text = message.content[0].text.trim();
    const data = JSON.parse(text);
    return Response.json(data);
  } catch (err) {
    console.error('Resume scan error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
