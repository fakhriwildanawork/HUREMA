
import React, { useState, useEffect } from 'react';
import { X, Save, Upload, User, MapPin, Briefcase, GraduationCap, ShieldCheck, Heart, AlertCircle } from 'lucide-react';
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
    religion: initialData?.religion || 'Islam',
    dob: initialData?.dob || '',
    address: initialData?.address || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    marital_status: initialData?.marital_status || 'Belum Menikah',
    dependents_count: initialData?.dependents_count || 0,
    emergency_contact_name: initialData?.emergency_contact_name || '',
    emergency_contact_rel: initialData?.emergency_contact_rel || '',
    emergency_contact_phone: initialData?.emergency_contact_phone || '',
    last_education: initialData?.last_education || 'Sarjana',
    major: initialData?.major || '',
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

    // Validasi tipe file (Ekstra Proteksi)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Hanya diperbolehkan mengunggah file Gambar (JPG, PNG, WEBP) atau PDF.');
      return;
    }

    try {
      setUploading(prev => ({ ...prev, [field]: true }));
      // Service ini sekarang sudah menggunakan antrean (Sequential) internal
      const fileId = await googleDriveService.uploadFile(file);
      setFormData(prev => ({ ...prev, [field]: fileId }));
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Gagal mengunggah file. Harap periksa kredensial Google Drive di Vercel.');
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

  const Label = ({ children, required = false }: { children: React.ReactNode, required?: boolean }) => (
    <label className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1">
      {children}
      {required && <span className="text-red-500">*</span>}
    </label>
  );

  const educationOptions = ['Tidak Sekolah', 'SD', 'SMP/Setara', 'SMA/Setara', 'Diploma 1-4', 'Sarjana', 'Profesi', 'Master', 'Doktor'];

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

        <form 
          id="account-form"
          className="flex-1 overflow-y-auto p-6 scrollbar-thin" 
          onSubmit={(e) => { 
            e.preventDefault(); 
            onSubmit(formData); 
          }}
        >
          <div className="bg-orange-50/50 border border-orange-100 p-2 rounded mb-4 flex items-center gap-2">
            <AlertCircle size={14} className="text-orange-400 shrink-0" />
            <p className="text-[10px] text-orange-600 font-medium">Kolom bertanda <span className="text-red-500 font-bold">*</span> wajib diisi dengan benar.</p>
          </div>

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
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={(e) => handleFileUpload(e, 'photo_google_id')} 
                    />
                    {uploading['photo_google_id'] && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>}
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase leading-tight">Foto Profil<br/><span className="font-normal italic">G-Drive Storage</span></div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Label required>Nama Lengkap</Label>
                    <input name="full_name" value={formData.full_name} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <Label required>NIK KTP</Label>
                      <input name="nik_ktp" value={formData.nik_ktp} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required />
                    </div>
                    <div className="flex items-center gap-4 p-2 bg-orange-50/50 rounded border border-orange-100">
                      <label className="w-10 h-10 rounded bg-white border border-dashed border-orange-300 flex items-center justify-center relative overflow-hidden cursor-pointer group shrink-0">
                        {formData.ktp_google_id ? (
                          <ShieldCheck size={18} className="text-[#006E62]" />
                        ) : (
                          <Upload size={14} className="text-orange-300" />
                        )}
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'ktp_google_id')} />
                        {uploading['ktp_google_id'] && <div className="absolute inset-0 bg-black/10 flex items-center justify-center"><div className="w-3 h-3 border-2 border-[#006E62] border-t-transparent rounded-full animate-spin"></div></div>}
                      </label>
                      <div className="text-[8px] text-gray-400 font-bold uppercase leading-tight">Upload Scan KTP<br/><span className="font-normal italic">{formData.ktp_google_id ? 'Tersimpan' : 'Belum ada file'}</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label required>Tgl Lahir</Label>
                      <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required />
                    </div>
                    <div className="space-y-1">
                      <Label required>Gender</Label>
                      <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label required>Agama</Label>
                    <select name="religion" value={formData.religion} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required>
                      <option value="Islam">Islam</option>
                      <option value="Kristen">Kristen</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Budha">Budha</option>
                      <option value="Konghucu">Konghucu</option>
                      <option value="Kepercayaan Lain">Kepercayaan Lain</option>
                    </select>
                  </div>
                </div>
              </div>

              <SectionHeader icon={MapPin} title="Kontak & Alamat" />
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label required>Alamat Domisili</Label>
                  <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none resize-none" required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label required>Email</Label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <Label required>No Telepon</Label>
                    <input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label required>Status Pernikahan</Label>
                    <select name="marital_status" value={formData.marital_status} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required>
                      <option value="Belum Menikah">Belum Menikah</option>
                      <option value="Menikah">Menikah</option>
                      <option value="Cerai Hidup">Cerai Hidup</option>
                      <option value="Cerai Mati">Cerai Mati</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Tanggungan</Label>
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
                    <Label required>NIK Internal</Label>
                    <input name="internal_nik" value={formData.internal_nik} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <Label required>Lokasi</Label>
                    <select name="location_id" value={formData.location_id} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required>
                      <option value="">-- Pilih Lokasi --</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label required>Jabatan</Label>
                    <input name="position" value={formData.position} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <Label>Golongan</Label>
                    <input name="grade" value={formData.grade} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label required>Jenis Karyawan</Label>
                  <select name="employee_type" value={formData.employee_type} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required>
                    <option value="Tetap">Tetap</option>
                    <option value="Kontrak">Kontrak</option>
                    <option value="Harian">Harian</option>
                    <option value="Magang">Magang</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label required>Tgl Mulai</Label>
                    <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <Label>Tgl Akhir</Label>
                    <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                  </div>
                </div>
              </div>

              <SectionHeader icon={GraduationCap} title="Pendidikan & Dokumen" />
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label required>Pendidikan Terakhir</Label>
                    <select name="last_education" value={formData.last_education} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required>
                      {educationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label required>Jurusan</Label>
                    <input name="major" value={formData.major} onChange={handleChange} placeholder="cth: Teknik Sipil" className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                   <label className="flex items-center gap-4 p-2 border border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 group transition-colors">
                      <div className="w-10 h-10 rounded bg-white flex items-center justify-center shrink-0 border border-gray-100">
                        <Upload size={14} className="text-gray-300 group-hover:text-[#006E62]" />
                      </div>
                      <div className="flex-1">
                        <div className="text-[8px] font-bold text-gray-400 group-hover:text-[#006E62] uppercase leading-none mb-1">Upload Ijazah</div>
                        <div className="text-[10px] text-gray-300 truncate">{formData.diploma_google_id ? 'FILE TERSIMPAN' : 'Pilih File (PDF/Gambar)'}</div>
                      </div>
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'diploma_google_id')} />
                      {uploading['diploma_google_id'] && <div className="shrink-0"><div className="w-3 h-3 border-2 border-[#006E62] border-t-transparent rounded-full animate-spin"></div></div>}
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
                    <Label>Jenis Jadwal</Label>
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
                      <Label required>Kode Akses</Label>
                      <input name="access_code" value={formData.access_code} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required />
                    </div>
                    <div className="space-y-1">
                      <Label required>Password</Label>
                      <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" required />
                    </div>
                 </div>

                 <div className="space-y-1 pt-2">
                    <Label>Status Medis / MCU</Label>
                    <input name="mcu_status" value={formData.mcu_status} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                 </div>
                 <div className="space-y-1">
                    <Label>Risiko Kesehatan</Label>
                    <input name="health_risk" value={formData.health_risk} onChange={handleChange} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] outline-none" />
                 </div>
              </div>
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Batal</button>
          <button 
            type="submit"
            form="account-form"
            disabled={Object.values(uploading).some(v => v)}
            className="flex items-center gap-2 bg-[#006E62] text-white px-8 py-2 rounded shadow-md hover:bg-[#005a50] transition-all text-xs font-bold uppercase disabled:opacity-50"
          >
            <Save size={14} /> Simpan Akun
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountForm;
