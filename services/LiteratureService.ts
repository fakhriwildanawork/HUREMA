import { LiteratureArticle, ArchivedArticleItem, ArchivedBookItem, GASResponse } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import { 
  fetchArchivedArticlesPaginatedFromSupabase, 
  upsertArchivedArticleToSupabase, 
  deleteArchivedArticleFromSupabase,
  fetchArchivedBooksPaginatedFromSupabase,
  upsertArchivedBookToSupabase,
  deleteArchivedBookFromSupabase
} from './LiteratureSupabaseService';

/**
 * XEENAPS LITERATURE SEARCH SERVICE
 * Hybrid Integration:
 * - Articles Registry -> Supabase (Primary Source of Truth)
 * - Books Registry -> Supabase (Primary Source of Truth)
 * - External Search (OpenAlex/OpenLibrary) -> GAS Proxy
 */

// Client-side Session Cache (Non-persistent on F5, but survives route navigation)
let searchCache = {
  query: '',
  yearStart: '',
  yearEnd: '',
  results: [] as LiteratureArticle[]
};

let bookSearchCache = {
  query: '',
  yearStart: '',
  yearEnd: '',
  results: [] as LiteratureArticle[]
};

export const getSearchCache = () => searchCache;
export const setSearchCache = (data: typeof searchCache) => {
  searchCache = data;
};

export const getBookSearchCache = () => bookSearchCache;
export const setBookSearchCache = (data: typeof bookSearchCache) => {
  bookSearchCache = data;
};

export const searchArticles = async (
  query: string, 
  yearStart?: number, 
  yearEnd?: number,
  limit: number = 12
): Promise<LiteratureArticle[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const url = `${GAS_WEB_APP_URL}?action=searchGlobalArticles&query=${encodeURIComponent(query)}&yearStart=${yearStart || ''}&yearEnd=${yearEnd || ''}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Proxy Search failed');
    const result = await response.json();
    if (result.status === 'success') {
      return result.data || [];
    } else {
      console.warn("Search Proxy Warning:", result.message);
      return [];
    }
  } catch (error) {
    console.error("Search articles exception:", error);
    return [];
  }
};

export const searchBooks = async (
  query: string, 
  yearStart?: number, 
  yearEnd?: number,
  limit: number = 12
): Promise<LiteratureArticle[]> => {
  if (!GAS_WEB_APP_URL) return [];
  try {
    const url = `${GAS_WEB_APP_URL}?action=searchGlobalBooks&query=${encodeURIComponent(query)}&yearStart=${yearStart || ''}&yearEnd=${yearEnd || ''}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Proxy Search failed');
    const result = await response.json();
    if (result.status === 'success') {
      return result.data || [];
    } else {
      console.warn("Book Search Proxy Warning:", result.message);
      return [];
    }
  } catch (error) {
    console.error("Search books exception:", error);
    return [];
  }
};

// --- ARCHIVED ARTICLES (SUPABASE) ---

export const fetchArchivedArticlesPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: ArchivedArticleItem[], totalCount: number }> => {
  return await fetchArchivedArticlesPaginatedFromSupabase(page, limit, search, sortKey, sortDir);
};

export const archiveArticle = async (article: LiteratureArticle, label: string): Promise<boolean> => {
  try {
    const authorList = article.authors?.map(a => a.name).join(', ') || 'Anonymous';
    const citation = `${authorList} (${article.year || 'n.d.'}). '${article.title}'. ${article.venue || 'Global Database'}.`;

    const archivedItem: ArchivedArticleItem = {
      id: crypto.randomUUID(),
      title: article.title,
      citationHarvard: citation,
      doi: article.doi || '',
      url: article.url || '',
      info: article.abstract || '',
      label: label.toUpperCase(),
      isFavorite: false,
      createdAt: new Date().toISOString()
    };

    return await upsertArchivedArticleToSupabase(archivedItem);
  } catch (error) {
    return false;
  }
};

export const deleteArchivedArticle = async (id: string): Promise<boolean> => {
  return await deleteArchivedArticleFromSupabase(id);
};

