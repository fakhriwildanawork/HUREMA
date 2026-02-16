import React, { useState, useEffect } from 'react';
import { X, Save, Clock, Calendar, Users, MapPin, Check } from 'lucide-react';
import { ScheduleInput, Location, Account } from '../../types';
import { locationService } from '../../services/locationService';
import { accountService } from '../../services/accountService';

interface ScheduleFormProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({ onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState<any>({
    name: initialData?.name || '',
    type: initialData?.type || 1,
    tolerance_minutes: initialData?.tolerance_minutes || 0,
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
    excluded_account_ids: initialData?.excluded_account_ids || [],
    rules: initialData?.rules || [],
    location_ids: initialData?.location_ids || []
  });

  const [locations, setLocations] = useState<Location[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'rules' | 'locations' | 'exclusions'>('info');

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  useEffect(() => {
    locationService.getAll().then(setLocations);
    accountService.getAll().then(accs => setAccounts(accs as Account[]));
    
    if (!initialData) {
      // Init default rules for type 1
      const initialRules = days.map((_, idx) => ({
        day_of_week: idx,
        check_in_time: '08:00',
        check_out_time: '17:00',
        is_holiday: idx === 0 || idx === 6 // Sun & Sat holiday by default
      }));
      setFormData(prev => ({ ...prev, rules: initialRules }));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'type' || name === 'tolerance_minutes' ? parseInt(value) : value 
    }));
  };

  const handleRuleChange = (idx: number, field: string, value: any) => {
    const newRules = [...formData.rules];
    newRules[idx] = { ...newRules[idx], [field]: value };
    setFormData(prev => ({ ...prev, rules: newRules }));
  };

  const toggleLocation = (id: string) => {
    setFormData(prev => ({
      ...prev,
      location_ids: prev.location_ids.includes(id) 
        ? prev.location_ids.filter(lid => lid !== id)
        : [...prev.location_ids, id]
    }));
  };

  const toggleExclusion = (id: string) => {
    setFormData(prev => ({
      ...prev,
      excluded_account_ids: prev.excluded_account_ids.includes(id)
        ? prev.excluded_account_ids.filter(aid => aid !== id)
        : [...prev.excluded_account_ids, id]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For type 2: Map rule day_of_week to null or keep 1 set
    // For type 3: rules can be empty or is_holiday true
    let finalRules = formData.rules;
    if (formData.type === 2) {
       finalRules = [{ check_in_time: formData.rules[1].check_in_time, check_out_time: formData.rules[1].check_out_time, is_holiday: false }];
    } else if (formData.type === 3) {
       finalRules = [];
    }

    onSubmit({ ...formData, rules: finalRules });
  };

  const filteredAccounts = accounts.filter(acc => 
    formData.location_ids.length === 0 || (acc.location_id && formData.location_ids.includes(acc.location_id))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#006E62]">
              {initialData ? 'Ubah Jadwal' : 'Tambah Jadwal Baru'}
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Konfigurasi Jam & Lokasi</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
           {['info', 'rules', 'locations', 'exclusions'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all ${
                  activeTab === tab ? 'border-[#006E62] text-[#006E62] bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab === 'info' ? 'Informasi' : tab === 'rules' ? 'Aturan Jam' : tab === 'locations' ? 'Lokasi' : 'Pengecualian'}
              </button>
           ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'info' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Nama Jadwal</label>
                <input 
                  required 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="cth: Office Hour Pusat"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Tipe Jadwal</label>
                  <select name="type" value={formData.type} onChange={handleChange} className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none">
                    <option value={1}>1. Hari Kerja (Fixed)</option>
                    <option value={2}>2. Shift Kerja (Uniform)</option>
                    <option value={3}>3. Libur Khusus (Overriding)</option>
                    <option value={4}>4. Hari Kerja Khusus</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Toleransi Pulang (Menit)</label>
                  <input type="number" name="tolerance_minutes" value={formData.tolerance_minutes} onChange={handleChange} className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                </div>
              </div>
              {formData.type >= 3 && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 border border-orange-100 rounded animate-in slide-in-from-top duration-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-orange-600 uppercase">Mulai Tanggal</label>
                    <input type="date" required name="start_date" value={formData.start_date} onChange={handleChange} className="w-full px-3 py-2 text-xs border border-orange-200 rounded outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-orange-600 uppercase">Sampai Tanggal</label>
                    <input type="date" required name="end_date" value={formData.end_date} onChange={handleChange} className="w-full px-3 py-2 text-xs border border-orange-200 rounded outline-none" />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4 animate-in fade-in duration-200">
               {formData.type === 3 ? (
                 <div className="flex flex-col items-center justify-center py-10 text-gray-400 bg-gray-50 rounded border border-dashed border-gray-200">
                   <Clock size={40} strokeWidth={1} className="mb-2" />
                   <p className="text-xs font-bold uppercase tracking-widest">Tipe Libur: Tidak Perlu Jam Kerja</p>
                 </div>
               ) : formData.type === 2 || formData.type === 4 ? (
                 <div className="bg-gray-50 p-6 rounded border border-gray-100">
                   <p className="text-[10px] font-bold text-gray-400 uppercase mb-4">Set Jam Kerja Uniform</p>
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Jam Masuk</label>
                        <input type="time" value={formData.rules[1]?.check_in_time || '08:00'} onChange={(e) => handleRuleChange(1, 'check_in_time', e.target.value)} className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Jam Pulang</label>
                        <input type="time" value={formData.rules[1]?.check_out_time || '17:00'} onChange={(e) => handleRuleChange(1, 'check_out_time', e.target.value)} className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded" />
                      </div>
                   </div>
                 </div>
               ) : (
                 <div className="space-y-2">
                   {days.map((day, idx) => (
                      <div key={idx} className={`flex items-center gap-4 p-3 rounded border ${formData.rules[idx]?.is_holiday ? 'bg-rose-50 border-rose-100 opacity-60' : 'bg-white border-gray-100'}`}>
                         <div className="w-20 shrink-0 text-[11px] font-bold text-gray-700">{day}</div>
                         <div className="flex-1 flex items-center gap-4">
                            <input type="time" disabled={formData.rules[idx]?.is_holiday} value={formData.rules[idx]?.check_in_time} onChange={(e) => handleRuleChange(idx, 'check_in_time', e.target.value)} className="flex-1 px-2 py-1 text-xs border rounded disabled:bg-transparent" />
                            <span className="text-gray-300">-</span>
                            <input type="time" disabled={formData.rules[idx]?.is_holiday} value={formData.rules[idx]?.check_out_time} onChange={(e) => handleRuleChange(idx, 'check_out_time', e.target.value)} className="flex-1 px-2 py-1 text-xs border rounded disabled:bg-transparent" />
                         </div>
                         <label className="flex items-center gap-2 cursor-pointer shrink-0">
                            <input type="checkbox" checked={formData.rules[idx]?.is_holiday} onChange={(e) => handleRuleChange(idx, 'is_holiday', e.target.checked)} className="rounded border-gray-300 text-[#006E62]" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Libur</span>
                         </label>
                      </div>
                   ))}
                 </div>
               )}
            </div>
          )}

          {activeTab === 'locations' && (
            <div className="animate-in fade-in duration-200">
               <p className="text-[10px] font-bold text-gray-400 uppercase mb-4">Pilih Lokasi yang Terpengaruh Jadwal Ini</p>
               <div className="grid grid-cols-2 gap-2">
                  {locations.map(loc => (
                    <button 
                      key={loc.id} 
                      type="button"
                      onClick={() => toggleLocation(loc.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded border text-xs text-left transition-all ${
                        formData.location_ids.includes(loc.id) 
                        ? 'border-[#006E62] bg-emerald-50 text-[#006E62] font-bold' 
                        : 'border-gray-100 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="truncate">{loc.name}</span>
                      {formData.location_ids.includes(loc.id) && <Check size={14} />}
                    </button>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'exclusions' && (
            <div className="animate-in fade-in duration-200">
               <div className="bg-blue-50 p-4 border border-blue-100 rounded mb-4">
                  <p className="text-[10px] text-blue-700 font-medium">Jadwal Tipe 3 & 4 akan otomatis berlaku bagi SEMUA user di lokasi terpilih. Pilih user di bawah untuk MENGECEUALIKAN mereka (misal Security tetap masuk saat renovasi).</p>
               </div>
               <div className="space-y-2">
                  {filteredAccounts.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic py-10 text-center">Pilih lokasi terlebih dahulu untuk melihat daftar user.</p>
                  ) : (
                    filteredAccounts.map(acc => (
                      <button 
                        key={acc.id}
                        type="button"
                        onClick={() => toggleExclusion(acc.id)}
                        className={`flex items-center justify-between w-full px-4 py-2 rounded border text-xs transition-all ${
                          formData.excluded_account_ids.includes(acc.id)
                          ? 'bg-rose-50 border-rose-100 text-rose-600 font-bold'
                          : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col items-start">
                           <span>{acc.full_name}</span>
                           <span className="text-[9px] font-normal text-gray-400">{acc.internal_nik} • {(acc as any).location?.name}</span>
                        </div>
                        {formData.excluded_account_ids.includes(acc.id) && <X size={14} />}
                      </button>
                    ))
                  )}
               </div>
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Batal</button>
          <button 
            onClick={handleSubmit}
            className="flex items-center gap-2 bg-[#006E62] text-white px-8 py-2 rounded shadow-md hover:bg-[#005a50] transition-all text-xs font-bold uppercase"
          >
            <Save size={14} /> Simpan Jadwal
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleForm;