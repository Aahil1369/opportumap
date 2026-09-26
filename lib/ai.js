// Single source of truth for Groq models. Groq retires models without
// warning in-app (llama-3.3-70b-versatile + llama-3.1-8b-instant went away in
// 2026) — when that happens, swap the ids here.
// Check live ids: GET https://api.groq.com/openai/v1/models
//
// gpt-oss models reason before answering, and reasoning tokens count against
// max_tokens. 'low' keeps the budget for the answer and latency ~1-3s.
// Rate limits are per model, so fast/high-volume routes (salary, resume scan,
// job advice) stay on a separate model from the heavy ones.
export const GROQ_OPTIONS = { model: 'openai/gpt-oss-120b', reasoning_effort: 'low' };
export const GROQ_FAST_OPTIONS = { model: 'openai/gpt-oss-20b', reasoning_effort: 'low' };
