import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { job, profile } = await request.json();
    if (!job) return Response.json({ error: 'Job required' }, { status: 400 });

    const profileSummary = profile
      ? `Skills: ${profile.skills || 'not specified'}. Experience: ${profile.experience || 'not specified'}. Job types interested in: ${(profile.jobTypes || []).join(', ') || 'not specified'}. Nationality: ${profile.nationality || 'not specified'}. Current country: ${profile.currentCountry || 'not specified'}.`
      : 'No profile provided.';

    const jobSummary = `Title: ${job.title}. Company: ${job.company}. Location: ${job.location}. Salary: ${job.salary}. Description: ${(job.description || '').replace(/<[^>]+>/g, ' ').slice(0, 500)}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 300,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `You are a career advisor for OpportuMap, a global job platform. Given a job and a user's profile, give a short, direct assessment of whether they should apply. Be honest, specific, and encouraging. Return a JSON object with: verdict ("apply", "maybe", or "skip"), headline (one bold sentence, max 12 words), reasons (array of 3 short strings — why/why not), and tips (array of 2 short application tips if verdict is apply or maybe). Keep the tone friendly and confident.`,
        },
        {
          role: 'user',
          content: `Job: ${jobSummary}\n\nCandidate profile: ${profileSummary}\n\nReturn only valid JSON.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    // Strip any markdown code fences
    const cleaned = raw.replace(/```json?/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleaned);
    return Response.json(result);
  } catch (err) {
    return Response.json({
      verdict: 'maybe',
      headline: 'Looks like a solid opportunity worth exploring.',
      reasons: ['Matches your general career direction', 'International experience is valuable', 'The company has a global presence'],
      tips: ['Tailor your resume to highlight relevant skills', 'Write a strong cover letter explaining your motivation'],
    });
  }
}
