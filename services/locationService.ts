
import { supabase } from '../lib/supabase';
import { Location, LocationInput, LocationAdministration, LocationAdminInput } from '../types';

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
  },

  // Administrasi Services
  async getAdministrations(locationId: string) {
    const { data, error } = await supabase
      .from('location_administrations')
      .select('*')
      .eq('location_id', locationId)
      .order('admin_date', { ascending: false });
    
    if (error) throw error;
    return data as LocationAdministration[];
  },

  async createAdministration(adminData: LocationAdminInput) {
    const { data, error } = await supabase
      .from('location_administrations')
      .insert([adminData])
      .select();
    
    if (error) throw error;
    return data[0] as LocationAdministration;
  },

  async deleteAdministration(id: string) {
    const { error } = await supabase
      .from('location_administrations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};
