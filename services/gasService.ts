
import { LibraryItem, GASResponse, ExtractionResult } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { getActiveApiKeys } from './ApiKeySupabaseService';
import { getDynamicAiModel } from './aiConfigService';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

/**
 * Manage API Keys (Gemini, Groq, ScrapingAnt) via GAS Backend
 */
export const manageApiKeys = async (payload: any): Promise<GASResponse<any>> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: JSON.stringify({ 
        action: 'manageApiKey',
        ...payload
      }),
    });
    return await response.json();
  } catch (error: any) {
    return { status: 'error', message: error.toString() };
  }
};

export const initializeDatabase = async (): Promise<{ status: string; message: string }> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: JSON.stringify({ action: 'setupDatabase' }),
    });
    return await response.json();
  } catch (error: any) {
    return { status: 'error', message: error.toString() };
  }
};

/**
 * NEW: Initialize Consultation Database Structure
 */
export const initializeConsultationDatabase = async (): Promise<{ status: string; message: string }> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: JSON.stringify({ action: 'setupConsultationDatabase' }),
    });
    return await response.json();
  } catch (error: any) {
    return { status: 'error', message: error.toString() };
  }
};

/**
 * NEW: Initialize Brainstorming Database Structure (Optional Legacy)
 */
export const initializeBrainstormingDatabase = async (): Promise<{ status: string; message: string }> => {
  // Legacy stub, real logic moved to Supabase service
  return { status: 'success', message: 'Brainstorming DB ready (Supabase managed).' };
};

/**
 * NEW: Initialize Publication Database Structure (Optional Legacy)
 */
export const initializePublicationDatabase = async (): Promise<{ status: string; message: string }> => {
  // Legacy stub
  return { status: 'success', message: 'Publication DB ready (Supabase managed).' };
};

export const deleteLibraryItem = async (id: string): Promise<boolean> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: JSON.stringify({ action: 'deleteItem', id }),
    });
    const result = await response.json();
    return result.status === 'success';
  } catch (error) {
    console.error("Delete failed:", error);
    return false;
  }
};

