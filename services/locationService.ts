
import { supabase } from '../lib/supabase.ts';
import { Location, LocationInput, LocationAdministration, LocationAdminInput } from '../types.ts';

/**
 * Fungsi pembantu untuk membersihkan data sebelum dikirim ke Supabase.
 * Mengubah string kosong ('') menjadi null agar tidak error saat masuk ke kolom DATE atau NUMERIC.
 */
const sanitizePayload = (payload: any) => {
  const sanitized = { ...payload };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === '' || sanitized[key] === undefined) {
      sanitized[key] = null;
    }
  });
  return sanitized;
};

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
    const sanitizedLocation = sanitizePayload(location);
    const { data, error } = await supabase
      .from('locations')
      .insert([sanitizedLocation])
      .select();
    
    if (error) throw error;
    return data[0] as Location;
  },

  async update(id: string, location: Partial<LocationInput>) {
    const sanitizedLocation = sanitizePayload(location);
    const { data, error } = await supabase
      .from('locations')
      .update(sanitizedLocation)
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
    const sanitizedAdmin = sanitizePayload(adminData);
    const { data, error } = await supabase
      .from('location_administrations')
      .insert([sanitizedAdmin])
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
