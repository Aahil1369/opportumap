// Netlify Scheduled Function — runs daily at 2am UTC to refresh jobs
// Docs: https://docs.netlify.com/functions/scheduled-functions/
import { schedule } from '@netlify/functions';

const handler = schedule('0 2 * * *', async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_URL || 'https://opportumap.netlify.app';
  const secret = process.env.INGEST_SECRET || '';

  try {
    const res = await fetch(`${siteUrl}/api/ingest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    console.log('[daily-ingest]', data);
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    console.error('[daily-ingest] failed:', err.message);
    return { statusCode: 500, body: err.message };
  }
});

export { handler };