export const callAiProxy = async (
  provider: 'gemini' | 'groq' | 'glm' | 'openrouter' | string = 'groq', 
  prompt: string, 
  modelOverride?: string,
  signal?: AbortSignal,
  responseType?: 'json' | 'text' 
): Promise<string> => {
  const normProvider = provider.toLowerCase().trim();

  // 1. DIRECT EXECUTION: GEMINI
  if (normProvider === 'gemini') {
    try {
      const activeGeminiKeys = await getActiveApiKeys('gemini');
      const targetModel = modelOverride || await getDynamicAiModel('GEMINI');

      if (activeGeminiKeys.length > 0) {
        for (let i = 0; i < activeGeminiKeys.length; i++) {
          const key = activeGeminiKeys[i];
          try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;
            const bodyPayload: any = {
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: responseType === 'json' ? 'application/json' : 'text/plain'
              }
            };

            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bodyPayload),
              signal
            });

            if (res.ok) {
              const data = await res.json();
              const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (textOutput) return textOutput;
            } else {
              const errBody = await res.text();
              console.warn(`Gemini Key #${i + 1} attempt failed (${res.status}):`, errBody);
              if (res.status === 429 || res.status === 400 || res.status === 403) {
                continue;
              }
            }
          } catch (keyErr: any) {
            if (keyErr.name === 'AbortError') return '';
            console.warn(`Gemini Key #${i + 1} network error:`, keyErr);
          }
        }
      }
    } catch (directGeminiErr) {
      console.warn('Direct Gemini execution fallback:', directGeminiErr);
    }
  }

  // 2. DIRECT EXECUTION: OPENROUTER
  if (normProvider === 'openrouter') {
    try {
      const activeKeys = await getActiveApiKeys('openrouter');
      const targetModel = modelOverride || await getDynamicAiModel('OpenRouter');

      if (activeKeys.length > 0) {
        for (let i = 0; i < activeKeys.length; i++) {
          const key = activeKeys[i];
          try {
            const bodyPayload: any = {
              model: targetModel,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.2
            };
            if (responseType === 'json') {
              bodyPayload.response_format = { type: 'json_object' };
            }

            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`,
                'HTTP-Referer': 'https://xeenaps.app',
                'X-Title': 'Xeenaps PKM'
              },
              body: JSON.stringify(bodyPayload),
              signal
            });

            if (res.ok) {
              const data = await res.json();
              const textOutput = data.choices?.[0]?.message?.content || '';
              if (textOutput) return textOutput;
            } else {
              const errBody = await res.text();
              console.warn(`OpenRouter Key #${i + 1} failed (${res.status}):`, errBody);
              if (res.status === 429 || res.status === 401 || res.status === 402) {
                continue;
              }
            }
          } catch (keyErr: any) {
            if (keyErr.name === 'AbortError') return '';
            console.warn(`OpenRouter Key #${i + 1} error:`, keyErr);
          }
        }
      }
    } catch (directErr) {
      console.warn('Direct OpenRouter execution fallback:', directErr);
    }
  }

  // 3. DIRECT EXECUTION: GLM (ZHIPU AI)
  if (normProvider === 'glm') {
    try {
      const activeKeys = await getActiveApiKeys('glm');
      const targetModel = modelOverride || await getDynamicAiModel('GLM');

      if (activeKeys.length > 0) {
        for (let i = 0; i < activeKeys.length; i++) {
          const key = activeKeys[i];
          try {
            const bodyPayload: any = {
              model: targetModel,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.2
            };

            const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
              },
              body: JSON.stringify(bodyPayload),
              signal
            });

            if (res.ok) {
              const data = await res.json();
              const textOutput = data.choices?.[0]?.message?.content || '';
              if (textOutput) return textOutput;
            } else {
              const errBody = await res.text();
              console.warn(`GLM Key #${i + 1} failed (${res.status}):`, errBody);
              if (res.status === 429 || res.status === 401) {
                continue;
              }
            }
          } catch (keyErr: any) {
            if (keyErr.name === 'AbortError') return '';
            console.warn(`GLM Key #${i + 1} error:`, keyErr);
          }
        }
      }
    } catch (directErr) {
      console.warn('Direct GLM execution fallback:', directErr);
    }
  }

  // 4. DIRECT EXECUTION: GROQ (OR UNIVERSAL GROQ FALLBACK)
  if (normProvider === 'groq' || normProvider === 'gemini' || normProvider === 'openrouter' || normProvider === 'glm') {
    try {
      const activeKeys = await getActiveApiKeys('groq');
      const targetModel = (normProvider === 'groq' && modelOverride) ? modelOverride : await getDynamicAiModel('Groq');

      if (activeKeys.length > 0) {
        // Iterate through keys (Smart Multi-Key Failover)
        for (let i = 0; i < activeKeys.length; i++) {
          const key = activeKeys[i];
          try {
            const bodyPayload: any = {
              model: targetModel,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.2
            };
            if (responseType === 'json') {
              bodyPayload.response_format = { type: 'json_object' };
            }

            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
              },
              body: JSON.stringify(bodyPayload),
              signal
            });

            if (res.ok) {
              const data = await res.json();
              const textOutput = data.choices?.[0]?.message?.content || '';
              if (textOutput) return textOutput;
            } else {
              const errBody = await res.text();
              console.warn(`Groq Key #${i + 1} attempt failed (${res.status}):`, errBody);
              if (res.status === 429 || res.status === 401) {
                continue;
              }
            }
          } catch (keyErr: any) {
            if (keyErr.name === 'AbortError') return '';
            console.warn(`Groq Key #${i + 1} network error:`, keyErr);
          }
        }
      }
    } catch (directErr) {
      console.warn('Direct Groq execution fallback to GAS:', directErr);
    }
  }

  // 5. FALLBACK TO GAS WEB APP PROXY
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const targetModel = modelOverride || await getDynamicAiModel(provider);

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: JSON.stringify({ 
        action: 'aiProxy', 
        provider, 
        prompt, 
        modelOverride: targetModel,
        responseType
      }),
      signal
    });
    const result = await response.json();
    if (result.status === 'success') {
      return result.data;
    } else {
      console.error("AI Proxy Error:", result.message);
      return '';
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // Silent abort
    } else {
      console.error("AI Proxy Connection Failed:", error);
    }
    return '';
  }
};

