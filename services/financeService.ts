import { supabase } from '../lib/supabase';
import { SalaryScheme, SalarySchemeInput, SalaryAssignment, SalaryAssignmentExtended } from '../types';

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
  }
};
