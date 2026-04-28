import pptxgen from 'pptxgenjs';
import { LibraryItem, PresentationItem, PresentationTemplate, PresentationThemeConfig, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { callAiProxy, fetchFileContent } from './gasService';
import { 
  fetchPresentationsPaginatedFromSupabase, 
  upsertPresentationToSupabase, 
  deletePresentationFromSupabase 
} from './PresentationSupabaseService';
import * as Templates from './PresentationTemplates';

/**
 * XEENAPS PRESENTATION SERVICE V46 (SUPABASE REGISTRY + GAS WORKER)
 */

const LOGO_ICON_URL = "https://lh3.googleusercontent.com/d/1ZpVAXWGLDP2C42Fct0bisloaQLf2095_";

const fetchLogoAsBase64 = async (): Promise<string | undefined> => {
  try {
    const res = await fetch(GAS_WEB_APP_URL!, {
      method: 'POST',
      body: JSON.stringify({ action: 'fetchImageProxy', url: LOGO_ICON_URL })
    });
    const result = await res.json();
    return result.status === 'success' ? result.data : undefined;
  } catch (e) {
    return undefined;
  }
};

const cleanAiJson = (text: string): string => {
  try {
    let json = text.trim();
    json = json.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const start = json.search(/\{|\[/);
    const end = Math.max(json.lastIndexOf('}'), json.lastIndexOf(']'));
    if (start !== -1 && end !== -1) json = json.substring(start, end + 1);
    return json.replace(/,\s*([\]}])/g, '$1'); 
  } catch (e) {
    return text;
  }
};

const extractBestText = (data: any): string => {
  if (typeof data === 'string') return data;
  if (!data) return "";
  const keys = ['text', 'content', 'body', 'description', 'insight', 'analysis', 'message'];
  for (const k of keys) {
    if (data[k] && typeof data[k] === 'string') return data[k];
  }
  const stringVals = Object.values(data).filter(v => typeof v === 'string');
  if (stringVals.length > 0) return stringVals.join('\n\n');
  return ""; 
};

const mapListItems = (data: any): {h: string, b: string}[] => {
  const rawItems = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.points) ? data.points : []));
  return rawItems.map((item: any) => {
    if (typeof item === 'string') return { h: "Insight", b: item };
    return {
      h: item.h || item.title || item.heading || item.topic || "Point",
      b: extractBestText(item) || item.b || item.desc || item.description || ""
    };
  });
};

const dispatchLayout = (slide: pptxgen.Slide, sData: any, theme: PresentationThemeConfig, logoBase64?: string) => {
  const layout = (sData.layoutType || '1_CARD').toUpperCase();
  const title = sData.title || "Core Insight";
  const data = sData.data || {}; 

  switch (layout) {
    case '2_COL':
      Templates.drawContentTwoColumn(slide, title, { 
        left: extractBestText(data?.left || data?.col1 || ""), 
        right: extractBestText(data?.right || data?.col2 || "") 
      }, theme, logoBase64);
      break;
    case '3_COL':
      Templates.drawContentThreeColumn(slide, title, mapListItems(data), theme, logoBase64);
      break;
    case '2X2':
      Templates.drawContentTwoByTwo(slide, title, mapListItems(data), theme, logoBase64);
      break;
    case 'STACKING':
      Templates.drawContentStacking(slide, title, mapListItems(data), theme, logoBase64);
      break;
    case '1_CARD':
    default:
      Templates.drawContentUniversal(slide, title, extractBestText(data), theme, logoBase64);
      break;
  }
};