export const toggleFavoriteArticle = async (id: string, status: boolean): Promise<boolean> => {
  return await upsertArchivedArticleToSupabase({ id, isFavorite: status });
};

// --- ARCHIVED BOOKS (SUPABASE) ---

export const fetchArchivedBooksPaginated = async (
  page: number = 1,
  limit: number = 25,
  search: string = "",
  sortKey: string = "createdAt",
  sortDir: string = "desc",
  signal?: AbortSignal
): Promise<{ items: ArchivedBookItem[], totalCount: number }> => {
  return await fetchArchivedBooksPaginatedFromSupabase(page, limit, search, sortKey, sortDir);
};

export const archiveBook = async (book: LiteratureArticle, label: string): Promise<boolean> => {
  try {
    const authorList = book.authors?.map(a => a.name).join(', ') || 'Anonymous';
    const citation = `${authorList} (${book.year || 'n.d.'}). '${book.title}'. ${book.venue || 'Global Publisher'}.`;

    const archivedItem: ArchivedBookItem = {
      id: crypto.randomUUID(),
      title: book.title,
      citationHarvard: citation,
      isbn: book.isbn || '',
      url: book.url || '',
      info: book.abstract || '',
      label: label.toUpperCase(),
      isFavorite: false,
      createdAt: new Date().toISOString()
    };

    return await upsertArchivedBookToSupabase(archivedItem);
  } catch (error) {
    return false;
  }
};

export const deleteArchivedBook = async (id: string): Promise<boolean> => {
  return await deleteArchivedBookFromSupabase(id);
};

export const toggleFavoriteBook = async (id: string, status: boolean): Promise<boolean> => {
  return await upsertArchivedBookToSupabase({ id, isFavorite: status });
};

/**
 * XEENAPS PKM - LOCAL LITERATURE SERVICE (Supporting References)
 * Resolves fetching blocker by taking requests offline from Google Apps Script to the client device.
 * Priority: OpenAlex -> CrossRef
 */
export const getSupportingReferencesFrontend = async (keywords: string[]): Promise<string[]> => {
  if (!keywords || keywords.length === 0) return [];
  const query = encodeURIComponent(keywords.join(' '));
  let results: string[] = [];

  try {
    // Priority 1: OpenAlex (Polite Pool - Max 3 Items for Speed)
    const oaRes = await fetch(`https://api.openalex.org/works?search=${query}&per_page=3`, {
      headers: { "Accept": "application/json" }
    });
    if (oaRes.ok) {
      const oaData = await oaRes.json();
      if (oaData.results && oaData.results.length > 0) {
        results = oaData.results.map((item: any) => {
          const title = item.display_name || 'Untitled';
          const authors = (item.authorships || []).map((a: any) => a.author?.display_name).join(', ') || 'Unknown';
          const year = item.publication_year || 'N.d.';
          const url = item.doi || item.ids?.openalex || '#';
          return `<p><b>${title}</b>. ${authors} (${year}). <a href="${url}" target="_blank">${url}</a></p>`;
        });
        return results;
      }
    }
  } catch (e) {
    console.warn("OpenAlex fetch failed:", e);
  }

  try {
    // Priority 2: CrossRef (Fallback)
    const crRes = await fetch(`https://api.crossref.org/works?query=${query}&rows=3`);
    if (crRes.ok) {
      const crData = await crRes.json();
      if (crData.message && crData.message.items && crData.message.items.length > 0) {
        results = crData.message.items.map((item: any) => {
          const title = item.title?.[0] || 'Untitled';
          const authors = (item.author || []).map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).join(', ') || 'Unknown';
          const year = item.issued?.['date-parts']?.[0]?.[0] || 'N.d.';
          const url = item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : '#');
          return `<p><b>${title}</b>. ${authors} (${year}). <a href="${url}" target="_blank">${url}</a></p>`;
        });
        return results;
      }
    }
  } catch (e) {
    console.warn("CrossRef fetch failed:", e);
  }

  return results; // Returns empty array if both fail
};