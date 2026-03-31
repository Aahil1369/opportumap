// Improved job matching using TF-IDF style scoring against profile + resume

const SKILL_ALIASES = {
  'js': 'javascript', 'ts': 'typescript', 'py': 'python', 'ml': 'machine learning',
  'ai': 'artificial intelligence', 'nlp': 'natural language processing',
  'cv': 'computer vision', 'dl': 'deep learning', 'fe': 'frontend',
  'be': 'backend', 'fs': 'fullstack', 'k8s': 'kubernetes', 'tf': 'tensorflow',
};

function normalize(text) {
  if (!text) return '';
  let t = text.toLowerCase();
  for (const [alias, full] of Object.entries(SKILL_ALIASES)) {
    t = t.replace(new RegExp(`\\b${alias}\\b`, 'g'), full);
  }
  return t;
}

function extractKeywords(text) {
  return normalize(text)
    .split(/[\s,./|()]+/)
    .map(s => s.trim())
    .filter(s => s.length > 2);
}

export function scoreJob(job, profile) {
  if (!profile) return 0;

  // Include description so skills actually match real job text
  const descText = normalize((job.description || '').replace(/<[^>]+>/g, ' ').slice(0, 800));
  const titleText = normalize(`${job.title} ${job.company} ${job.location}`);
  const fullText = `${titleText} ${descText}`;
  const titleWords = new Set(extractKeywords(titleText));

  // Base floor — having a profile at all means you're a real candidate
  let score = 28;

  // --- Skills match (title hit = strong signal, description hit = moderate) ---
  const skillKeywords = extractKeywords(profile.skills || '');
  for (const skill of skillKeywords) {
    if (skill.length < 2) continue;
    if (titleText.includes(skill)) score += 10;       // title match is a strong signal
    else if (fullText.includes(skill)) score += 5;    // description match counts too
  }

  // --- Resume summary match ---
  const resumeKeywords = extractKeywords(profile.resumeSummary || '');
  for (const word of resumeKeywords) {
    if (word.length > 3 && titleWords.has(word)) score += 4;
  }

  // --- Experience level match (softer penalties) ---
  const title = normalize(job.title);
  const exp = profile.experience;
  const isSenior = /senior|lead|staff|principal|head|director|vp|architect/.test(title);
  const isJunior = /junior|intern|associate|entry|graduate|jr\.?/.test(title);
  const isMid = !isSenior && !isJunior;

  if (exp === 'student' || exp === '0-2') {
    if (isJunior) score += 20;
    if (isMid)   score += 8;
    if (isSenior) score -= 5;   // small penalty, not a dealbreaker
  } else if (exp === '3-5') {
    if (isMid)    score += 18;
    if (isSenior) score += 8;
    if (isJunior) score -= 3;
  } else if (exp === '5-10') {
    if (isSenior) score += 20;
    if (isMid)    score += 10;
  } else if (exp === '10+') {
    if (isSenior || /lead|director|vp|head/.test(title)) score += 22;
    else score += 8;
  }

  // --- Job type interest match ---
  const typeMap = {
    'Software Engineering': ['engineer', 'developer', 'software', 'fullstack', 'frontend', 'backend', 'web', 'mobile', 'ios', 'android'],
    'Data Science / ML':   ['data', 'machine learning', 'analytics', 'scientist', 'nlp', 'computer vision', 'llm', 'ai engineer'],
    'DevOps / Cloud':      ['devops', 'cloud', 'infrastructure', 'platform', 'sre', 'kubernetes', 'terraform', 'aws', 'azure', 'gcp'],
    'Product Management':  ['product manager', 'product owner', 'programme manager'],
    'Design':              ['design', 'ux', 'ui', 'figma', 'user experience', 'user interface', 'visual'],
    'Research':            ['research', 'scientist', 'phd', 'r&d', 'lab', 'academic'],
    'Finance / Fintech':   ['finance', 'fintech', 'quant', 'trading', 'banking', 'risk', 'analyst'],
  };
  for (const type of (profile.jobTypes || [])) {
    const keywords = typeMap[type] || [];
    if (keywords.some((k) => fullText.includes(k))) score += 15;
  }

  return Math.min(Math.max(score, 0), 99);
}

export function matchColor(score) {
  if (score >= 55) return { text: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' };
  if (score >= 25) return { text: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' };
  return { text: 'text-zinc-500', bg: 'bg-zinc-700/20 border-zinc-700/30' };
}
