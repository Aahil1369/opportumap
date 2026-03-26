import Anthropic from '@anthropic-ai/sdk';
import { VISA_INFO, SETTLEMENT_INFO } from '../../data/visaData';
import { COUNTRY_NAMES } from '../../data/countries';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
- Community building and roommate finding when relocating

Be friendly, concise, and practical. Give actionable advice. If you don't know something specific, say so honestly.
Keep responses under 200 words unless asked for detail. Use bullet points where helpful.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    return Response.json({ reply: response.content[0].text });
  } catch (err) {
    console.error('Chat error:', err?.message, err?.status, err?.error);
    return Response.json({ error: err.message, detail: err?.error }, { status: 500 });
  }
}
