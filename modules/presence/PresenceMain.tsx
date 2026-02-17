
import React, { useState, useEffect } from 'react';
import { Fingerprint, Clock, MapPin, CheckCircle2, History, AlertCircle, Map as MapIcon } from 'lucide-react';
import Swal from 'sweetalert2';
import { presenceService } from '../../services/presenceService';
import { accountService } from '../../services/accountService';
import { googleDriveService } from '../../services/googleDriveService';
import { Account, Attendance, Schedule, Location } from '../../types';
import PresenceCamera from './PresenceCamera';
import PresenceMap from './PresenceMap';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const PresenceMain: React.FC = () => {
  const [account, setAccount] = useState<Account | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [recentLogs, setRecentLogs] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [serverTime, setServerTime] = useState<Date>(new Date());
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // Hardcoded current session context for demo (in real app, this comes from login)
  const currentAccountId = "81907722-19f8-410e-a895-36be0709b114"; // Demo ID

  useEffect(() => {
    fetchInitialData();
    const timeInterval = setInterval(() => {
      setServerTime(prev => new Date(prev.getTime() + 1000));
    }, 1000);
    
    const geoInterval = setInterval(updateLocation, 5000);
    updateLocation();

    return () => {
      clearInterval(timeInterval);
      clearInterval(geoInterval);
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [acc, attendance, history, sTime] = await Promise.all([
        accountService.getById(currentAccountId),
        presenceService.getTodayAttendance(currentAccountId),
        presenceService.getRecentHistory(currentAccountId),
        presenceService.getServerTime()
      ]);
      setAccount(acc as any);
      setTodayAttendance(attendance);
      setRecentLogs(history);
      setServerTime(sTime);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          if (account?.location) {
            const d = presenceService.calculateDistance(
              pos.coords.latitude, pos.coords.longitude,
              account.location.latitude, account.location.longitude
            );
            setDistance(d);
          }
        },
        null,
        { enableHighAccuracy: true }
      );
    }
  };

  const handleAttendance = async (photoBlob: Blob) => {
    if (!account || !coords || !distance) return;

    const isCheckOut = !!todayAttendance && !todayAttendance.check_out;
    const locationRadius = account.location?.radius || 100;

    if (distance > locationRadius) {
       return Swal.fire('Gagal', `Anda berada diluar radius penempatan (${Math.round(distance)}m > ${locationRadius}m)`, 'error');
    }

    try {
      setIsCapturing(true);
      const photoId = await googleDriveService.uploadFile(new File([photoBlob], `Presence_${isCheckOut ? 'OUT' : 'IN'}_${Date.now()}.jpg`));
      
      const currentTimeStr = serverTime.toISOString();
      
      if (!isCheckOut) {
        // Logika Check In
        const payload: any = {
          account_id: account.id,
          check_in: currentTimeStr,
          in_latitude: coords.lat,
          in_longitude: coords.lng,
          in_photo_id: photoId,
          status_in: 'Tepat Waktu',
          late_minutes: 0
        };
        const res = await presenceService.checkIn(payload);
        setTodayAttendance(res);
      } else {
        // Logika Check Out
        const payload: any = {
          check_out: currentTimeStr,
          out_latitude: coords.lat,
          out_longitude: coords.lng,
          out_photo_id: photoId,
          status_out: 'Tepat Waktu',
          early_departure_minutes: 0
        };
        const res = await presenceService.checkOut(todayAttendance.id, payload);
        setTodayAttendance(res);
      }

      Swal.fire({ title: 'Berhasil!', text: `Presensi ${isCheckOut ? 'Pulang' : 'Masuk'} berhasil dicatat.`, icon: 'success', timer: 2000 });
      fetchInitialData();
    } catch (error) {
      Swal.fire('Error', 'Gagal memproses presensi.', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  if (isLoading) return <LoadingSpinner message="Sinkronisasi Data..." />;

  const isWithinRadius = distance !== null && distance <= (account?.location?.radius || 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Kolom Kiri: Main Camera & Action */}
        <div className="md:col-span-8 space-y-6">
          <div className="bg-white rounded-md border border-gray-100 p-6 shadow-sm overflow-hidden relative">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#006E62]/10 rounded-md">
                    <Fingerprint className="text-[#006E62]" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 tracking-tight">Presensi Reguler</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Waktu & Lokasi Satelit</p>
                  </div>
               </div>
               <div className="text-right">
                  <div className="text-2xl font-mono font-bold text-[#006E62]">
                    {serverTime.toLocaleTimeString('id-ID', { hour12: false })}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">
                    {serverTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
               </div>
            </div>

            {(!todayAttendance || !todayAttendance.check_out) ? (
              <PresenceCamera onCapture={handleAttendance} isProcessing={isCapturing} />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-emerald-50/50 rounded-lg border border-emerald-100 animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-[#006E62] mb-4">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Tugas Selesai!</h3>
                <p className="text-xs text-gray-500 mt-1">Anda sudah melakukan presensi masuk & pulang hari ini.</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-md border border-gray-100 p-6 shadow-sm">
             <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
               <History size={16} className="text-gray-400" />
               <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Riwayat Minggu Ini</h4>
             </div>
             <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100 hover:bg-white transition-colors group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded bg-white flex flex-col items-center justify-center border border-gray-100 shrink-0">
                          <span className="text-[8px] font-bold text-gray-400 uppercase leading-none">{new Date(log.created_at!).toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                          <span className="text-sm font-bold text-[#006E62]">{new Date(log.created_at!).getDate()}</span>
                       </div>
                       <div>
                          <div className="flex items-center gap-3">
                             <div className="text-xs font-bold text-gray-700">Masuk: {log.check_in ? new Date(log.check_in).toLocaleTimeString('id-ID', { hour12: false }) : '-'}</div>
                             <div className="text-xs font-bold text-gray-700">Pulang: {log.check_out ? new Date(log.check_out).toLocaleTimeString('id-ID', { hour12: false }) : '-'}</div>
                          </div>
                          <p className="text-[9px] text-gray-400 font-medium uppercase mt-0.5">Status: <span className="text-[#006E62]">{log.status_in}</span> • Durasi: {log.work_duration || '-'}</p>
                       </div>
                    </div>
                    {log.in_photo_id && (
                      <button 
                        onClick={() => Swal.fire({ imageUrl: googleDriveService.getFileUrl(log.in_photo_id!), imageWidth: 400, showConfirmButton: false })}
                        className="p-1.5 text-gray-300 hover:text-[#006E62] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                         <Fingerprint size={16} />
                      </button>
                    )}
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Kolom Kanan: Status & Map */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-white rounded-md border border-gray-100 p-6 shadow-sm">
             <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
               <Clock size={16} className="text-[#006E62]" />
               <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Informasi Jam Kerja</h4>
             </div>
             <div className="space-y-4">
                <div className="p-3 bg-[#006E62]/5 rounded-md border border-[#006E62]/10">
                   <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Jadwal Hari Ini</p>
                   <p className="text-sm font-bold text-[#006E62]">{account?.schedule_type || 'Office Hour'}</p>
                   <p className="text-[10px] text-gray-600 font-medium mt-1">08:00 - 17:00 (WIB)</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="p-3 bg-gray-50 rounded border border-gray-100">
                      <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Check In</p>
                      <p className="text-xs font-bold text-gray-700">{todayAttendance?.check_in ? new Date(todayAttendance.check_in).toLocaleTimeString('id-ID', { hour12: false }) : '--:--'}</p>
                   </div>
                   <div className="p-3 bg-gray-50 rounded border border-gray-100">
                      <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Check Out</p>
                      <p className="text-xs font-bold text-gray-700">{todayAttendance?.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString('id-ID', { hour12: false }) : '--:--'}</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-md border border-gray-100 p-6 shadow-sm">
             <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
               <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-[#00FFE4]" />
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Status Geotag</h4>
               </div>
               <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${isWithinRadius ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                 {isWithinRadius ? 'Safe Zone' : 'Outside'}
               </span>
             </div>
             
             {account?.location && coords ? (
               <div className="space-y-4">
                  <PresenceMap 
                    userLat={coords.lat} 
                    userLng={coords.lng} 
                    officeLat={account.location.latitude} 
                    officeLng={account.location.longitude}
                    radius={account.location.radius}
                  />
                  <div className="space-y-2">
                     <div className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-400 font-medium">Jarak ke Penempatan</span>
                        <span className={`font-bold ${isWithinRadius ? 'text-gray-700' : 'text-rose-500'}`}>{distance ? `${Math.round(distance)}m` : 'Detecting...'}</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-400 font-medium">Batas Radius</span>
                        <span className="font-bold text-gray-700">{account.location.radius}m</span>
                     </div>
                  </div>
                  {!isWithinRadius && (
                    <div className="p-2 bg-rose-50 border border-rose-100 rounded flex gap-2 items-start">
                       <AlertCircle size={12} className="text-rose-500 shrink-0 mt-0.5" />
                       <p className="text-[9px] text-rose-600 font-medium leading-tight">Tombol presensi akan terkunci jika Anda berada di luar radius penempatan.</p>
                    </div>
                  )}
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                  <MapIcon size={32} strokeWidth={1} />
                  <p className="text-[9px] font-bold uppercase mt-2">Mencari Koordinat GPS...</p>
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PresenceMain;
