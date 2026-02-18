import { supabase } from '../lib/supabase';
import { Submission, SubmissionInput, SubmissionStatus } from '../types';

const sanitizePayload = (payload: any) => {
  const sanitized = { ...payload };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === '' || sanitized[key] === undefined) {
      sanitized[key] = null;
    }
  });
  return sanitized;
};

export const submissionService = {
  async getAll() {
    const { data, error } = await supabase
      .from('account_submissions')
      .select(`
        *,
        account:accounts(full_name, internal_nik)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Submission[];
  },

  async getByAccountId(accountId: string) {
    const { data, error } = await supabase
      .from('account_submissions')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Submission[];
  },

  async create(input: SubmissionInput) {
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('account_submissions')
      .insert([sanitized])
      .select()
      .single();
    
    if (error) throw error;
    return data as Submission;
  },

  async verify(id: string, status: SubmissionStatus, verifierId: string, notes?: string) {
    const { data: submission, error: fetchError } = await supabase
      .from('account_submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('account_submissions')
      .update({
        status,
        verifier_id: verifierId,
        verified_at: new Date().toISOString(),
        verification_notes: notes
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    // Logic khusus setelah disetujui (Post-Approval Automation)
    if (status === 'Disetujui') {
      if (submission.type === 'Cuti') {
        const { duration_days } = submission.submission_data;
        if (duration_days) {
          // Potong kuota cuti di profil akun
          const { data: account } = await supabase.from('accounts').select('leave_quota').eq('id', submission.account_id).single();
          if (account) {
            await supabase.from('accounts').update({ 
              leave_quota: Math.max(0, account.leave_quota - duration_days) 
            }).eq('id', submission.account_id);
          }
        }
      }
      // Tambahkan logic otomatisasi lain di sini (misal: insert log lembur otomatis)
    }

    return data as Submission;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('account_submissions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};