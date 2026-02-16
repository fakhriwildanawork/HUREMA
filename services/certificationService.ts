
import { supabase } from '../lib/supabase';
import { AccountCertification, AccountCertificationExtended, AccountCertificationInput } from '../types';

const sanitizePayload = (payload: any) => {
  const sanitized = { ...payload };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === '' || sanitized[key] === undefined) {
      sanitized[key] = null;
    }
  });
  return sanitized;
};

export const certificationService = {
  async getAllGlobal() {
    const { data, error } = await supabase
      .from('account_certifications')
      .select(`
        *,
        account:accounts(full_name, internal_nik)
      `)
      .order('entry_date', { ascending: false });
    
    if (error) throw error;
    return data as AccountCertificationExtended[];
  },

  async getByAccountId(accountId: string) {
    const { data, error } = await supabase
      .from('account_certifications')
      .select('*')
      .eq('account_id', accountId)
      .order('cert_date', { ascending: false });
    
    if (error) throw error;
    return data as AccountCertification[];
  },

  async getUniqueCertTypes() {
    const { data, error } = await supabase
      .from('account_certifications')
      .select('cert_type');
    
    if (error) throw error;
    const types = data.map(d => d.cert_type).filter(Boolean);
    return Array.from(new Set(types)).sort();
  },

  async create(input: AccountCertificationInput) {
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('account_certifications')
      .insert([sanitized])
      .select();
    
    if (error) throw error;
    return data[0] as AccountCertification;
  },

  async update(id: string, input: Partial<AccountCertificationInput>) {
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('account_certifications')
      .update(sanitized)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0] as AccountCertification;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('account_certifications')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
