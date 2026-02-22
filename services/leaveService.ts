import { supabase } from '../lib/supabase';
import { LeaveRequest, LeaveRequestInput, LeaveRequestExtended } from '../types';
import { settingsService } from './settingsService';

export const leaveService = {
  /**
   * Mendapatkan semua pengajuan libur untuk satu akun
   */
  async getByAccountId(accountId: string): Promise<LeaveRequest[]> {
    const { data, error } = await supabase
      .from('account_leave_requests')
      .select('*')
      .eq('account_id', accountId)
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Mendapatkan semua pengajuan libur (untuk admin)
   */
  async getAll(): Promise<LeaveRequestExtended[]> {
    const { data, error } = await supabase
      .from('account_leave_requests')
      .select('*, account:accounts(full_name, internal_nik)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Membuat pengajuan libur baru
   */
  async create(input: LeaveRequestInput): Promise<LeaveRequest> {
    // Ambil kebijakan dari settings
    const policy = await settingsService.getSetting('leave_approval_policy', 'manual');
    const status = policy === 'auto' ? 'approved' : 'pending';

    const { data, error } = await supabase
      .from('account_leave_requests')
      .insert({
        ...input,
        status
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Memperbarui status pengajuan libur
   */
  async updateStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
    const { error } = await supabase
      .from('account_leave_requests')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  /**
   * Menghapus pengajuan libur
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('account_leave_requests')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
