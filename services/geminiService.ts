
import { callAiProxy } from './gasService';

/**
 * AI Service for PKM and Knowledge Base operations.
 * Uses centralized dynamic models from Google Sheets and multi-key rotation from Supabase.
 */

export const summarizeContent = async (title: string, content: string): Promise<string> => {
  try {
    const prompt = `Summarize this knowledge item titled "${title}". 
    Content: ${content.substring(0, 8000)}
    Provide a concise summary (max 2-3 sentences). Output only text.`;
    
    const result = await callAiProxy('gemini', prompt, undefined, undefined, 'text');
    return result || 'No summary generated.';
  } catch (error) {
    console.error("Summarization error:", error);
    return 'AI summary unavailable at the moment.';
  }
};

export const suggestTags = async (title: string, content: string): Promise<string[]> => {
  try {
    const prompt = `Suggest exactly 5 relevant short tags for: "${title}" and "${content.substring(0, 2000)}".
    Output only tags separated by commas.`;
    
    const result = await callAiProxy('gemini', prompt, undefined, undefined, 'text');
    if (!result) return [];
    return result.split(',').map(tag => tag.trim().toLowerCase()).filter(t => t.length > 0);
  } catch (error) {
    console.error("Tag suggestion error:", error);
    return [];
  }
};