/**
 * Upload File Helper for Library
 */
export const uploadAndStoreFile = async (
  file: File, 
  metadata: Partial<LibraryItem>
): Promise<{ status: string; fileId?: string; nodeUrl?: string; message?: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
        
        const response = await fetch(GAS_WEB_APP_URL, {
          method: 'POST',
          mode: 'cors',
          redirect: 'follow',
          body: JSON.stringify({
            action: 'saveItem',
            item: metadata,
            file: {
              fileName: file.name,
              mimeType: file.type,
              fileData: base64Data
            }
          })
        });
        const result = await response.json();
        resolve(result);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
};

/**
 * Save Extracted Content (Text) to Drive via GAS (Sharding)
 * Used by ContentManagerModal
 */
export const saveExtractedContentToDrive = async (
  item: LibraryItem, 
  content: string
): Promise<{ status: string, fileId: string, nodeUrl: string } | null> => {
  try {
    if (!GAS_WEB_APP_URL) return null;

    // 1. UPDATE MODE: If ID exists, overwrite the existing file
    if (item.extractedJsonId) {
      const targetUrl = item.storageNodeUrl || GAS_WEB_APP_URL;
      const jsonContent = JSON.stringify({ id: item.id, fullText: content });
      
      const payload = {
        action: 'saveJsonFile',
        fileId: item.extractedJsonId,
        fileName: `extracted_${item.id}.json`,
        content: jsonContent
      };

      const response = await fetch(targetUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        return { 
           status: 'success', 
           fileId: item.extractedJsonId, 
           nodeUrl: targetUrl 
        };
      }
      return null;
    }

    // 2. CREATE MODE: Register new file (Let GAS handle storage balancing)
    const payload = {
      action: 'saveItem',
      item: item,
      extractedText: content
      // No binary file attached
    };
    
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (result.status === 'success') {
       // IMPORTANT: Map extractedJsonId to fileId for modal compatibility
       return {
         status: 'success',
         fileId: result.extractedJsonId,
         nodeUrl: result.nodeUrl
       };
    }
    return result;
  } catch (e) {
    return null;
  }
};

/**
 * Helper: Create Empty Insight File if missing
 */
export const createEmptyInsightFile = async (item: LibraryItem, nodeUrl?: string): Promise<string | null> => {
  try {
    if (!GAS_WEB_APP_URL) return null;
    const targetUrl = nodeUrl || GAS_WEB_APP_URL;

    // Use generic saveJsonFile action
    const res = await fetch(targetUrl, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'saveJsonFile', 
        fileName: `insight_${item.id}.json`, 
        content: JSON.stringify({}) 
      })
    });
    const result = await res.json();
    return result.status === 'success' ? result.fileId : null;
  } catch (e) {
    return null;
  }
};

/**
 * Extract Metadata from URL via GAS (Scraping)
 */
export const extractFromUrl = async (url: string): Promise<any> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: JSON.stringify({ action: 'extractOnly', url }),
    });
    return await response.json();
  } catch (error: any) {
    return { status: 'error', message: error.toString() };
  }
};

/**
 * Identifier Search Proxy
 */
export const callIdentifierSearch = async (idValue: string, signal?: AbortSignal): Promise<any> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: JSON.stringify({ action: 'searchByIdentifier', idValue }),
      signal
    });
    const result = await response.json();
    return result.status === 'success' ? result.data : null;
  } catch (error) {
    return null;
  }
};

