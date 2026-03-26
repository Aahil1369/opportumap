import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = ai.chats.create({
      model: 'gemini-2.0-flash',
      config: { systemInstruction: systemPrompt },
      history,
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage({ message: lastMessage.content });

    return Response.json({ reply: result.text });
  } catch (err) {
    console.error('Chat error:', err?.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
