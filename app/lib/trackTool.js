export async function trackTool(tool) {
  try {
    await fetch('/api/tool-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool }),
    });
  } catch {}
}
