import { supabase } from '../lib/supabase';
import { SalaryScheme, SalarySchemeInput, SalaryAssignment, SalaryAssignmentExtended, Reimbursement, ReimbursementInput, ReimbursementStatus } from '../types';

export const financeService = {
  // Salary Schemes
  async getSchemes() {
    const { data, error } = await supabase
      .from('finance_salary_schemes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as SalaryScheme[];
  },

  async getSchemeById(id: string) {
    const { data, error } = await supabase
      .from('finance_salary_schemes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as SalaryScheme;
  },

  async createScheme(scheme: SalarySchemeInput) {
    const { data, error } = await supabase
      .from('finance_salary_schemes')
      .insert([scheme])
      .select();
    
    if (error) throw error;
    return data[0] as SalaryScheme;
  },

  async updateScheme(id: string, scheme: Partial<SalarySchemeInput>) {
    const { data, error } = await supabase
      .from('finance_salary_schemes')
      .update(scheme)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0] as SalaryScheme;
  },

  async deleteScheme(id: string) {
    const { error } = await supabase
      .from('finance_salary_schemes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Salary Assignments
  async getAssignments() {
    const { data, error } = await supabase
      .from('finance_salary_assignments')
      .select(`
        *,
        account:accounts(full_name, internal_nik, position, grade, location_id),
        scheme:finance_salary_schemes(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as SalaryAssignmentExtended[];
  },

  async assignScheme(schemeId: string, accountIds: string[]) {
    // We use upsert because account_id is unique
    const assignments = accountIds.map(accountId => ({
      scheme_id: schemeId,
      account_id: accountId,
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('finance_salary_assignments')
      .upsert(assignments, { onConflict: 'account_id' })
      .select();
    
    if (error) throw error;
    return data;
  },

  async removeAssignment(id: string) {
    const { error } = await supabase
      .from('finance_salary_assignments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Reimbursements
  async getReimbursements(filters?: { account_id?: string, month?: number, year?: number }) {
    let query = supabase
      .from('finance_reimbursements')
      .select(`
        *,
        account:accounts!finance_reimbursements_account_id_fkey(full_name, internal_nik)
      `)
      .order('created_at', { ascending: false });

    if (filters?.account_id) {
      query = query.eq('account_id', filters.account_id);
    }

    if (filters?.month && filters?.year) {
      const startDate = new Date(filters.year, filters.month - 1, 1).toISOString();
      const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59).toISOString();
      query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Reimbursement[];
  },

  async createReimbursement(reimbursement: ReimbursementInput & { account_id: string }) {
    const { data, error } = await supabase
      .from('finance_reimbursements')
      .insert([reimbursement])
      .select();
    
    if (error) throw error;
    return data[0] as Reimbursement;
  },

  async updateReimbursementStatus(id: string, update: { 
    status: ReimbursementStatus, 
    amount_approved?: number, 
    admin_notes?: string, 
    payment_proof_id?: string,
    verifier_id: string 
  }) {
    const { data, error } = await supabase
      .from('finance_reimbursements')
      .update({
        ...update,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0] as Reimbursement;
  },

  async markAsRead(id: string) {
    const { error } = await supabase
      .from('finance_reimbursements')
      .update({ is_read: true })
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async getUnreadCount() {
    const { count, error } = await supabase
      .from('finance_reimbursements')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);
    
    if (error) throw error;
    return count || 0;
  }
};
