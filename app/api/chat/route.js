import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { messages, profile } = await request.json();

    const systemPrompt = `You are OpportuMap AI — a career and global relocation assistant built into OpportuMap, a platform that helps people find jobs worldwide and navigate moving to a new country.

${profile ? `
USER PROFILE:
- Name: ${profile.name || 'Unknown'}
- Nationality: ${profile.nationality || 'Unknown'}
- Currently lives in: ${profile.currentCountry || 'Unknown'}
- Experience level: ${profile.experience || 'Unknown'}
- Interested in: ${profile.jobTypes?.join(', ') || 'Not specified'}
- Skills: ${profile.skills || 'Not specified'}
${profile.resumeSummary ? `- Resume summary: ${profile.resumeSummary}` : ''}
` : 'No profile set up yet.'}

You have knowledge of:
- Visa requirements for all major nationalities to US, UK, Canada, Australia, Germany, India, Singapore
- Work visa types, how to apply, processing times
- Cost of living, neighborhoods, safety in each country
- Legal first steps when relocating (registering, bank accounts, healthcare)
- Salary ranges by role and country
- Job search strategies for international applicants

Be friendly, concise, and practical. Give actionable advice. Keep responses under 200 words unless asked for detail. Use bullet points where helpful.`;

    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      max_tokens: 512,
    });

    return Response.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error('Chat error:', err?.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
