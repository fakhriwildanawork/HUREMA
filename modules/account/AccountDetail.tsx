
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'https://esm.sh/qrcode.react@4.1.0';
import { X, Edit2, Trash2, User, Phone, Mail, Calendar, MapPin, Briefcase, Shield, Heart, GraduationCap, Download, ExternalLink } from 'lucide-react';
import { Account } from '../../types';
import { accountService } from '../../services/accountService';
import { googleDriveService } from '../../services/googleDriveService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

interface AccountDetailProps {
  id: string;
  onClose: () => void;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
}

const AccountDetail: React.FC<AccountDetailProps> = ({ id, onClose, onEdit, onDelete }) => {
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    accountService.getById(id).then(data => {
      setAccount(data as any);
      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#006E62] border-t-transparent rounded-full animate-spin"></div></div>;
  if (!account) return null;

  const DetailSection = ({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
    <div className="bg-white border border-gray-100 p-5 rounded-md shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-50 pb-3 mb-4">
        <Icon size={16} className="text-[#006E62]" />
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{title}</h4>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  const DataRow = ({ label, value, isFile = false }: { label: string, value: any, isFile?: boolean }) => (
    <div>
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">{label}</p>
      {isFile && value ? (
        <a href={googleDriveService.getFileUrl(value)} target="_blank" className="flex items-center gap-1.5 text-[11px] text-[#006E62] font-bold hover:underline">
          <Download size={10} /> LIHAT DOKUMEN
        </a>
      ) : (
        <p className="text-xs text-gray-700 font-medium leading-tight">{value || '-'}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header Profile */}
      <div className="bg-white rounded-md border border-gray-100 p-6 flex flex-col md:flex-row gap-6 items-start shadow-sm">
        <div className="w-32 h-32 rounded-md border-4 border-gray-50 overflow-hidden shrink-0 shadow-inner">
          {account.photo_google_id ? (
            <img src={googleDriveService.getFileUrl(account.photo_google_id)} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
              <User size={48} />
            </div>
          )}
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
             <h2 className="text-2xl font-bold text-gray-800 tracking-tight">{account.full_name}</h2>
             <span className="px-2 py-0.5 bg-[#006E62]/10 text-[#006E62] text-[10px] font-bold uppercase rounded">{account.employee_type}</span>
          </div>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{account.position} • {account.internal_nik}</p>
          <div className="flex flex-wrap gap-4 pt-2">
             <div className="flex items-center gap-1.5 text-xs text-gray-600"><MapPin size={14} className="text-gray-400" /> {(account as any).location?.name || '-'}</div>
             <div className="flex items-center gap-1.5 text-xs text-gray-600"><Mail size={14} className="text-gray-400" /> {account.email || '-'}</div>
             <div className="flex items-center gap-1.5 text-xs text-gray-600"><Phone size={14} className="text-gray-400" /> {account.phone || '-'}</div>
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded border border-gray-100 flex flex-col items-center gap-2">
          <QRCodeSVG value={account.id} size={80} bgColor="#F9FAFB" />
          <p className="text-[8px] font-bold text-gray-400 tracking-widest uppercase">Member ID</p>
        </div>

        <div className="flex gap-2">
           <button onClick={() => onEdit(account)} className="p-2 border border-gray-100 rounded text-gray-400 hover:text-[#006E62] transition-colors"><Edit2 size={16} /></button>
           <button onClick={() => onDelete(account.id)} className="p-2 border border-gray-100 rounded text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DetailSection icon={User} title="Informasi Personal">
          <div className="grid grid-cols-2 gap-4">
             <DataRow label="NIK KTP" value={account.nik_ktp} />
             <DataRow label="Tanggal Lahir" value={account.dob} />
             <DataRow label="Gender" value={account.gender} />
             <DataRow label="Agama" value={account.religion} />
             <DataRow label="Status Nikah" value={account.marital_status} />
             <DataRow label="Tanggungan" value={account.dependents_count} />
          </div>
          <DataRow label="Alamat Domisili" value={account.address} />
        </DetailSection>

        <DetailSection icon={Briefcase} title="Karier & Penempatan">
          <div className="grid grid-cols-2 gap-4">
             <DataRow label="Jabatan" value={account.position} />
             <DataRow label="Golongan" value={account.grade} />
             <DataRow label="NIK Internal" value={account.internal_nik} />
             <DataRow label="Jadwal" value={account.schedule_type} />
             <DataRow label="Mulai Kerja" value={account.start_date} />
             <DataRow label="Akhir Kerja" value={account.end_date || 'Aktif'} />
          </div>
        </DetailSection>

        <DetailSection icon={Shield} title="Presensi & Akses">
           <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded text-[11px] font-bold">
                <span className="text-gray-500">KODE AKSES</span>
                <span className="text-[#006E62] tracking-widest">{account.access_code}</span>
              </div>
              <p className="text-[9px] font-bold text-gray-400 uppercase mt-2">Kebijakan Radius Presensi</p>
              <div className="grid grid-cols-2 gap-2">
                 {[
                   { id: 'is_presence_limited_checkin', label: 'Check-in Datang' },
                   { id: 'is_presence_limited_checkout', label: 'Check-out Pulang' },
                   { id: 'is_presence_limited_ot_in', label: 'Check-in Lembur' },
                   { id: 'is_presence_limited_ot_out', label: 'Check-out Lembur' }
                 ].map(item => (
                   <div key={item.id} className="flex items-center justify-between px-2 py-1.5 border border-gray-100 rounded bg-gray-50/50">
                      <span className="text-[9px] font-medium text-gray-600">{item.label}</span>
                      <span className={`text-[8px] font-bold uppercase ${account[item.id as keyof Account] ? 'text-[#006E62]' : 'text-orange-500'}`}>
                        {account[item.id as keyof Account] ? 'Terbatas' : 'Bebas'}
                      </span>
                   </div>
                 ))}
              </div>
           </div>
        </DetailSection>

        <DetailSection icon={GraduationCap} title="Pendidikan & Dokumen">
           <DataRow label="Pendidikan Terakhir" value={account.last_education} />
           <div className="grid grid-cols-2 gap-4 pt-2">
              <DataRow label="Scan KTP" value={account.ktp_google_id} isFile />
              <DataRow label="Scan Ijazah" value={account.diploma_google_id} isFile />
           </div>
        </DetailSection>

        <DetailSection icon={Heart} title="Kesehatan & Darurat">
           <div className="grid grid-cols-2 gap-4">
              <DataRow label="Status MCU" value={account.mcu_status} />
              <DataRow label="Risiko Kesehatan" value={account.health_risk} />
           </div>
           <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-[10px] font-bold text-[#006E62] uppercase tracking-widest mb-3">Kontak Darurat</p>
              <div className="space-y-2">
                <DataRow label="Nama Kontak" value={account.emergency_contact_name} />
                <div className="grid grid-cols-2 gap-4">
                  <DataRow label="Hubungan" value={account.emergency_contact_rel} />
                  <DataRow label="No HP" value={account.emergency_contact_phone} />
                </div>
              </div>
           </div>
        </DetailSection>
      </div>
    </div>
  );
};

export default AccountDetail;
