
import { supabase } from '../lib/supabase';
import { Account, AccountInput } from '../types';

export const accountService = {
  async getAll() {
    const { data, error } = await supabase
      .from('accounts')
      .select(`
        *,
        location:locations(name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
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
    
    if (error) throw error;
    return data;
  },

  async create(account: AccountInput) {
    const { data, error } = await supabase
      .from('accounts')
      .insert([account])
      .select();
    
    if (error) throw error;
    return data[0] as Account;
  },

  async update(id: string, account: Partial<AccountInput>) {
    const { data, error } = await supabase
      .from('accounts')
      .update(account)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0] as Account;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};
