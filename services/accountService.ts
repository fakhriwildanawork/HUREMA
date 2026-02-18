
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
        location:locations(*),
        schedule:schedules!schedule_id(*, rules:schedule_rules(*))
      `)
      .eq('id', id)
      .maybeSingle(); // Menggunakan maybeSingle() agar tidak error jika record tidak ditemukan
    
    if (error) {
      console.error("SUPABASE_GET_BY_ID_ERROR:", error.message);
      throw error;
    }
    return data;
  },

  async getDistinctAttributes() {
    // Mengambil data unik Jabatan & Golongan dari kedua tabel untuk memastikan dropdown lengkap
    const [accRes, logRes] = await Promise.all([
      supabase.from('accounts').select('position, grade'),
      supabase.from('account_career_logs').select('position, grade')
    ]);

    const allPositions = [
      ...(accRes.data?.map(p => p.position) || []),
      ...(logRes.data?.map(p => p.position) || [])
    ];
    
    const allGrades = [
      ...(accRes.data?.map(g => g.grade) || []),
      ...(logRes.data?.map(g => g.grade) || [])
    ];

    const uniquePositions = Array.from(new Set(allPositions.filter(Boolean))).sort();
    const uniqueGrades = Array.from(new Set(allGrades.filter(Boolean))).sort();
    
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

  async create(account: AccountInput & { file_sk_id?: string, file_mcu_id?: string, contract_initial?: any }) {
    const { file_sk_id, file_mcu_id, contract_initial, ...rest } = account;
    
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
      location_id: newAccount.location_id,
      location_name: locData?.name || '-',
      schedule_id: newAccount.schedule_id,
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

    // 4. Otomatis buat kontrak awal jika disediakan
    if (contract_initial && contract_initial.contract_number) {
      await supabase.from('account_contracts').insert([{
        account_id: newAccount.id,
        contract_number: contract_initial.contract_number,
        contract_type: contract_initial.contract_type || account.employee_type,
        start_date: contract_initial.start_date || account.start_date,
        end_date: contract_initial.end_date || account.end_date,
        file_id: contract_initial.file_id || null,
        notes: 'Initial Contract Record'
      }]);
    }

    return newAccount;
  },

  async update(id: string, account: Partial<AccountInput>) {
    // Pastikan field tambahan untuk log awal tidak ikut dikirim ke tabel accounts
    const { file_sk_id, file_mcu_id, contract_initial, ...rest } = account as any;
    
    const sanitizedAccount = sanitizePayload(rest);
    
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
    // Filtrasi: Pastikan hanya kolom yang ada di tabel account_career_logs yang dikirim
    const { account_id, position, grade, location_name, file_sk_id, notes, location_id, schedule_id, change_date } = logInput;
    const payload = sanitizePayload({ account_id, position, grade, location_name, file_sk_id, notes, change_date, location_id, schedule_id });
    
    const { data, error } = await supabase
      .from('account_career_logs')
      .insert([payload])
      .select();

    if (error) {
      console.error("CAREER_LOG_CREATE_ERROR:", error.message);
      throw error;
    }

    // Sinkronisasi ke profil utama jika data karier berubah
    await this.update(account_id, {
      position,
      grade,
      location_id: location_id || null,
      schedule_id: schedule_id || null
    });

    return data[0] as CareerLog;
  },

  async updateCareerLog(id: string, logInput: Partial<CareerLogInput>) {
    const { account_id, position, grade, location_name, file_sk_id, notes, location_id, schedule_id, change_date } = logInput;
    const payload = sanitizePayload({ account_id, position, grade, location_name, file_sk_id, notes, change_date, location_id, schedule_id });

    const { data, error } = await supabase
      .from('account_career_logs')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) {
      console.error("CAREER_LOG_UPDATE_ERROR:", error.message);
      throw error;
    }

    if (account_id) {
      await this.update(account_id, {
        position,
        grade,
        location_id: location_id || null,
        schedule_id: schedule_id || null
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
    // Filtrasi: Hapus field career (location_id, location_name) yang sering terbawa dari state form
    const { account_id, mcu_status, health_risk, file_mcu_id, notes, change_date } = logInput;
    const payload = sanitizePayload({ account_id, mcu_status, health_risk, file_mcu_id, notes, change_date });

    const { data, error } = await supabase
      .from('account_health_logs')
      .insert([payload])
      .select();

    if (error) {
      console.error("HEALTH_LOG_CREATE_ERROR:", error.message);
      throw error;
    }

    // Sinkronisasi ke profil utama
    await this.update(account_id, {
      mcu_status,
      health_risk
    });

    return data[0] as HealthLog;
  },

  async updateHealthLog(id: string, logInput: Partial<HealthLogInput>) {
    const { account_id, mcu_status, health_risk, file_mcu_id, notes, change_date } = logInput;
    const payload = sanitizePayload({ account_id, mcu_status, health_risk, file_mcu_id, notes, change_date });

    const { data, error } = await supabase
      .from('account_health_logs')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) {
      console.error("HEALTH_LOG_UPDATE_ERROR:", error.message);
      throw error;
    }

    if (account_id) {
      await this.update(account_id, {
        mcu_status,
        health_risk
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
