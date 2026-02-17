
import { supabase } from '../lib/supabase';
import { Attendance, AttendanceInput, Account, Schedule } from '../types';

const sanitizePayload = (payload: any) => {
  const sanitized = { ...payload };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === '' || sanitized[key] === undefined) {
      sanitized[key] = null;
    }
  });
  return sanitized;
};

export const presenceService = {
  /**
   * Mengambil waktu server (Anti-Fake Time)
   */
  async getServerTime(): Promise<Date> {
    const { data, error } = await supabase.rpc('get_server_time');
    if (error) {
      // Fallback ke API publik jika RPC gagal
      try {
        const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Jakarta');
        const json = await res.json();
        return new Date(json.datetime);
      } catch (e) {
        return new Date(); // Last resort (bisa dimanipulasi lokal)
      }
    }
    return new Date(data);
  },

  /**
   * Menghitung jarak antara 2 koordinat (Haversine Formula)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  },

  async getTodayAttendance(accountId: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('account_id', accountId)
      .gte('created_at', `${today}T00:00:00Z`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return data as Attendance | null;
  },

  async checkIn(input: Partial<AttendanceInput>) {
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('attendances')
      .insert([sanitized])
      .select()
      .single();
    
    if (error) throw error;
    return data as Attendance;
  },

  async checkOut(id: string, input: Partial<AttendanceInput>) {
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('attendances')
      .update(sanitized)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Attendance;
  },

  async getRecentHistory(accountId: string, limit = 7) {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as Attendance[];
  }
};
