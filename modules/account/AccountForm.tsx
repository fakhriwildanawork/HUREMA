
import React, { useState, useEffect } from 'react';
import { X, Save, Upload, User, MapPin, Briefcase, GraduationCap, ShieldCheck, Heart } from 'lucide-react';
import { AccountInput, Location } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';
import { locationService } from '../../services/locationService';

interface AccountFormProps {
  onClose: () => void;
  onSubmit: (data: AccountInput) => void;
  initialData?: Partial<AccountInput>;
}

const AccountForm: React.FC<AccountFormProps> = ({ onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState<AccountInput>({
    full_name: initialData?.full_name || '',
    nik_ktp: initialData?.nik_ktp || '',
    gender: initialData?.gender || 'Laki-laki',
    religion: initialData?.religion || '',
    dob: initialData?.dob || '',
    address: initialData?.address || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    marital_status: initialData?.marital_status || 'Belum Menikah',
    dependents_count: initialData?.dependents_count || 0,
    emergency_contact_name: initialData?.emergency_contact_name || '',
    emergency_contact_rel: initialData?.emergency_contact_rel || '',
    emergency_contact_phone: initialData?.emergency_contact_phone || '',
    last_education: initialData?.last_education || '',
    internal_nik: initialData?.internal_nik || '',
    position: initialData?.position || '',
    grade: initialData?.grade || '',
    location_id: initialData?.location_id || '',
    employee_type: initialData?.employee_type || 'Tetap',
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
    schedule_type: initialData?.schedule_type || 'Office Hour',
    leave_quota: initialData?.leave_quota || 12,
    is_presence_limited_checkin: initialData?.is_presence_limited_checkin ?? true,
    is_presence_limited_checkout: initialData?.is_presence_limited_checkout ?? true,
    is_presence_limited_ot_in: initialData?.is_presence_limited_ot_in ?? true,
    is_presence_limited_ot_out: initialData?.is_presence_limited_ot_out ?? true,
    access_code: initialData?.access_code || '',
    password: initialData?.password || '',
    mcu_status: initialData?.mcu_status || '',
    health_risk: initialData?.health_risk || '',
    photo_google_id: initialData?.photo_google_id || '',
    ktp_google_id: initialData?.ktp_google_id || '',
    diploma_google_id: initialData?.diploma_google_id || '',
  });

  const [locations, setLocations] = useState<Location[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    locationService.getAll().then(setLocations);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(prev => ({ ...prev, [field]: true }));
      const fileId = await googleDriveService.uploadFile(file);
      setFormData(prev => ({ ...prev, [field]: fileId }));
    } catch (error) {
      alert('Gagal mengunggah file.');
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4 mt-6">
      <Icon size={16} className="text-[#006E62]" />
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#006E62]">{title}</h4>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-200">
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#006E62]">
            {initialData ? 'Ubah Akun' : 'Registrasi Akun Baru'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
            
            {/* Kolom Kiri: Identitas & Sosial */}
            <div className="space-y-4">
              <SectionHeader icon={User} title="Informasi Identitas" />
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-2 bg-gray-50 rounded border border-gray-100">
                  <div className="w-16 h-16 rounded bg-white border border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group">
                    {formData.photo_google_id ? (
                      <img src={googleDriveService.getFileUrl(formData.photo_google_id)} className="w-full h-full object-cover" />
                    ) : (
                      <Upload size={14} className="text-gray-300" />
                    )}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'photo_google_id')} />
                    {uploading['photo_google_id'] && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>}
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase leading-tight">Foto Profil<br/><span className="font-normal italic">G-Drive Storage</span></div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Nama Lengkap</label>
                    <input name="full_name" value={formData.full_name} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">NIK KTP</label>
                      <input name="nik_ktp" value={formData.nik_ktp} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Tgl Lahir</label>
                      <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Gender</label>
                      <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none">
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Agama</label>
                      <input name="religion" value={formData.religion} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              <SectionHeader icon={MapPin} title="Kontak & Alamat" />
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">Alamat Domisili</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">No Telepon</label>
                    <input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Status Pernikahan</label>
                    <select name="marital_status" value={formData.marital_status} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none">
                      <option value="Belum Menikah">Belum Menikah</option>
                      <option value="Menikah">Menikah</option>
                      <option value="Cerai">Cerai</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Tanggungan</label>
                    <input type="number" name="dependents_count" value={formData.dependents_count} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Kolom Tengah: Karier & Pendidikan */}
            <div className="space-y-4">
              <SectionHeader icon={Briefcase} title="Karier & Penempatan" />
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">NIK Internal</label>
                    <input name="internal_nik" value={formData.internal_nik} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Lokasi</label>
                    <select name="location_id" value={formData.location_id} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required>
                      <option value="">-- Pilih Lokasi --</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Jabatan</label>
                    <input name="position" value={formData.position} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Golongan</label>
                    <input name="grade" value={formData.grade} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">Jenis Karyawan</label>
                  <select name="employee_type" value={formData.employee_type} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none">
                    <option value="Tetap">Tetap</option>
                    <option value="Kontrak">Kontrak</option>
                    <option value="Harian">Harian</option>
                    <option value="Magang">Magang</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Tgl Mulai</label>
                    <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Tgl Akhir</label>
                    <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                  </div>
                </div>
              </div>

              <SectionHeader icon={GraduationCap} title="Pendidikan & Dokumen" />
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">Pendidikan Terakhir</label>
                  <input name="last_education" value={formData.last_education} onChange={handleChange} placeholder="cth: S1 Teknik Informatika" className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <label className="block p-2 border border-dashed border-gray-300 rounded text-center cursor-pointer hover:bg-gray-50 group">
                      <div className="text-[8px] font-bold text-gray-400 group-hover:text-[#006E62] uppercase">Upload KTP</div>
                      <div className="text-[10px] text-gray-300 truncate">{formData.ktp_google_id ? 'FILE OK' : 'No File'}</div>
                      <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'ktp_google_id')} />
                   </label>
                   <label className="block p-2 border border-dashed border-gray-300 rounded text-center cursor-pointer hover:bg-gray-50 group">
                      <div className="text-[8px] font-bold text-gray-400 group-hover:text-[#006E62] uppercase">Upload Ijazah</div>
                      <div className="text-[10px] text-gray-300 truncate">{formData.diploma_google_id ? 'FILE OK' : 'No File'}</div>
                      <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'diploma_google_id')} />
                   </label>
                </div>
              </div>
              
              <SectionHeader icon={Heart} title="Kontak Darurat" />
              <div className="space-y-2">
                <input name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} placeholder="Nama Lengkap" className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <input name="emergency_contact_rel" value={formData.emergency_contact_rel} onChange={handleChange} placeholder="Hubungan" className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                  <input name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange} placeholder="No HP" className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Pengaturan & Keamanan */}
            <div className="space-y-4">
              <SectionHeader icon={ShieldCheck} title="Presensi & Keamanan" />
              <div className="space-y-3">
                 <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Jenis Jadwal</label>
                    <input name="schedule_type" value={formData.schedule_type} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                 </div>
                 <div className="space-y-2 pt-2">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-2">Batasan Radius Presensi</p>
                    <div className="space-y-1.5">
                       {[
                         { id: 'is_presence_limited_checkin', label: 'Check-in Datang' },
                         { id: 'is_presence_limited_checkout', label: 'Check-out Pulang' },
                         { id: 'is_presence_limited_ot_in', label: 'Check-in Lembur' },
                         { id: 'is_presence_limited_ot_out', label: 'Check-out Lembur' }
                       ].map(item => (
                         <label key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100 cursor-pointer hover:bg-white transition-colors">
                            <span className="text-[10px] font-medium text-gray-600">{item.label}</span>
                            <div className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" name={item.id} checked={(formData as any)[item.id]} onChange={handleChange} className="sr-only peer" />
                              <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#006E62]"></div>
                            </div>
                         </label>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Kode Akses</label>
                      <input name="access_code" value={formData.access_code} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Password</label>
                      <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                    </div>
                 </div>

                 <div className="space-y-1 pt-2">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Status Medis / MCU</label>
                    <input name="mcu_status" value={formData.mcu_status} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Risiko Kesehatan</label>
                    <input name="health_risk" value={formData.health_risk} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                 </div>
              </div>
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Batal</button>
          <button 
            onClick={() => onSubmit(formData)}
            className="flex items-center gap-2 bg-[#006E62] text-white px-8 py-2 rounded shadow-md hover:bg-[#005a50] transition-all text-xs font-bold uppercase"
          >
            <Save size={14} /> Simpan Akun
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountForm;
