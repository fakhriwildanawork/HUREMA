import React from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';

interface AttendanceHeatmapProps {
  details: {
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'MATERNITY' | 'PERMISSION' | 'HOLIDAY' | 'SPECIAL_HOLIDAY' | 'WEEKEND';
    isLate: boolean;
    isEarlyDeparture: boolean;
    isNoClockOut: boolean;
  }[];
  startDate: string;
  endDate: string;
}

const AttendanceHeatmap: React.FC<AttendanceHeatmapProps> = ({ details, startDate, endDate }) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const days = eachDayOfInterval({ start, end });

  const getStatusColor = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const detail = details.find(d => d.date === dateStr);

    if (!detail) return 'bg-gray-50';

    switch (detail.status) {
      case 'PRESENT':
        if (detail.isLate || detail.isEarlyDeparture || detail.isNoClockOut) return 'bg-amber-400';
        return 'bg-emerald-500';
      case 'ABSENT':
        return 'bg-rose-500';
      case 'LEAVE':
      case 'MATERNITY':
      case 'PERMISSION':
        return 'bg-blue-400';
      case 'HOLIDAY':
      case 'SPECIAL_HOLIDAY':
        return 'bg-gray-200';
      default:
        return 'bg-gray-50';
    }
  };

  const getStatusLabel = (detail: any) => {
    if (!detail) return 'N/A';
    let label = detail.status;
    if (detail.isLate) label += ' (Terlambat)';
    if (detail.isEarlyDeparture) label += ' (Pulang Cepat)';
    if (detail.isNoClockOut) label += ' (Tanpa Absen Pulang)';
    return label;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pola Kehadiran (Heatmap)</h4>
        <div className="flex items-center gap-3">
          {[
            { label: 'Hadir', color: 'bg-emerald-500' },
            { label: 'Bermasalah', color: 'bg-amber-400' },
            { label: 'Mangkir', color: 'bg-rose-500' },
            { label: 'Cuti/Izin', color: 'bg-blue-400' },
            { label: 'Libur', color: 'bg-gray-200' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
              <span className="text-[8px] font-bold text-gray-400 uppercase">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
          <div key={d} className="text-center text-[8px] font-bold text-gray-300 uppercase py-1">{d}</div>
        ))}
        {days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const detail = details.find(d => d.date === dateStr);
          return (
            <div 
              key={i} 
              className={`aspect-square rounded-md ${getStatusColor(day)} flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110 cursor-help group relative`}
              title={`${format(day, 'dd MMM yyyy', { locale: id })}: ${getStatusLabel(detail)}`}
            >
              <span className={`${detail?.status === 'HOLIDAY' || detail?.status === 'SPECIAL_HOLIDAY' ? 'text-gray-400' : 'text-white'}`}>
                {format(day, 'd')}
              </span>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                <div className="bg-gray-800 text-white text-[8px] py-1 px-2 rounded whitespace-nowrap shadow-xl">
                  {format(day, 'dd MMM yyyy', { locale: id })}: {getStatusLabel(detail)}
                </div>
                <div className="w-2 h-2 bg-gray-800 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AttendanceHeatmap;
