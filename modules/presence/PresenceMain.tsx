
import React, { useState, useEffect, useRef } from 'react';
import { Fingerprint, Clock, MapPin, History, AlertCircle, Map as MapIcon, Camera, Search, UserX } from 'lucide-react';
import Swal from 'sweetalert2';
import { presenceService } from '../../services/presenceService.ts';
import { accountService } from '../../services/accountService.ts';
import { authService } from '../../services/authService.ts';
import { googleDriveService } from '../../services/googleDriveService.ts';
import { Account, Attendance } from '../../types.ts';
import PresenceCamera from './PresenceCamera.tsx';
import PresenceMap from './PresenceMap.tsx';
import PresenceHistory from './PresenceHistory.tsx';
import LoadingSpinner from '../../components/Common/LoadingSpinner.tsx';

const PresenceMain: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'capture' | 'history'>('capture');
  const [account, setAccount] = useState<Account | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [recentLogs, setRecentLogs] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [serverTime, setServerTime] = useState<Date>(new Date());
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);

  // Ambil user dari session
  const currentUser = authService.getCurrentUser();
  const currentAccountId = currentUser?.id;

  useEffect(() => {
    if (!currentAccountId) return;
    
    fetchInitialData();
    const timeInterval = setInterval(() => {
      setServerTime(prev => new Date(prev.getTime() + 1000));
    }, 1000);
    
    startWatchingLocation();

    return () => {
      clearInterval(timeInterval);
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [currentAccountId]);

  const fetchInitialData = async () => {
    if (!currentAccountId) return;
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

  const startWatchingLocation = () => {
    if (navigator.geolocation) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsAccuracy(pos.coords.accuracy);
          // Hanya update titik map jika akurasi di bawah 100m untuk visual yang tenang
          if (pos.coords.accuracy < 100) {
            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          }
        },
        (err) => {
          console.error("GPS Error:", err);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
      );
    }
  };

  useEffect(() => {
    if (coords && account?.location) {
      const d = presenceService.calculateDistance(
        coords.lat, coords.lng,
        account.location.latitude, account.location.longitude
      );
      setDistance(d);
    }
  }, [coords, account]);

  const handleAttendance = async (photoBlob: Blob) => {
    if (!account || !coords || distance === null) return;

    // Tambahan Validasi Akurasi GPS (Mandatory untuk Geotag Presisi)
    if (gpsAccuracy && gpsAccuracy > 50) {
       return Swal.fire({
         title: 'Sinyal Lemah',
         text: `Akurasi GPS Anda terlalu rendah (${Math.round(gpsAccuracy)}m). Harap cari area terbuka.`,
         icon: 'warning',
         confirmButtonColor: '#006E62'
       });
    }

    const isCheckOut = !!todayAttendance && !todayAttendance.check_out;
    const locationRadius = account.location?.radius || 100;

    if (distance > locationRadius) {
       return Swal.fire({
         title: 'Gagal',
         text: `Anda berada diluar radius penempatan (${Math.round(distance)}m > ${locationRadius}m)`,
         icon: 'error',
         confirmButtonColor: '#006E62'
       });
    }

    try {
      setIsCapturing(true);
      const photoId = await googleDriveService.uploadFile(new File([photoBlob], `Presence_${isCheckOut ? 'OUT' : 'IN'}_${Date.now()}.jpg`));
      const currentTimeStr = serverTime.toISOString();
      
      if (!isCheckOut) {
        const payload: any = {
          account_id: account.id,
          check_in: currentTimeStr,
          in_latitude: coords.lat,
          in_longitude: coords.lng,
          in_photo_id: photoId,
          status_in: 'Tepat Waktu',
          late_minutes: 0
        };
        await presenceService.checkIn(payload);
      } else {
        const payload: any = {
          check_out: currentTimeStr,
          out_latitude: coords.lat,
          out_longitude: coords.lng,
          out_photo_id: photoId,
          status_out: 'Tepat Waktu',
          early_departure_minutes: 0
        };
        await presenceService.checkOut(todayAttendance.id, payload);
      }

      await Swal.fire({ 
        title: 'Berhasil!', 
        text: `Presensi ${isCheckOut ? 'Pulang' : 'Masuk'} berhasil dicatat.`, 
        icon: 'success', 
        timer: 2000,
        showConfirmButton: false
      });
      fetchInitialData();
    } catch (error) {
      Swal.fire('Error', 'Gagal memproses presensi.', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  if (isLoading) return <LoadingSpinner message="Sinkronisasi Data Satelit..." />;

  // Jika akun tidak ditemukan (handle maybeSingle)
  if (!account) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl border border-gray-100 shadow-xl text-center">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6">
          <UserX size={40} />
        </div>
        <h3 className="text-xl font-bold text-gray-800">Akun Tidak Dikenali</h3>
        <p className="text-sm text-gray-500 mt-2">ID karyawan tidak terdaftar atau telah dinonaktifkan. Harap hubungi Admin HR.</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 w-full py-3 bg-[#006E62] text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg hover:bg-[#005a50] transition-all"
        >
          Coba Muat Ulang
        </button>
      </div>
    );
  }

  const isWithinRadius = distance !== null && distance <= (account?.location?.radius || 100);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#006E62]/10 rounded-xl flex items-center justify-center text-[#006E62]">
            <Fingerprint size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Presensi Reguler</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{account?.full_name} • {account?.internal_nik}</p>
          </div>
        </div>
        <div className="flex gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100">
          <button 
            onClick={() => setActiveTab('capture')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'capture' ? 'bg-white text-[#006E62] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Camera size={16} /> Presensi
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'history' ? 'bg-white text-[#006E62] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <History size={16} /> Riwayat
          </button>
        </div>
      </div>

      {activeTab === 'capture' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-500">
          {/* Kolom Kiri: Kamera */}
          <div className="lg:col-span-7">
            {(!todayAttendance || !todayAttendance.check_out) ? (
              <PresenceCamera onCapture={handleAttendance} isProcessing={isCapturing} />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-20 flex flex-col items-center justify-center shadow-sm text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-[#006E62] mb-6 animate-pulse">
                  <Fingerprint size={48} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Tugas Selesai!</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-xs">Terima kasih, Anda telah menyelesaikan presensi masuk dan pulang untuk hari ini.</p>
              </div>
            )}
          </div>

          {/* Kolom Kanan: Status */}
          <div className="lg:col-span-5 space-y-6">
            {/* Server Time Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-[#006E62]" />
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Waktu Terverifikasi</h4>
                  </div>
               </div>
               <div className="text-center py-4">
                  <div className="text-5xl font-mono font-bold text-gray-800 tracking-tighter">
                    {serverTime.toLocaleTimeString('id-ID', { hour12: false })}
                  </div>
                  <div className="text-[11px] font-bold text-[#00FFE4] uppercase tracking-widest mt-2">
                    {serverTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-50">
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Masuk</p>
                    <p className="text-sm font-bold text-gray-700">{todayAttendance?.check_in ? new Date(todayAttendance.check_in).toLocaleTimeString('id-ID', { hour12: false }) : '--:--'}</p>
                  </div>
                  <div className="text-center border-l border-gray-50">
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Pulang</p>
                    <p className="text-sm font-bold text-gray-700">{todayAttendance?.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString('id-ID', { hour12: false }) : '--:--'}</p>
                  </div>
               </div>
            </div>

            {/* GPS Status Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#00FFE4]" />
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Status Geotag</h4>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase ${isWithinRadius ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isWithinRadius ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                    {isWithinRadius ? 'Dalam Radius' : 'Luar Radius'}
                  </div>
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
                    <div className="grid grid-cols-2 gap-4 text-[10px] pt-2">
                       <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-gray-400 font-bold uppercase block mb-1">Jarak</span>
                          <span className={`text-sm font-bold ${isWithinRadius ? 'text-[#006E62]' : 'text-rose-500'}`}>{distance !== null ? `${Math.round(distance)}m` : 'Calculating...'}</span>
                       </div>
                       <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-gray-400 font-bold uppercase block mb-1">Maks Radius</span>
                          <span className="text-sm font-bold text-gray-700">{account.location.radius}m</span>
                       </div>
                    </div>
                    {!isWithinRadius && (
                      <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex gap-3 items-start animate-pulse">
                         <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                         <p className="text-[10px] text-rose-600 font-bold leading-tight uppercase tracking-tight">Presensi dikunci. Anda berada diluar zona yang diizinkan.</p>
                      </div>
                    )}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center py-14 text-gray-300">
                    <MapIcon size={40} strokeWidth={1} className="animate-bounce" />
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-4">Mengunci Sinyal GPS...</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <PresenceHistory logs={recentLogs} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
};

export default PresenceMain;
