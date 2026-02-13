
import { supabase } from '../lib/supabase';
import { Location, LocationInput } from '../types';

export const locationService = {
  async getAll() {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Location[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Location;
  },

  async create(location: LocationInput) {
    const { data, error } = await supabase
      .from('locations')
      .insert([location])
      .select();
    
    if (error) throw error;
    return data[0] as Location;
  },

  async update(id: string, location: Partial<LocationInput>) {
    const { data, error } = await supabase
      .from('locations')
      .update(location)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0] as Location;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};
