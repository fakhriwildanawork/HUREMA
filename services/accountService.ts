
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

  async getDistinctAttributes() {
    const { data: positions } = await supabase.from('accounts').select('position');
    const { data: grades } = await supabase.from('accounts').select('grade');
    
    const uniquePositions = Array.from(new Set(positions?.map(p => p.position).filter(Boolean))).sort();
    const uniqueGrades = Array.from(new Set(grades?.map(g => g.grade).filter(Boolean))).sort();
    
    return { positions: uniquePositions, grades: uniqueGrades };
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

  async create(account: AccountInput & { file_sk_id?: string, file_mcu_id?: string }) {
    const { file_sk_id, file_mcu_id, ...rest } = account;
    const sanitizedAccount = sanitizePayload(rest);
    
    // 1. Insert ke tabel accounts
    const { data, error } = await supabase
      .from('accounts')
      .insert([sanitizedAccount])
      .select();
    
    if (error) {
      console.error("SUPABASE_CREATE_ERROR:", error.message);
      throw error;
    }
    
    const newAccount = data[0] as Account;

    // 2. Otomatis buat log karier awal
    const { data: locData } = await supabase
      .from('locations')
      .select('name')
      .eq('id', newAccount.location_id)
      .single();

    await supabase.from('account_career_logs').insert([{
      account_id: newAccount.id,
      position: newAccount.position,
      grade: newAccount.grade,
      location_name: locData?.name || '-',
      file_sk_id: file_sk_id || null,
      notes: 'Initial Career Record'
    }]);

    // 3. Otomatis buat log kesehatan awal
    await supabase.from('account_health_logs').insert([{
      account_id: newAccount.id,
      mcu_status: newAccount.mcu_status,
      health_risk: newAccount.health_risk,
      file_mcu_id: file_mcu_id || null,
      notes: 'Initial Health Record'
    }]);

    return newAccount;
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

  async updateCareerLog(id: string, logInput: Partial<CareerLogInput>) {
    const { location_id, ...rest } = logInput;
    const { data, error } = await supabase
      .from('account_career_logs')
      .update(sanitizePayload(rest))
      .eq('id', id)
      .select();

    if (error) throw error;

    // Sinkronisasi ke profil utama jika ini adalah log terbaru (asumsi sederhana sinkronisasi)
    if (logInput.account_id) {
      await this.update(logInput.account_id, {
        position: logInput.position,
        grade: logInput.grade,
        location_id: location_id || null
      });
    }

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

  async updateHealthLog(id: string, logInput: Partial<HealthLogInput>) {
    const { data, error } = await supabase
      .from('account_health_logs')
      .update(sanitizePayload(logInput))
      .eq('id', id)
      .select();

    if (error) throw error;

    // Sinkronisasi ke profil utama
    if (logInput.account_id) {
      await this.update(logInput.account_id, {
        mcu_status: logInput.mcu_status,
        health_risk: logInput.health_risk
      });
    }

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
