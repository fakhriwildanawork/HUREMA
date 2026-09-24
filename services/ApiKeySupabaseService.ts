/**
 * XEENAPS API KEY SUPABASE SERVICE
 * High-performance, secure key registry with Row-Level Security.
 * Eliminates Google Sheets read latency & enables client-side multi-key failover.
 */

import { getSupabase } from './supabaseClient';

export interface AppApiKey {
  id: string;
  provider: 'gemini' | 'groq' | 'scrapingant' | string;
  key_value: string;
  label?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Local cache for active keys to avoid querying Supabase on every single prompt token
const activeKeyCache: Record<string, { keys: string[]; timestamp: number }> = {};
const CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Fetch all API keys from Supabase
 */
export const fetchApiKeysFromSupabase = async (provider?: string): Promise<AppApiKey[]> => {
  const client = getSupabase();
  if (!client) return [];

  try {
    let query = client
      .from('app_api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (provider) {
      query = query.eq('provider', provider.toLowerCase());
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase fetch API keys warning (table may need creation):', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      provider: row.provider,
      key_value: row.key_value,
      label: row.label || '',
      is_active: row.is_active !== false,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  } catch (e) {
    console.error('Fetch API keys exception:', e);
    return [];
  }
};

/**
 * Upsert (Insert or Update) an API Key in Supabase
 */
export const upsertApiKeyToSupabase = async (key: {
  id?: string;
  provider: string;
  key_value: string;
  label?: string;
  is_active?: boolean;
}): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  try {
    const payload: any = {
      provider: key.provider.toLowerCase(),
      key_value: key.key_value.trim(),
      label: key.label || '',
      is_active: key.is_active !== false,
      updated_at: new Date().toISOString()
    };

    if (key.id) {
      payload.id = key.id;
    } else {
      payload.id = crypto.randomUUID();
      payload.created_at = new Date().toISOString();
    }

    const { error } = await client
      .from('app_api_keys')
      .upsert(payload);

    if (error) {
      console.error('Supabase Upsert API Key Error:', error);
      return false;
    }

    // Invalidate local cache
    delete activeKeyCache[key.provider.toLowerCase()];
    return true;
  } catch (e) {
    console.error('Upsert API Key exception:', e);
    return false;
  }
};

/**
 * Delete an API Key from Supabase
 */
export const deleteApiKeyFromSupabase = async (id: string, provider?: string): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client
      .from('app_api_keys')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase Delete API Key Error:', error);
      return false;
    }

    if (provider) {
      delete activeKeyCache[provider.toLowerCase()];
    } else {
      // Clear all
      Object.keys(activeKeyCache).forEach(k => delete activeKeyCache[k]);
    }
    return true;
  } catch (e) {
    console.error('Delete API Key exception:', e);
    return false;
  }
};

/**
 * Get active raw keys for a provider (e.g. 'groq') for execution and auto-rotation
 */
export const getActiveApiKeys = async (provider: string): Promise<string[]> => {
  const normalized = provider.toLowerCase();
  const now = Date.now();

  if (activeKeyCache[normalized] && (now - activeKeyCache[normalized].timestamp < CACHE_TTL_MS)) {
    return activeKeyCache[normalized].keys;
  }

  const items = await fetchApiKeysFromSupabase(normalized);
  const activeKeys = items
    .filter(item => item.is_active !== false && item.key_value)
    .map(item => item.key_value);

  activeKeyCache[normalized] = {
    keys: activeKeys,
    timestamp: now
  };

  return activeKeys;
};
