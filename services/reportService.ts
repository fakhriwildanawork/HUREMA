import { supabase } from '../lib/supabase';
import { AttendanceSummary, OvertimeSummary, LeaveSummary, Attendance, Overtime, AnnualLeaveRequest, PermissionRequest, MaternityLeaveRequest, DispensationRequest, Account, Schedule } from '../types';
import { format, eachDayOfInterval, isWeekend, parseISO, isSameDay } from 'date-fns';

export const reportService = {
  async getAttendanceReport(startDate: string, endDate: string): Promise<AttendanceSummary[]> {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const days = eachDayOfInterval({ start, end });

    // 1. Fetch all active accounts
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id, full_name, internal_nik, schedule_id, schedule:schedules(*, rules:schedule_rules(*))')
      .eq('role', 'user');

    if (accError) throw accError;

    // 2. Fetch all relevant data for the period
    const [
      { data: attendances },
      { data: annualLeaves },
      { data: permissions },
      { data: maternityLeaves },
      { data: dispensations },
      { data: schedules }
    ] = await Promise.all([
      supabase.from('attendances').select('*').gte('created_at', `${startDate}T00:00:00Z`).lte('created_at', `${endDate}T23:59:59Z`),
      supabase.from('annual_leave_requests').select('*').eq('status', 'approved').or(`start_date.lte.${endDate},end_date.gte.${startDate}`),
      supabase.from('permission_requests').select('*').eq('status', 'approved').or(`start_date.lte.${endDate},end_date.gte.${startDate}`),
      supabase.from('maternity_leave_requests').select('*').eq('status', 'approved').or(`start_date.lte.${endDate},end_date.gte.${startDate}`),
      supabase.from('dispensation_requests').select('*').eq('status', 'APPROVED').gte('date', startDate).lte('date', endDate),
      supabase.from('schedules').select('*, rules:schedule_rules(*)').eq('type', 3) // Special Holidays
    ]);

    const report: AttendanceSummary[] = (accounts as any[]).map(acc => {
      const accAttendances = attendances?.filter(a => a.account_id === acc.id) || [];
      const accAnnualLeaves = annualLeaves?.filter(l => l.account_id === acc.id) || [];
      const accPermissions = permissions?.filter(p => p.account_id === acc.id) || [];
      const accMaternityLeaves = maternityLeaves?.filter(m => m.account_id === acc.id) || [];
      const accDispensations = dispensations?.filter(d => d.account_id === acc.id) || [];

      let present = 0;
      let late = 0;
      let lateMinutes = 0;
      let earlyDeparture = 0;
      let earlyDepartureMinutes = 0;
      let absent = 0;
      let leave = 0;
      let maternityLeave = 0;
      let permission = 0;
      let holiday = 0;
      let specialHoliday = 0;
      let noClockOut = 0;
      let dispensationCount = accDispensations.length;

      const dailyDetails = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        
        // Check Special Holiday
        const isSpecialHoliday = schedules?.some(s => {
          const sStart = s.start_date;
          const sEnd = s.end_date;
          return dateStr >= sStart && dateStr <= sEnd && !s.excluded_account_ids?.includes(acc.id);
        });

        if (isSpecialHoliday) {
          specialHoliday++;
          return { date: dateStr, status: 'SPECIAL_HOLIDAY' as const, isLate: false, isEarlyDeparture: false, isNoClockOut: false };
        }

        // Check Weekend (Regular Holiday)
        const dayOfWeek = day.getDay();
        const scheduleRules = acc.schedule?.rules || [];
        const rule = scheduleRules.find((r: any) => r.day_of_week === dayOfWeek);
        const isRegularHoliday = rule ? rule.is_holiday : isWeekend(day);

        if (isRegularHoliday) {
          holiday++;
          return { date: dateStr, status: 'HOLIDAY' as const, isLate: false, isEarlyDeparture: false, isNoClockOut: false };
        }

        // Check Attendance
        const att = accAttendances.find(a => a.created_at.startsWith(dateStr));
        const disp = accDispensations.find(d => d.date === dateStr);

        // Check Approved Leaves
        const isAnnualLeave = accAnnualLeaves.some(l => dateStr >= l.start_date && dateStr <= l.end_date);
        const isPermission = accPermissions.some(p => dateStr >= p.start_date && dateStr <= p.end_date);
        const isMaternity = accMaternityLeaves.some(m => dateStr >= m.start_date && dateStr <= m.end_date);

        if (isAnnualLeave) {
          leave++;
          return { date: dateStr, status: 'LEAVE' as const, isLate: false, isEarlyDeparture: false, isNoClockOut: false };
        }
        if (isPermission) {
          permission++;
          return { date: dateStr, status: 'PERMISSION' as const, isLate: false, isEarlyDeparture: false, isNoClockOut: false };
        }
        if (isMaternity) {
          maternityLeave++;
          return { date: dateStr, status: 'MATERNITY' as const, isLate: false, isEarlyDeparture: false, isNoClockOut: false };
        }

        if (att) {
          present++;
          const isLate = att.late_minutes > 0 && !disp?.issues.some(i => i.type === 'LATE' && i.status === 'APPROVED');
          const isEarly = att.early_departure_minutes > 0 && !disp?.issues.some(i => i.type === 'EARLY_LEAVE' && i.status === 'APPROVED');
          const isNoOut = !att.check_out && !disp?.issues.some(i => i.type === 'NO_CLOCK_OUT' && i.status === 'APPROVED');

          if (isLate) {
            late++;
            lateMinutes += att.late_minutes;
          }
          if (isEarly) {
            earlyDeparture++;
            earlyDepartureMinutes += att.early_departure_minutes;
          }
          if (isNoOut) noClockOut++;

          return { date: dateStr, status: 'PRESENT' as const, isLate, isEarlyDeparture: isEarly, isNoClockOut: isNoOut };
        }

        // If no attendance and no leave, it's ABSENT unless there's an approved dispensation for ABSENT
        const isDispensedAbsent = disp?.issues.some(i => i.type === 'ABSENT' && i.status === 'APPROVED');
        if (isDispensedAbsent) {
          present++; // Treat as present if absent is dispensed
          return { date: dateStr, status: 'PRESENT' as const, isLate: false, isEarlyDeparture: false, isNoClockOut: false };
        }

        absent++;
        return { date: dateStr, status: 'ABSENT' as const, isLate: false, isEarlyDeparture: false, isNoClockOut: false };
      });

      const totalWorkingDays = days.length - holiday - specialHoliday;
      const attendanceRate = totalWorkingDays > 0 ? (present / totalWorkingDays) * 100 : 0;

      return {
        accountId: acc.id,
        fullName: acc.full_name,
        nik: acc.internal_nik,
        totalDays: days.length,
        present,
        late,
        lateMinutes,
        earlyDeparture,
        earlyDepartureMinutes,
        absent,
        leave,
        maternityLeave,
        permission,
        holiday,
        specialHoliday,
        noClockOut,
        dispensationCount,
        attendanceRate,
        dailyDetails
      };
    });

    return report;
  },

  async getOvertimeReport(startDate: string, endDate: string): Promise<OvertimeSummary[]> {
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id, full_name, internal_nik')
      .eq('role', 'user');

    if (accError) throw accError;

    const { data: overtimes, error: otError } = await supabase
      .from('overtimes')
      .select('*')
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`);

    if (otError) throw otError;

    // Fetch salary schemes to estimate cost
    const { data: schemes } = await supabase
      .from('salary_assignments')
      .select('account_id, scheme:salary_schemes(overtime_rate_per_hour)');

    return (accounts as any[]).map(acc => {
      const accOvertimes = overtimes?.filter(ot => ot.account_id === acc.id) || [];
      const totalMinutes = accOvertimes.reduce((sum, ot) => sum + (ot.duration_minutes || 0), 0);
      const schemeData = schemes?.find(s => s.account_id === acc.id)?.scheme;
      const rate = Array.isArray(schemeData) ? schemeData[0]?.overtime_rate_per_hour : (schemeData as any)?.overtime_rate_per_hour || 0;

      return {
        accountId: acc.id,
        fullName: acc.full_name,
        nik: acc.internal_nik,
        totalOvertimeMinutes: totalMinutes,
        totalOvertimeHours: Number((totalMinutes / 60).toFixed(2)),
        overtimeCount: accOvertimes.length,
        estimatedCost: (totalMinutes / 60) * rate
      };
    });
  },

  async getLeaveReport(): Promise<LeaveSummary[]> {
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id, full_name, internal_nik, leave_quota, carry_over_quota, maternity_leave_quota')
      .eq('role', 'user');

    if (accError) throw accError;

    const [
      { data: annualLeaves },
      { data: permissions },
      { data: maternityLeaves }
    ] = await Promise.all([
      supabase.from('annual_leave_requests').select('*').eq('status', 'approved'),
      supabase.from('permission_requests').select('*').eq('status', 'approved'),
      supabase.from('maternity_leave_requests').select('*').eq('status', 'approved')
    ]);

    const calculateDays = (start: string, end: string) => {
      const s = new Date(start);
      const e = new Date(end);
      return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    };

    return (accounts as any[]).map(acc => {
      const usedAnnual = annualLeaves
        ?.filter(l => l.account_id === acc.id)
        .reduce((sum, l) => sum + calculateDays(l.start_date, l.end_date), 0) || 0;
      
      const usedMaternity = maternityLeaves
        ?.filter(m => m.account_id === acc.id)
        .reduce((sum, m) => sum + calculateDays(m.start_date, m.end_date), 0) || 0;

      const permCount = permissions?.filter(p => p.account_id === acc.id).length || 0;

      const totalQuota = (acc.leave_quota || 0) + (acc.carry_over_quota || 0);

      return {
        accountId: acc.id,
        fullName: acc.full_name,
        nik: acc.internal_nik,
        totalQuota,
        usedQuota: usedAnnual,
        remainingQuota: totalQuota - usedAnnual,
        carryOverQuota: acc.carry_over_quota || 0,
        maternityQuota: acc.maternity_leave_quota || 0,
        maternityUsed: usedMaternity,
        permissionCount: permCount
      };
    });
  }
};