export const createPresentationWorkflow = async (
  items: LibraryItem[],
  config: {
    title: string;
    context: string;
    presenters: string[];
    theme: PresentationThemeConfig;
    slidesCount: number;
    language: string;
  },
  onProgress?: (stage: string) => void
): Promise<PresentationItem | null> => {
  if (!GAS_WEB_APP_URL || items.length === 0) return null;

  try {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    
    onProgress?.("Preparing...");
    const logoBase64 = await fetchLogoAsBase64();

    onProgress?.("Context extraction...");
    let combinedContext = "";
    for (const item of items) {
      let docText = item.abstract || item.title;
      if (item.extractedJsonId) {
        try {
          const fileData = await fetchFileContent(item.extractedJsonId, item.storageNodeUrl);
          if (fileData && fileData.fullText) {
            docText = fileData.fullText;
          }
        } catch (fetchErr) {
          console.warn(`Failed to harvest full text for ${item.title}, falling back to abstract.`);
        }
      }
      combinedContext += `--- SOURCE: ${item.title} (ID: ${item.id}) ---\n${docText}\n\n`;
    }

    onProgress?.("Synthesizing information...");
    const contextSnippet = combinedContext.substring(0, 100000); 
    const aiContentSlidesCount = Math.max(1, config.slidesCount - 2);
    
    const referenceTitleMap: Record<string, string> = {
      'indonesian': 'REFERENSI', 'english': 'REFERENCES', 'french': 'RÉFÉRENCES', 'german': 'REFERENZEN', 'spanish': 'REFERENCIAS', 'japanese': '参考文献'
    };
    const langKey = config.language.toLowerCase();
    const referenceTitle = referenceTitleMap[langKey] || "REFERENCES";

    // BATCH PROCESSING TO PREVENT 60s TIMEOUT ON GAS
    const BATCH_SIZE = 4;
    const numBatches = Math.ceil(aiContentSlidesCount / BATCH_SIZE);
    
    let allSlides: any[] = [];
    let allCitations: string[] = [];

    for (let batchIdx = 0; batchIdx < numBatches; batchIdx++) {
      const isLastBatch = batchIdx === numBatches - 1;
      const startSlide = batchIdx * BATCH_SIZE + 1;
      const slidesInThisBatch = Math.min(BATCH_SIZE, aiContentSlidesCount - batchIdx * BATCH_SIZE);
      const endSlide = startSlide + slidesInThisBatch - 1;

      onProgress?.(`Synthesizing slides ${startSlide} to ${endSlide} of ${aiContentSlidesCount}...`);

      const prevTitles = allSlides.map(s => s.title).join(', ');

      const blueprintPrompt = `ACT AS A SENIOR TECHNICAL STRATEGIST.
      TASK: GENERATE PART ${batchIdx + 1} OF A DEEP ANALYSIS DECK IN ${config.language} BY CROSS-ANALYZING ALL PROVIDED SOURCES.
      PRECISE INSTRUCTION: GENERATE EXACTLY ${slidesInThisBatch} SLIDES (SLIDES ${startSlide} TO ${endSlide} OF ${aiContentSlidesCount}).
      ${prevTitles ? `PREVIOUSLY GENERATED SLIDES: [${prevTitles}]. CONTINUE THE NARRATIVE LOGICALLY WITHOUT REPEATING THESE.` : 'THIS IS THE BEGINNING OF THE PRESENTATION. START WITH AN IMPACTFUL OPENING.'}
      --- USER STRATEGIC GOAL ---
      ${config.context || "A unified synthesis and technical deep-dive of these collections."}
      --- MANDATORY JSON RULES ---
      1. RETURN ROOT OBJECT WITH "slides" (Array) AND "citations" (Array).
      2. DATA MAPPING RULES:
         - 1_CARD: "data" must be a STRING.
         - 2_COL: "data" must { "left": "...", "right": "..." }.
         - 3_COL, 2X2, STACKING: "data" must be an Array: { "h": "...", "b": "..." }.
      3. CITATIONS: ${isLastBatch ? "Generate Harvard list ONLY using provided 'COLLECTION METADATA'." : "Leave empty for this part."}
      4. NO CONVERSATION. ONLY RAW JSON.
      5. LANGUAGE: ${config.language}.
      COLLECTION METADATA:
      ${items.map(it => `- TITLE: ${it.title} | AUTHORS: ${it.authors.join(', ')} | YEAR: ${it.year} | PUB: ${it.publisher}`).join('\n')}
      SOURCE CONTEXT:
      ${contextSnippet}
      SCHEMA_TEMPLATE:
      {
        "slides": [ { "layoutType": "1_CARD", "title": "...", "data": "Main analysis text" } ],
        "citations": ["Surname, I. (Year) 'Title'. Journal."]
      }`;

      // Loop safety retry for invalid JSON
      let attempt = 0;
      let blueprintPart: any = null;
      let aiResText = "";

      while (attempt < 2 && !blueprintPart) {
        attempt++;
        aiResText = await callAiProxy('gemini', blueprintPrompt, undefined, undefined, 'json');
        if (!aiResText) {
          if (attempt === 2) throw new Error(`AI Synthesis Interrupt during part ${batchIdx + 1}.`);
          continue;
        }

        try {
          const cleanedJson = cleanAiJson(aiResText);
          blueprintPart = JSON.parse(cleanedJson);
        } catch (e) {
          if (attempt === 2) throw new Error(`JSON Parse Error during part ${batchIdx + 1}.`);
          console.warn("JSON Parse failed, retrying...");
          blueprintPart = null;
        }
      }

      if (Array.isArray(blueprintPart)) {
        blueprintPart = { slides: blueprintPart, citations: [] };
      } else if (blueprintPart && !blueprintPart.slides && blueprintPart.deck) {
        blueprintPart.slides = blueprintPart.deck;
      } else if (blueprintPart && !blueprintPart.slides && blueprintPart.presentation) {
        blueprintPart.slides = blueprintPart.presentation;
      }

      if (blueprintPart && blueprintPart.slides && Array.isArray(blueprintPart.slides)) {
        allSlides = allSlides.concat(blueprintPart.slides.slice(0, slidesInThisBatch));
      }

      if (blueprintPart && blueprintPart.citations && Array.isArray(blueprintPart.citations)) {
        allCitations = allCitations.concat(blueprintPart.citations);
      }
    }

    if (allSlides.length === 0) throw new Error("Invalid Slide Blueprint.");

    let blueprint = {
      slides: allSlides,
      citations: allCitations
    };

    // RENDERING
    Templates.drawCoverUniversal(pptx.addSlide(), config.title, config.presenters, config.theme, logoBase64);
    blueprint.slides.forEach((sData: any, idx: number) => {
      onProgress?.(`Building slide ${idx + 2}...`);
      dispatchLayout(pptx.addSlide(), sData, config.theme, logoBase64);
    });

    onProgress?.("Finalizing last slide...");
    const rawCitations = blueprint.citations || [];
    const formattedCitations = rawCitations.length > 1 ? rawCitations.map((c: string, i: number) => `${i + 1}. ${c}`) : rawCitations;
    Templates.drawReferenceUniversal(pptx.addSlide(), referenceTitle, formattedCitations, config.theme, logoBase64);

    const base64Pptx = await pptx.write({ outputType: 'base64' }) as string;
    
    // STRATEGI SEARCH_ALL: Menggabungkan semua teks metadata penting sebagai indeks pencarian
    const sourceTitles = items.map(it => it.title).join(' ');
    const searchIndex = `${config.title} ${config.presenters.join(' ')} ${sourceTitles}`.toLowerCase();

    const presentationData: any = {
      id: crypto.randomUUID(),
      collectionIds: items.map(it => it.id),
      gSlidesId: '', 
      title: config.title,
      presenters: config.presenters,
      templateName: PresentationTemplate.MODERN,
      themeConfig: config.theme,
      slidesCount: (blueprint.slides?.length || 0) + 2,
      search_all: searchIndex, // Injeksi indeks pencarian terpadu
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // STAGE 1: GAS Worker (File Conversion)
    onProgress?.("Polishing presentation...");
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'savePresentation', presentation: presentationData, pptxFileData: base64Pptx })
    });
    const gasResult = await res.json();
    
    if (gasResult.status === 'success') {
      const finalItem = {
        ...presentationData,
        gSlidesId: gasResult.data.gSlidesId,
        storageNodeUrl: gasResult.data.storageNodeUrl
      };

      // STAGE 2: Supabase Registry (Metadata Persistence)
      const dbSuccess = await upsertPresentationToSupabase(finalItem);
      
      if (dbSuccess) {
        window.dispatchEvent(new CustomEvent('xeenaps-presentation-updated', { detail: finalItem }));
        return finalItem as PresentationItem;
      }
    }
    return null;
  } catch (error: any) {
    console.error("Synthesis Engine Error:", error);
    throw error;
  }
};

export const fetchRelatedPresentations = async (
  collectionId: string,
  page: number = 1,
  limit: number = 20,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: PresentationItem[], totalCount: number }> => {
  return fetchPresentationsPaginatedFromSupabase(page, limit, search, collectionId, "", "", sortKey, sortDir);
};

export const fetchPresentationsPaginated = async (
  page: number = 1, 
  limit: number = 25, 
  search: string = "", 
  startDate: string = "",
  endDate: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: PresentationItem[], totalCount: number }> => {
  return fetchPresentationsPaginatedFromSupabase(page, limit, search, "", startDate, endDate, sortKey, sortDir);
};

export const deletePresentation = async (id: string): Promise<boolean> => {
  // 1. Silent Broadcast
  window.dispatchEvent(new CustomEvent('xeenaps-presentation-deleted', { detail: id }));

  try {
    // 2. GAS cleanup (Physical files)
    await fetch(GAS_WEB_APP_URL!, {
      method: 'POST',
      body: JSON.stringify({ action: 'deletePresentation', id })
    });
    
    // 3. Supabase cleanup (Registry)
    return await deletePresentationFromSupabase(id);
  } catch (e) {
    return false;
  }
};