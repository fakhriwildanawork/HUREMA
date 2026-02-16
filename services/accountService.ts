
import { supabase } from '../lib/supabase';
import { Account, AccountInput, CareerLog, CareerLogInput, HealthLog, HealthLogInput } from '../types';

/**
 * Fungsi pembantu untuk membersihkan data sebelum dikirim ke Supabase.
 * Mengubah string kosong ('') menjadi null agar tidak error saat masuk ke kolom UUID atau DATE.
 */
const sanitizePayload = (payload: any) => {
  const sanitized = { ...payload };
  Object.keys(sanitized).forEach(key => {
    // Memastikan string kosong dikirim sebagai null ke database
    if (sanitized[key] === '' || sanitized[key] === undefined) {
      sanitized[key] = null;
    }
  });
  return sanitized;
};

export const accountService = {
  async getAll() {
    const { data, error } = await supabase
      .from('accounts')
      .select(`
        *,
        location:locations(name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("SUPABASE_GET_ALL_ERROR:", error.message);
      throw error;
    }
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('accounts')
      .select(`
        *,
        location:locations(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error("SUPABASE_GET_BY_ID_ERROR:", error.message);
      throw error;
    }
    return data;
  },

  async getCareerLogs(accountId: string) {
    const { data, error } = await supabase
      .from('account_career_logs')
      .select('*')
      .eq('account_id', accountId)
      .order('change_date', { ascending: false });
    
    if (error) throw error;
    return data as CareerLog[];
  },

  async getHealthLogs(accountId: string) {
    const { data, error } = await supabase
      .from('account_health_logs')
      .select('*')
      .eq('account_id', accountId)
      .order('change_date', { ascending: false });
    
    if (error) throw error;
    return data as HealthLog[];
  },

  async create(account: AccountInput) {
    const sanitizedAccount = sanitizePayload(account);
    const { data, error } = await supabase
      .from('accounts')
      .insert([sanitizedAccount])
      .select();
    
    if (error) {
      console.error("SUPABASE_CREATE_ERROR:", error.message);
      throw error;
    }
    return data[0] as Account;
  },

  async update(id: string, account: Partial<AccountInput>) {
    const sanitizedAccount = sanitizePayload(account);
    const { data, error } = await supabase
      .from('accounts')
      .update(sanitizedAccount)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error("SUPABASE_UPDATE_ERROR:", error.message);
      throw error;
    }
    return data[0] as Account;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("SUPABASE_DELETE_ERROR:", error.message);
      throw error;
    }
    return true;
  },

  // Manual Log Management
  async createCareerLog(logInput: CareerLogInput) {
    const { location_id, ...rest } = logInput;
    const { data, error } = await supabase
      .from('account_career_logs')
      .insert([sanitizePayload(rest)])
      .select();

    if (error) throw error;

    // Sinkronisasi ke profil utama jika data karier berubah
    await this.update(logInput.account_id, {
      position: logInput.position,
      grade: logInput.grade,
      location_id: location_id || null
    });

    return data[0] as CareerLog;
  },

  async deleteCareerLog(id: string) {
    const { error } = await supabase
      .from('account_career_logs')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async createHealthLog(logInput: HealthLogInput) {
    const { data, error } = await supabase
      .from('account_health_logs')
      .insert([sanitizePayload(logInput)])
      .select();

    if (error) throw error;

    // Sinkronisasi ke profil utama
    await this.update(logInput.account_id, {
      mcu_status: logInput.mcu_status,
      health_risk: logInput.health_risk
    });

    return data[0] as HealthLog;
  },

  async deleteHealthLog(id: string) {
    const { error } = await supabase
      .from('account_health_logs')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
