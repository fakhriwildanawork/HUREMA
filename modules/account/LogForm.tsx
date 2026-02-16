
import React, { useState, useEffect } from 'react';
import { X, Save, Upload, FileText, Paperclip, ChevronDown, Calendar } from 'lucide-react';
import { locationService } from '../../services/locationService';
import { googleDriveService } from '../../services/googleDriveService';
import { accountService } from '../../services/accountService';
import { Location } from '../../types';

interface LogFormProps {
  type: 'career' | 'health';
  accountId: string;
  initialData?: any; // Ini bisa data akun (untuk add) atau data log (untuk edit)
  isEdit?: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const LogForm: React.FC<LogFormProps> = ({ type, accountId, initialData, isEdit = false, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<any>({
    account_id: accountId,
    // Career Fields
    position: initialData?.position || '',
    grade: initialData?.grade || '',
    location_id: initialData?.location_id || '',
    location_name: initialData?.location_name || (initialData?.location?.name || ''),
    file_sk_id: initialData?.file_sk_id || '',
    // Health Fields
    mcu_status: initialData?.mcu_status || '',
    health_risk: initialData?.health_risk || '',
    file_mcu_id: initialData?.file_mcu_id || '',
    // Common
    notes: initialData?.notes || '',
    change_date: initialData?.change_date ? initialData.change_date.split('T')[0] : new Date().toISOString().split('T')[0],
  });

  const [locations, setLocations] = useState<Location[]>([]);
  const [suggestions, setSuggestions] = useState<{ positions: string[], grades: string[] }>({ positions: [], grades: [] });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (type === 'career') {
      locationService.getAll().then(setLocations);
    }
    accountService.getDistinctAttributes().then(setSuggestions);
  }, [type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'location_id') {
      const selected = locations.find(l => l.id === value);
      setFormData(prev => ({ 
        ...prev, 
        location_id: value, 
        location_name: selected ? selected.name : '' 
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileId = await googleDriveService.uploadFile(file);
      const field = type === 'career' ? 'file_sk_id' : 'file_mcu_id';
      setFormData(prev => ({ ...prev, [field]: fileId }));
    } catch (error) {
      alert('Gagal mengunggah dokumen.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filtrasi Payload Akhir sebelum dikirim ke Service (Mencegah Error 400)
    let finalPayload: any = {
      account_id: formData.account_id,
      notes: formData.notes,
      change_date: formData.change_date
    };

    if (type === 'career') {
      finalPayload = {
        ...finalPayload,
        position: formData.position,
        grade: formData.grade,
        location_id: formData.location_id,
        location_name: formData.location_name,
        file_sk_id: formData.file_sk_id
      };
    } else {
      finalPayload = {
        ...finalPayload,
        mcu_status: formData.mcu_status,
        health_risk: formData.health_risk,
        file_mcu_id: formData.file_mcu_id
      };
    }

    if (isEdit) {
      onSubmit({ ...finalPayload, id: initialData.id });
    } else {
      onSubmit(finalPayload);
    }
  };

  // Helper untuk menampilkan datalist secara otomatis saat input fokus
  const triggerDatalist = (e: React.FocusEvent<HTMLInputElement>) => {
    // Pada beberapa browser, mengubah value secara singkat memicu datalist muncul
    const currentVal = e.target.value;
    e.target.value = '';
    e.target.value = currentVal;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#006E62]">
              {isEdit ? 'Ubah' : 'Tambah'} {type === 'career' ? 'Riwayat Karir' : 'Riwayat Kesehatan'}
            </h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Pencatatan Riwayat Manual</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase">Tanggal Perubahan</label>
            <div className="relative">
              <input 
                type="date"
                required 
                name="change_date" 
                value={formData.change_date} 
                onChange={handleChange} 
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-[#006E62] bg-gray-50" 
              />
            </div>
          </div>

          {type === 'career' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">Jabatan</label>
                  <div className="relative">
                    <input 
                      required 
                      list="career-pos-list"
                      name="position" 
                      autoComplete="off"
                      value={formData.position} 
                      onChange={handleChange} 
                      onFocus={triggerDatalist}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-[#006E62] pr-6" 
                      placeholder="Pilih atau Ketik"
                    />
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <datalist id="career-pos-list">
                    {suggestions.positions.map(p => <option key={p} value={p} />)}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">Golongan</label>
                  <div className="relative">
                    <input 
                      list="career-grade-list"
                      name="grade" 
                      autoComplete="off"
                      value={formData.grade} 
                      onChange={handleChange} 
                      onFocus={triggerDatalist}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-[#006E62] pr-6" 
                      placeholder="Pilih atau Ketik"
                    />
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <datalist id="career-grade-list">
                    {suggestions.grades.map(g => <option key={g} value={g} />)}
                  </datalist>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase">Lokasi Penempatan</label>
                <div className="relative">
                  <select required name="location_id" value={formData.location_id} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-[#006E62] appearance-none bg-white">
                    <option value="">-- Pilih Lokasi --</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase">Dokumen SK (PDF/Gambar)</label>
                <div className={`flex items-center gap-3 p-2 bg-gray-50 border border-dashed rounded cursor-pointer hover:bg-white transition-colors ${formData.file_sk_id ? 'border-[#006E62]' : 'border-gray-200'}`}>
                  <label className="flex items-center gap-2 cursor-pointer w-full">
                    <div className="p-2 bg-white rounded border border-gray-100 shrink-0">
                      <Upload size={14} className={formData.file_sk_id ? 'text-[#006E62]' : 'text-gray-300'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-gray-600 uppercase">
                        {uploading ? 'Sedang Mengunggah...' : formData.file_sk_id ? 'SK Terunggah' : 'Upload File SK'}
                      </p>
                      <p className="text-[8px] text-gray-400 truncate">{formData.file_sk_id || 'ID akan tersimpan di G-Drive'}</p>
                    </div>
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase">Status MCU</label>
                <input required name="mcu_status" value={formData.mcu_status} onChange={handleChange} placeholder="cth: Fit, Fit with Note, Unfit" className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-[#006E62]" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase">Risiko Kesehatan</label>
                <input name="health_risk" value={formData.health_risk} onChange={handleChange} placeholder="cth: Hipertensi, Rendah, Tinggi" className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-[#006E62]" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase">Hasil MCU (PDF/Gambar)</label>
                <div className={`flex items-center gap-3 p-2 bg-gray-50 border border-dashed rounded cursor-pointer hover:bg-white transition-colors ${formData.file_mcu_id ? 'border-[#006E62]' : 'border-gray-200'}`}>
                  <label className="flex items-center gap-2 cursor-pointer w-full">
                    <div className="p-2 bg-white rounded border border-gray-100 shrink-0">
                      <Upload size={14} className={formData.file_mcu_id ? 'text-[#006E62]' : 'text-gray-300'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-gray-600 uppercase">
                        {uploading ? 'Sedang Mengunggah...' : formData.file_mcu_id ? 'Hasil MCU Terunggah' : 'Upload Dokumen MCU'}
                      </p>
                      <p className="text-[8px] text-gray-400 truncate">{formData.file_mcu_id || 'File rahasia G-Drive'}</p>
                    </div>
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase">Catatan Tambahan</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-[#006E62] resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="text-[10px] font-bold text-gray-400 uppercase">Batal</button>
            <button 
              type="submit" 
              disabled={uploading}
              className="flex items-center gap-2 bg-[#006E62] text-white px-5 py-1.5 rounded text-[10px] font-bold uppercase shadow-md hover:bg-[#005a50] disabled:opacity-50"
            >
              <Save size={12} /> {isEdit ? 'Simpan Perubahan' : 'Simpan Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogForm;