/**
 * Generate Citations
 */
export const generateCitations = async (item: LibraryItem, style: string, language: string): Promise<any> => {
  try {
    const prompt = `You are a citation expert. Generate an accurate academic citation for this item in ${style} format (in ${language} language).
Title: "${item.title || ''}"
Authors: "${Array.isArray(item.authors) ? item.authors.join(', ') : item.authors || ''}"
Year: "${item.year || ''}"
Publisher/Journal: "${item.journalName || item.publisher || ''}"
DOI/URL: "${item.doi || item.url || ''}"

Return ONLY a valid JSON object with this exact structure:
{
  "citation": "Complete formatted citation text",
  "inTextCitation": "Formatted in-text citation (e.g. (Author et al., Year))"
}`;

    const res = await callAiProxy('gemini', prompt, undefined, undefined, 'json');
    if (res) {
      const clean = res.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(clean);
      if (parsed.citation) {
        return parsed;
      }
    }
  } catch (directErr) {
    console.warn('Direct citation generation fallback to GAS:', directErr);
  }

  // Fallback to GAS
  try {
    if (!GAS_WEB_APP_URL) return null;
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'generateCitations', item, style, language })
    });
    const result = await response.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};

/**
 * Generate Insight (AI Insighter & Deep Summary)
 */
export const generateInsight = async (item: LibraryItem): Promise<any> => {
  // 1. Direct High-Precision Synthesis via Gemini/Groq
  try {
    let textToAnalyze = (item as any).fullText || '';
    if (!textToAnalyze && item.extractedJsonId) {
      const stored = await fetchFileContent(item.extractedJsonId, item.storageNodeUrl);
      if (stored) {
        textToAnalyze = typeof stored === 'string' ? stored : (stored.fullText || stored.text || '');
      }
    }
    if (!textToAnalyze) {
      textToAnalyze = `${item.title}\n\nAbstract: ${item.abstract || ''}`;
    }

    const insightPrompt = `You are a world-class academic scholar, peer reviewer, and AI research librarian.
Thoroughly analyze this document and generate deep, scholarly, and insightful analysis.

Title: "${item.title || ''}"
Authors: "${Array.isArray(item.authors) ? item.authors.join(', ') : item.authors || ''}"
Year: "${item.year || ''}"

Document Content:
${textToAnalyze.substring(0, 40000)}

Return a strict JSON object with these EXACT keys (write rich, well-structured HTML inside the string values using <p>, <strong>, <em>, <ul>, <li>):
{
  "summary": "<p>A comprehensive and clear executive summary highlighting the core problem, objectives, research questions, methodologies, key findings, and theoretical/practical significance.</p>",
  "strength": "<ul><li><strong>Key Strength 1:</strong> Description</li><li><strong>Key Strength 2:</strong> Description</li><li><strong>Key Strength 3:</strong> Description</li></ul>",
  "weakness": "<ul><li><strong>Limitation 1:</strong> Description</li><li><strong>Limitation 2:</strong> Description</li><li><strong>Limitation 3:</strong> Description</li></ul>",
  "researchMethodology": "<p>Detailed breakdown of research design, qualitative/quantitative methods, sample/dataset characteristics, instrumentation, and analytical techniques used.</p>",
  "unfamiliarTerminology": "<ul><li><strong>Term 1:</strong> Clear and accessible explanation</li><li><strong>Term 2:</strong> Clear and accessible explanation</li><li><strong>Term 3:</strong> Clear and accessible explanation</li></ul>",
  "quickTipsForYou": "<ul><li><strong>Actionable Takeaway 1:</strong> Practical guidance for researchers or practitioners</li><li><strong>Actionable Takeaway 2:</strong> Practical guidance</li></ul>",
  "supportingReferences": [],
  "videoRecommendation": []
}`;

    const res = await callAiProxy('gemini', insightPrompt, undefined, undefined, 'json');
    if (res) {
      const clean = res.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(clean);
      if (parsed.summary) {
        // Save insights in background to Drive/Supabase
        saveInsightContentToDrive(item, parsed).catch(err => console.warn('Save insight background error:', err));
        return {
          ...parsed,
          insightJsonId: item.insightJsonId || '',
          storageNodeUrl: item.storageNodeUrl || ''
        };
      }
    }
  } catch (directErr) {
    console.warn('Direct Insight generation fallback to GAS:', directErr);
  }

  // 2. Fallback to GAS Web App
  try {
    if (!GAS_WEB_APP_URL) return null;
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'generateInsight', item })
    });
    const result = await response.json();
    return result.status === 'success' ? result.data : null;
  } catch (e) {
    return null;
  }
};

/**
 * Translate Insight Section
 */
export const translateInsightSection = async (item: LibraryItem, sectionName: string, targetLang: string): Promise<string | null> => {
  const currentContent = (item as any)[sectionName] || '';
  if (currentContent && typeof currentContent === 'string') {
    try {
      const prompt = `You are a professional academic translator. Translate the following scholarly HTML content into ${targetLang}. 
CRITICAL RULE: Preserve all HTML tags (<p>, <strong>, <em>, <ul>, <li>, etc.) exactly as they are. Output ONLY the translated HTML string without markdown code blocks.

Content to translate:
${currentContent}`;

      const translated = await callAiProxy('gemini', prompt, undefined, undefined, 'text');
      if (translated && translated.trim()) {
        const clean = translated.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        return clean;
      }
    } catch (e) {
      console.warn('Direct translation fallback to GAS:', e);
    }
  }

  try {
    if (!GAS_WEB_APP_URL || !item.insightJsonId) return null;
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'translateInsightSection', 
        fileId: item.insightJsonId, 
        sectionName, 
        targetLang,
        nodeUrl: item.storageNodeUrl 
      })
    });
    const result = await response.json();
    return result.status === 'success' ? result.translatedText : null;
  } catch (e) {
    return null;
  }
};

/**
 * Fetch File Content (JSON Sharding)
 */
export const fetchFileContent = async (fileId: string, nodeUrl?: string): Promise<any> => {
  if (!fileId) return null;
  try {
    const targetUrl = nodeUrl || GAS_WEB_APP_URL;
    if (!targetUrl) return null;
    const finalUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=getFileContent&fileId=${fileId}`;
    const response = await fetch(finalUrl);
    const result = await response.json();
    return result.status === 'success' ? JSON.parse(result.content) : null;
  } catch (e) {
    return null;
  }
};

/**
 * Save Insight Content back to Drive via GAS (saveJsonFile)
 */
export const saveInsightContentToDrive = async (item: LibraryItem, insightsData: any): Promise<boolean> => {
  try {
    if (!GAS_WEB_APP_URL || !item.insightJsonId) return false;
    const targetUrl = item.storageNodeUrl || GAS_WEB_APP_URL;
    
    const payload = {
      action: 'saveJsonFile',
      fileId: item.insightJsonId,
      fileName: `insight_${item.id}.json`,
      content: JSON.stringify(insightsData)
    };

    const response = await fetch(targetUrl, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    return result.status === 'success';
  } catch (e) {
    console.error("Failed to save insight to Drive:", e);
    return false;
  }
};

/**
 * Process Library File in Cloud (Heavy Lifting Worker)
 * Delegates complex extraction and file saving to GAS to avoid browser timeouts.
 */
export const processLibraryFileInCloud = async (
  item: any, 
  fileUploadData?: { fileName: string, mimeType: string, fileData: string }, 
  extractedText?: string
): Promise<any> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');

    const payload = {
      action: 'saveItem',
      item: item,
      file: fileUploadData,
      extractedText: extractedText
    };

    // Use a longer timeout fetch wrapper or standard fetch
    // Note: Standard fetch doesn't have timeout, browsers default to ~300s
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    return await response.json();
  } catch (error: any) {
    return { status: 'error', message: error.toString() };
  }
};
