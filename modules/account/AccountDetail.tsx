import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Edit2, Trash2, User, Phone, Mail, Calendar, MapPin, Briefcase, Shield, Heart, GraduationCap, Download, ExternalLink, Clock, Activity, Plus, Paperclip, FileBadge } from 'lucide-react';
import Swal from 'sweetalert2';
import { Account, CareerLog, HealthLog, AccountContract } from '../../types';
import { accountService } from '../../services/accountService';
import { contractService } from '../../services/contractService';
import { googleDriveService } from '../../services/googleDriveService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import LogForm from './LogForm';

interface AccountDetailProps {
  id: string;
  onClose: () => void;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
}

const AccountDetail: React.FC<AccountDetailProps> = ({ id, onClose, onEdit, onDelete }) => {
  const [account, setAccount] = useState<Account | null>(null);
  const [careerLogs, setCareerLogs] = useState<CareerLog[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [contracts, setContracts] = useState<AccountContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showLogForm, setShowLogForm] = useState<{ type: 'career' | 'health', data?: any, isEdit?: boolean } | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [acc, careers, healths, contractList] = await Promise.all([
        accountService.getById(id),
        accountService.getCareerLogs(id),
        accountService.getHealthLogs(id),
        contractService.getByAccountId(id)
      ]);
      setAccount(acc as any);
      setCareerLogs(careers);
      setHealthLogs(healths);
      setContracts(contractList);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogSubmit = async (data: any) => {
    setIsSaving(true);
    const type = showLogForm?.type;
    const isEdit = showLogForm?.isEdit;
    
    // Optimistic UI Data
    const tempId = data.id || `temp-${Date.now()}`;
    const optimisticEntry = { ...data, id: tempId, change_date: data.change_date || new Date().toISOString() };

    try {
      if (type === 'career') {
        if (isEdit) {
          const updated = await accountService.updateCareerLog(data.id, data);
          setCareerLogs(prev => prev.map(l => l.id === data.id ? updated : l));
        } else {
          setCareerLogs(prev => [optimisticEntry, ...prev]);
          const created = await accountService.createCareerLog(data);
          setCareerLogs(prev => prev.map(l => l.id === tempId ? created : l));
        }
        setAccount(prev => prev ? { ...prev, position: data.position, grade: data.grade, location_id: data.location_id, location: { ...prev.location, name: data.location_name } } : null);
      } else {
        if (isEdit) {
          const updated = await accountService.updateHealthLog(data.id, data);
          setHealthLogs(prev => prev.map(l => l.id === data.id ? updated : l));
        } else {
          setHealthLogs(prev => [optimisticEntry, ...prev]);
          const created = await accountService.createHealthLog(data);
          setHealthLogs(prev => prev.map(l => l.id === tempId ? created : l));
        }
        setAccount(prev => prev ? { ...prev, mcu_status: data.mcu_status, health_risk: data.health_risk } : null);
      }
      setShowLogForm(null);
      Swal.fire({ title: 'Berhasil!', text: `Riwayat telah diperbarui.`, icon: 'success', timer: 1000, showConfirmButton: false });
    } catch (error) {
      Swal.fire('Gagal', 'Gagal menyimpan riwayat', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLog = async (logId: string, type: 'career' | 'health') => {
    const result = await Swal.fire({ title: 'Hapus riwayat?', text: "Data ini tidak dapat dikembalikan.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#006E62', cancelButtonColor: '#ef4444', confirmButtonText: 'Ya, hapus!' });
    if (result.isConfirmed) {
      setIsSaving(true);
      try {
        if (type === 'career') { await accountService.deleteCareerLog(logId); setCareerLogs(prev => prev.filter(l => l.id !== logId)); }
        else { await accountService.deleteHealthLog(logId); setHealthLogs(prev => prev.filter(l => l.id !== logId)); }
        Swal.fire('Terhapus!', 'Riwayat telah dihapus.', 'success');
      } catch (error) { Swal.fire('Gagal', 'Gagal menghapus data', 'error'); }
      finally { setIsSaving(false); }
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#006E62] border-t-transparent rounded-full animate-spin"></div></div>;
  if (!account) return null;

  const DetailSection = ({ icon: Icon, title, onAdd, children }: { icon: any, title: string, onAdd?: () => void, children: React.ReactNode }) => (
    <div className="bg-white border border-gray-100 p-5 rounded-md shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-[#006E62]" />
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{title}</h4>
        </div>
        {onAdd && <button onClick={onAdd} className="p-1 hover:bg-gray-50 text-[#006E62] rounded transition-colors"><Plus size={16} /></button>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );

  const DataRow = ({ label, value, isFile = false }: { label: string, value: any, isFile?: boolean }) => (
    <div>
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">{label}</p>
      {isFile && value ? (
        <a href={googleDriveService.getFileUrl(value).replace('=s1600', '=s0')} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] text-[#006E62] font-bold hover:underline">
          <Paperclip size={10} /> LIHAT DOKUMEN
        </a>
      ) : (
        <p className="text-xs text-gray-700 font-medium leading-tight">{value || '-'}</p>
      )}
    </div>
  );

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 pb-20">
      {isSaving && <LoadingSpinner />}
      
      <div className="bg-white rounded-md border border-gray-100 p-6 flex flex-col md:flex-row gap-6 items-start shadow-sm">
        <div className="w-32 h-32 rounded-md border-4 border-gray-50 overflow-hidden shrink-0 shadow-inner">
          {account.photo_google_id ? <img src={googleDriveService.getFileUrl(account.photo_google_id)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300"><User size={48} /></div>}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
             <h2 className="text-2xl font-bold text-gray-800 tracking-tight">{account.full_name}</h2>
             <span className="px-2 py-0.5 bg-[#006E62]/10 text-[#006E62] text-[10px] font-bold uppercase rounded">{account.employee_type}</span>
          </div>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{account.position} • {account.internal_nik}</p>
          <div className="flex flex-wrap gap-4 pt-2">
             <div className="flex items-center gap-1.5 text-xs text-gray-600"><MapPin size={14} className="text-gray-400" /> {account.location?.name || '-'}</div>
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
             <DataRow label="Tanggal Lahir" value={formatDate(account.dob)} />
             <DataRow label="Gender" value={account.gender} />
             <DataRow label="Agama" value={account.religion} />
          </div>
          <DataRow label="Alamat Domisili" value={account.address} />
        </DetailSection>

        <DetailSection icon={FileBadge} title="Riwayat Kontrak Kerja">
          <div className="space-y-3">
            {contracts.length === 0 ? <p className="text-[10px] text-gray-400 italic">Belum ada riwayat kontrak.</p> : contracts.map(c => (
              <div key={c.id} className="border-l-2 border-emerald-100 pl-3 py-1">
                <p className="text-[10px] font-bold text-[#006E62] leading-tight">{c.contract_number}</p>
                <p className="text-[9px] text-gray-500 font-medium uppercase tracking-tighter">{c.contract_type}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[8px] text-gray-400 font-bold uppercase">{formatDate(c.start_date)} - {formatDate(c.end_date)}</p>
                  {c.file_id && <a href={googleDriveService.getFileUrl(c.file_id).replace('=s1600', '=s0')} target="_blank" rel="noreferrer" className="text-[#006E62]"><Paperclip size={10} /></a>}
                </div>
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection icon={Clock} title="Riwayat Karir" onAdd={() => setShowLogForm({ type: 'career', data: account })}>
          <div className="space-y-3">
            {careerLogs.length === 0 ? <p className="text-[10px] text-gray-400 italic">Belum ada riwayat karir.</p> : careerLogs.map(log => (
              <div key={log.id} className="flex group justify-between items-start border-l-2 border-gray-100 pl-3 py-1 relative">
                <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-[#006E62]"></div>
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[10px] font-bold text-[#006E62] leading-tight">{log.position} • {log.grade}</p>
                  <p className="text-[9px] text-gray-400 font-medium">{log.location_name}</p>
                  <p className="text-[8px] text-gray-300 font-bold uppercase">{formatDate(log.change_date)}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setShowLogForm({ type: 'career', data: log, isEdit: true })} className="text-gray-300 hover:text-[#006E62]"><Edit2 size={12} /></button>
                  <button onClick={() => handleDeleteLog(log.id, 'career')} className="text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </DetailSection>
      </div>

      {showLogForm && (
        <LogForm 
          type={showLogForm.type}
          accountId={id}
          initialData={showLogForm.data}
          isEdit={showLogForm.isEdit}
          onClose={() => setShowLogForm(null)}
          onSubmit={handleLogSubmit}
        />
      )}
    </div>
  );
};

export default AccountDetail;