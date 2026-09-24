/**
 * XEENAPS CENTRALIZED AI MODEL CONFIG SERVICE
 * Synchronizes AI models dynamically from Google Spreadsheet:
 * Sheet ID: 1RVYM2-U5LRb8S8JElRSEv2ICHdlOp9pnulcAM8Nd44s (Sheet "AI")
 */

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1RVYM2-U5LRb8S8JElRSEv2ICHdlOp9pnulcAM8Nd44s/gviz/tq?tqx=out:csv&sheet=AI';

// In-memory cache for models
let cachedModels: Record<string, string> = {
  groq: 'llama-3.3-70b-versatile',
  groqsmart: 'llama-3.3-70b-versatile',
  gemini: 'gemini-2.5-flash',
  glm: 'glm-4-flash',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free'
};
let lastFetchedTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

/**
 * Parses simple CSV format from Google Spreadsheet CSV export
 */
const parseCsvRows = (csvText: string): [string, string][] => {
  const lines = csvText.split(/\r?\n/);
  const rows: [string, string][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    // Simple CSV parser handling quotes
    const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
    const cols: string[] = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      const val = match[1] ? match[1].replace(/""/g, '"') : match[2];
      cols.push((val || '').trim());
    }
    if (cols.length >= 2) {
      rows.push([cols[0], cols[1]]);
    }
  }
  return rows;
};

/**
 * Validates model name to avoid non-chat models like prompt-guard
 */
const sanitizeModelName = (provider: string, model: string): string => {
  const p = provider.toLowerCase();
  if (!model || !model.trim()) {
    if (p.includes('gemini')) return 'gemini-2.5-flash';
    if (p.includes('glm')) return 'glm-4-flash';
    if (p.includes('openrouter')) return 'meta-llama/llama-3.3-70b-instruct:free';
    return 'llama-3.3-70b-versatile';
  }
  let clean = model.trim();

  // If user provided a full Gemini endpoint URL (e.g. https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent)
  if (clean.includes('/models/')) {
    const match = clean.match(/\/models\/([^:]+)/);
    if (match && match[1]) {
      clean = match[1];
    }
  }

  // Filter out known classification/safety models that cannot do chat completion
  if (clean.includes('llama-prompt-guard') || clean.includes('safeguard')) {
    return 'llama-3.3-70b-versatile';
  }
  return clean;
};

/**
 * Fetches dynamic AI model name for a provider (e.g., 'Groq', 'GEMINI', 'GLM', 'OpenRouter')
 */
export const getDynamicAiModel = async (provider: string = 'Groq'): Promise<string> => {
  const normalizedKey = provider.toLowerCase().replace(/[^a-z0-9]/g, '');
  const now = Date.now();

  if (now - lastFetchedTime < CACHE_TTL_MS && cachedModels[normalizedKey]) {
    return cachedModels[normalizedKey];
  }

  try {
    const res = await fetch(SHEET_CSV_URL);
    if (res.ok) {
      const csvText = await res.text();
      const rows = parseCsvRows(csvText);

      rows.forEach(([prov, model]) => {
        const key = prov.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (key && model) {
          cachedModels[key] = sanitizeModelName(key, model);
        }
      });
      lastFetchedTime = now;
    }
  } catch (err) {
    console.warn('Failed to fetch central AI models from sheet, using cached default:', err);
  }

  if (cachedModels[normalizedKey]) {
    return cachedModels[normalizedKey];
  }
  if (normalizedKey.includes('gemini')) return 'gemini-2.5-flash';
  if (normalizedKey.includes('glm')) return 'glm-4-flash';
  if (normalizedKey.includes('openrouter')) return 'meta-llama/llama-3.3-70b-instruct:free';
  return 'llama-3.3-70b-versatile';
};
