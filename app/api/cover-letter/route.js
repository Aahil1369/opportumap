import Groq from 'groq-sdk';
export const runtime = 'nodejs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const formData = await request.formData();
    const jobDescription = formData.get('jobDescription');
    const tone = formData.get('tone') || 'professional';
    const profileRaw = formData.get('profile');
    const resumeFile = formData.get('resume');

    if (!jobDescription) {
      return Response.json({ error: 'Job description is required' }, { status: 400 });
    }

    let resumeText = '';
    if (resumeFile && resumeFile.size > 0) {
      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
      const pdfParse = pdfParseModule.default ?? pdfParseModule;
      const { text } = await pdfParse(buffer);
      resumeText = text.slice(0, 4000);
    }

    let profileText = '';
    if (profileRaw) {
      try {
        const profile = JSON.parse(profileRaw);
        profileText = `
Candidate profile:
- Name: ${profile.name || 'Not provided'}
- Current location: ${profile.currentCountry || 'Not provided'}
- Job types of interest: ${profile.jobTypes?.join(', ') || 'Not provided'}
- Skills: ${profile.skills || 'Not provided'}
- Experience level: ${profile.experienceLevel || 'Not provided'}
        `.trim();
      } catch {}
    }

    const toneInstructions = {
      professional: 'formal, confident, and polished — standard business tone',
      enthusiastic: 'warm, energetic, and genuinely excited about the role — still professional but with personality',
      concise: 'direct and punchy — no fluff, every sentence earns its place. 3 short paragraphs maximum',
    };

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `You are an expert career coach who writes cover letters that actually get interviews. Write a tailored cover letter based on the information below.

Tone: ${toneInstructions[tone] || toneInstructions.professional}

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

${resumeText ? `RESUME / EXPERIENCE:\n${resumeText}` : ''}
${profileText ? `\n${profileText}` : ''}

Write a complete, ready-to-send cover letter with:
1. A strong opening hook that shows you understand the role (not "I am writing to apply for...")
2. A paragraph on why THIS company specifically (not generic)
3. A paragraph matching your specific experience to the role's key requirements with concrete examples
4. A confident closing with clear call to action

Return ONLY valid JSON (no markdown) with this structure:
{
  "coverLetter": "<the full cover letter text, with \\n for line breaks between paragraphs>",
  "subjectLine": "<suggested email subject line>",
  "keywordsUsed": ["<ATS keyword you included>"],
  "tailoringNotes": ["<brief note on how you tailored this letter to this specific job>"]
}`,
        },
      ],
      max_tokens: 1500,
    });

    let text = completion.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    const data = JSON.parse(text);
    data.keywordsUsed = data.keywordsUsed || [];
    data.tailoringNotes = data.tailoringNotes || [];
    return Response.json(data);
  } catch (err) {
    console.error('Cover letter error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
