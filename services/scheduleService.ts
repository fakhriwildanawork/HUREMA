import { supabase } from '../lib/supabase';
import { Schedule, ScheduleInput, ScheduleRule } from '../types';

export const scheduleService = {
  async getAll() {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        *,
        schedule_locations(location_id),
        schedule_rules(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(item => ({
      ...item,
      location_ids: item.schedule_locations.map((sl: any) => sl.location_id),
      rules: item.schedule_rules
    })) as Schedule[];
  },

  async getByLocation(locationId: string) {
    if (!locationId) return [];
    const { data, error } = await supabase
      .from('schedule_locations')
      .select('schedule_id, schedules(*)')
      .eq('location_id', locationId);
    
    if (error) throw error;
    return data.map(item => item.schedules) as Schedule[];
  },

  async create(input: ScheduleInput) {
    const { rules, location_ids, ...scheduleData } = input;
    
    // 1. Insert schedule
    const { data: schedule, error: sError } = await supabase
      .from('schedules')
      .insert([scheduleData])
      .select()
      .single();
    
    if (sError) throw sError;

    // 2. Insert rules
    const rulesToInsert = rules.map(r => ({ ...r, schedule_id: schedule.id }));
    const { error: rError } = await supabase
      .from('schedule_rules')
      .insert(rulesToInsert);
    
    if (rError) throw rError;

    // 3. Insert locations
    const locationsToInsert = location_ids.map(lid => ({ schedule_id: schedule.id, location_id: lid }));
    const { error: lError } = await supabase
      .from('schedule_locations')
      .insert(locationsToInsert);
    
    if (lError) throw lError;

    return schedule as Schedule;
  },

  async update(id: string, input: Partial<ScheduleInput>) {
    const { rules, location_ids, ...scheduleData } = input;

    // 1. Update master
    const { data: schedule, error: sError } = await supabase
      .from('schedules')
      .update(scheduleData)
      .eq('id', id)
      .select()
      .single();
    
    if (sError) throw sError;

    // 2. Update rules (delete and re-insert for simplicity)
    if (rules) {
      await supabase.from('schedule_rules').delete().eq('schedule_id', id);
      const rulesToInsert = rules.map(r => ({ ...r, schedule_id: id }));
      await supabase.from('schedule_rules').insert(rulesToInsert);
    }

    // 3. Update locations
    if (location_ids) {
      await supabase.from('schedule_locations').delete().eq('schedule_id', id);
      const locationsToInsert = location_ids.map(lid => ({ schedule_id: id, location_id: lid }));
      await supabase.from('schedule_locations').insert(locationsToInsert);
    }

    return schedule as Schedule;
  },

  async delete(id: string) {
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};