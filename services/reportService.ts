
import { supabase } from '../lib/supabase';
import { Attendance, Overtime, LeaveRequest, AnnualLeaveRequest, PermissionRequest, MaternityLeaveRequest, Account } from '../types';

export const reportService = {
  async getAttendanceReport(startDate: string, endDate: string) {
    // Fetch all necessary data in parallel
    const [
      { data: accounts },
      { data: attendances },
      { data: overtimes },
      { data: leaves },
      { data: annualLeaves },
      { data: permissions },
      { data: maternityLeaves }
    ] = await Promise.all([
      supabase.from('accounts').select('id, full_name, internal_nik'),
      supabase.from('attendances').select('*').gte('check_in', `${startDate}T00:00:00Z`).lte('check_in', `${endDate}T23:59:59Z`),
      supabase.from('overtimes').select('*').gte('check_in', `${startDate}T00:00:00Z`).lte('check_in', `${endDate}T23:59:59Z`),
      supabase.from('account_leave_requests').select('*').eq('status', 'approved').lte('start_date', endDate).gte('end_date', startDate),
      supabase.from('account_annual_leaves').select('*').eq('status', 'approved').lte('start_date', endDate).gte('end_date', startDate),
      supabase.from('account_permission_requests').select('*').eq('status', 'approved').lte('start_date', endDate).gte('end_date', startDate),
      supabase.from('account_maternity_leaves').select('*').eq('status', 'approved').lte('start_date', endDate).gte('end_date', startDate)
    ]);

    return {
      accounts: accounts || [],
      attendances: attendances || [],
      overtimes: overtimes || [],
      leaves: leaves || [],
      annualLeaves: annualLeaves || [],
      permissions: permissions || [],
      maternityLeaves: maternityLeaves || []
    };
  }
};
