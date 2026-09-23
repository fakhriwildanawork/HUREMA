import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

// Configure PDF.js worker
if (typeof window !== 'undefined' && 'Worker' in window) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker initialization fallback:', e);
  }
}

export interface ExtractedFileResult {
  extractedText: string;
  detectedIdentifiers: {
    doi?: string;
    isbn?: string;
    issn?: string;
    pmid?: string;
    arxivId?: string;
  };
  pageCount?: number;
}

/**
 * Regex extractor for academic and book identifiers
 */
export const extractIdentifiersFromText = (text: string) => {
  if (!text) return {};

  // 1. DOI Regex
  const doiMatch = text.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/);
  let detectedDoi = doiMatch ? doiMatch[1] : undefined;
  if (detectedDoi) {
    detectedDoi = detectedDoi.replace(/[.,;:)\]]+$/, '');
  }

  // 2. ISBN Regex (ISBN-10 and ISBN-13)
  const isbnMatch = text.match(/(?:ISBN(?:-1[03])?:?\s*)?((?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9xX])/i);
  const detectedIsbn = isbnMatch && isbnMatch[1].replace(/[- ]/g, '').length >= 10 ? isbnMatch[1].trim() : undefined;

  // 3. ISSN Regex
  const issnMatch = text.match(/(?:ISSN:?\s*)?([0-9]{4}[- ][0-9]{3}[0-9xX])/i);
  const detectedIssn = issnMatch ? issnMatch[1].trim() : undefined;

  // 4. PMID Regex
  const pmidMatch = text.match(/(?:PMID:?\s*)(\d{6,10})/i);
  const detectedPmid = pmidMatch ? pmidMatch[1].trim() : undefined;

  // 5. arXiv Regex
  const arxivMatch = text.match(/(?:arXiv:?\s*)(\d{4}\.\d{4,5}(?:v\d+)?)/i);
  const detectedArxiv = arxivMatch ? arxivMatch[1].trim() : undefined;

  return {
    doi: detectedDoi,
    isbn: detectedIsbn,
    issn: detectedIssn,
    pmid: detectedPmid,
    arxivId: detectedArxiv
  };
};

/**
 * Extract text from PDF using Mozilla PDF.js
 * Supports documents with hundreds of pages via streaming page-by-page extraction.
 */
const extractPdfText = async (
  file: File, 
  onProgress?: (progressText: string) => void
): Promise<{ text: string; pageCount: number }> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pageTexts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    if (onProgress && numPages > 5) {
      onProgress(`Extracting page ${i} of ${numPages}...`);
    }
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => (item.str ? item.str : ''))
      .join(' ')
      .trim();
    if (pageText) {
      pageTexts.push(`[Page ${i}]\n${pageText}`);
    }
  }

  return {
    text: pageTexts.join('\n\n'),
    pageCount: numPages
  };
};

/**
 * Extract text from DOCX using Mammoth
 */
const extractDocxText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
};

/**
 * Extract text from PPTX using JSZip and slide XML parser
 */
const extractPptxText = async (
  file: File,
  onProgress?: (progressText: string) => void
): Promise<string> => {
  const zip = new JSZip();
  const arrayBuffer = await file.arrayBuffer();
  const loadedZip = await zip.loadAsync(arrayBuffer);

  const slideFiles: string[] = [];
  loadedZip.forEach((relativePath) => {
    if (relativePath.startsWith('ppt/slides/slide') && relativePath.endsWith('.xml')) {
      slideFiles.push(relativePath);
    }
  });

  // Natural numeric sort: slide1.xml, slide2.xml, slide10.xml
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  const slideTexts: string[] = [];
  const parser = new DOMParser();

  for (let i = 0; i < slideFiles.length; i++) {
    if (onProgress && slideFiles.length > 5) {
      onProgress(`Processing slide ${i + 1} of ${slideFiles.length}...`);
    }
    const slidePath = slideFiles[i];
    const slideXml = await loadedZip.file(slidePath)?.async('text');
    if (slideXml) {
      const xmlDoc = parser.parseFromString(slideXml, 'application/xml');
      const textNodes = xmlDoc.getElementsByTagName('a:t');
      const currentSlideTexts: string[] = [];
      for (let j = 0; j < textNodes.length; j++) {
        const textContent = textNodes[j].textContent;
        if (textContent && textContent.trim()) {
          currentSlideTexts.push(textContent.trim());
        }
      }
      if (currentSlideTexts.length > 0) {
        slideTexts.push(`--- Slide ${i + 1} ---\n${currentSlideTexts.join(' ')}`);
      }
    }
  }

  return slideTexts.join('\n\n');
};

/**
 * Extract text from Excel (XLSX, XLS, CSV) using SheetJS
 */
const extractSpreadsheetText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetTexts: string[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv && csv.trim()) {
      sheetTexts.push(`--- Sheet: ${sheetName} ---\n${csv.trim()}`);
    }
  });

  return sheetTexts.join('\n\n');
};

/**
 * Main Client-Side Extractor
 * Reads and extracts text 100% in-browser without calling external APIs or serverless functions.
 */
export const extractTextFromFile = async (
  file: File,
  onProgress?: (progressText: string) => void
): Promise<ExtractedFileResult> => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  let extractedText = '';
  let pageCount = 1;

  try {
    if (ext === 'pdf') {
      const pdfResult = await extractPdfText(file, onProgress);
      extractedText = pdfResult.text;
      pageCount = pdfResult.pageCount;
    } else if (ext === 'docx') {
      extractedText = await extractDocxText(file);
    } else if (ext === 'pptx') {
      extractedText = await extractPptxText(file, onProgress);
    } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      extractedText = await extractSpreadsheetText(file);
    } else if (['txt', 'md', 'json', 'xml', 'html', 'htm'].includes(ext) || file.type.startsWith('text/')) {
      extractedText = await file.text();
    } else {
      // Generic text fallback
      try {
        extractedText = await file.text();
      } catch (e) {
        extractedText = '';
      }
    }
  } catch (error: any) {
    console.error('Local File Extraction Error:', error);
    throw new Error(`Failed to extract content from ${file.name}: ${error.message || 'Corrupt or unsupported format'}`);
  }

  const detectedIdentifiers = extractIdentifiersFromText(extractedText);

  return {
    extractedText: extractedText.trim(),
    detectedIdentifiers,
    pageCount
  };
};
