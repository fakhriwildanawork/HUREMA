
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Edit2, Trash2, User, Phone, Mail, Calendar, MapPin, Briefcase, Shield, Heart, GraduationCap, Download, ExternalLink, Clock, Activity, Plus, Paperclip, FileBadge, Award, ShieldAlert, LogOut } from 'lucide-react';
import Swal from 'sweetalert2';
import { Account, CareerLog, HealthLog, AccountContract, AccountCertification, WarningLog, TerminationLog } from '../../types.ts';
import { accountService } from '../../services/accountService.ts';
import { contractService } from '../../services/contractService.ts';
import { certificationService } from '../../services/certificationService.ts';
import { disciplineService } from '../../services/disciplineService.ts';
import { googleDriveService } from '../../services/googleDriveService.ts';
import LoadingSpinner from '../../components/Common/LoadingSpinner.tsx';
import LogForm from './LogForm.tsx';
import CertificationFormModal from '../certification/CertificationFormModal.tsx';
import ContractFormModal from '../contract/ContractFormModal.tsx';
import WarningForm from '../discipline/WarningForm.tsx';
import TerminationForm from '../discipline/TerminationForm.tsx';

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
  const [certs, setCerts] = useState<AccountCertification[]>([]);
  const [warnings, setWarnings] = useState<WarningLog[]>([]);
  const [termination, setTermination] = useState<TerminationLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showLogForm, setShowLogForm] = useState<{ type: 'career' | 'health', data?: any, isEdit?: boolean } | null>(null);
  const [showCertForm, setShowCertForm] = useState<{ show: boolean, data?: any }>({ show: false });
  const [showContractForm, setShowContractForm] = useState<{ show: boolean, data?: any }>({ show: false });
  const [showWarningForm, setShowWarningForm] = useState(false);
  const [showTerminationForm, setShowTerminationForm] = useState(false);
  
  // Media Preview States
  const [previewMedia, setPreviewMedia] = useState<{ url: string, title: string, type: 'image' | 'qr' } | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [acc, careers, healths, contractList, certList, warningList, term] = await Promise.all([
        accountService.getById(id),
        accountService.getCareerLogs(id),
        accountService.getHealthLogs(id),
        contractService.getByAccountId(id),
        certificationService.getByAccountId(id),
        disciplineService.getWarningsByAccountId(id),
        disciplineService.getTerminationByAccountId(id)
      ]);
      setAccount(acc as any);
      setCareerLogs(careers);
      setHealthLogs(healths);
      setContracts(contractList);
      setCerts(certList);
      setWarnings(warningList);
      setTermination(term || null);
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
      Swal.fire({ title: 'Berhasil!', text: `Riwayat telah ${isEdit ? 'diperbarui' : 'ditambahkan'}.`, icon: 'success', timer: 1000, showConfirmButton: false });
    } catch (error) {
      if (type === 'career' && !isEdit) setCareerLogs(prev => prev.filter(l => l.id !== tempId));
      else if (type === 'health' && !isEdit) setHealthLogs(prev => prev.filter(l => l.id !== tempId));
      Swal.fire('Gagal', 'Gagal menyimpan riwayat', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLog = async (logId: string, type: 'career' | 'health') => {
    const result = await Swal.fire({
      title: 'Hapus riwayat?',
      text: "Data ini tidak dapat dikembalikan.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#006E62',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setIsSaving(true);
      try {
        if (type === 'career') {
          await accountService.deleteCareerLog(logId);
          setCareerLogs(prev => prev.filter(l => l.id !== logId));
        } else {
          await accountService.deleteHealthLog(logId);
          setHealthLogs(prev => prev.filter(l => l.id !== logId));
        }
        Swal.fire('Terhapus!', 'Riwayat telah dihapus.', 'success');
      } catch (error) {
        Swal.fire('Gagal', 'Gagal menghapus data', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    const result = await Swal.fire({
      title: 'Hapus Kontrak?',
      text: "Data kontrak akan dihapus permanen.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#006E62',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Ya, hapus!'
    });

    if (result.isConfirmed) {
      setIsSaving(true);
      try {
        await contractService.delete(contractId);
        setContracts(prev => prev.filter(c => c.id !== contractId));
        Swal.fire('Terhapus!', 'Kontrak telah dihapus.', 'success');
      } catch (error) {
        Swal.fire('Gagal', 'Gagal menghapus.', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDeleteCert = async (certId: string) => {
    const result = await Swal.fire({
      title: 'Hapus Sertifikasi?',
      text: "Data sertifikasi ini akan dihapus permanen.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#006E62',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setIsSaving(true);
      try {
        await certificationService.delete(certId);
        setCerts(prev => prev.filter(c => c.id !== certId));
        Swal.fire('Terhapus!', 'Data sertifikasi telah dihapus.', 'success');
      } catch (error) {
        Swal.fire('Gagal', 'Gagal menghapus data', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDeleteWarning = async (logId: string) => {
    const res = await Swal.fire({ 
      title: 'Hapus riwayat peringatan?', 
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonColor: '#006E62',
      confirmButtonText: 'Ya, Hapus'
    });
    if (res.isConfirmed) {
      try {
        setIsSaving(true);
        await disciplineService.deleteWarning(logId);
        setWarnings(prev => prev.filter(w => w.id !== logId));
        Swal.fire('Terhapus', '', 'success');
      } catch (e) { Swal.fire('Gagal', 'Gagal menghapus data', 'error'); }
      finally { setIsSaving(false); }
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-member-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_${account?.full_name}_${account?.internal_nik}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#006E62] border-t-transparent rounded-full animate-spin"></div></div>;
  if (!account) return null;

  const today = new Date().toISOString().split('T')[0];
  const isInactive = account.end_date && account.end_date <= today;

  // Sync data with latest career log
  const latestCareer = careerLogs[0];
  const currentPosition = latestCareer?.position || account.position;
  const currentGrade = latestCareer?.grade || account.grade;
  const currentLocation = latestCareer?.location_name || account.location?.name || '-';

  // FIX: Completed truncated DetailSection helper component
  const DetailSection = ({ icon: Icon, title, onAdd, children, isScrollable = false }: { icon: any, title: string, onAdd?: () => void, children: React.ReactNode, isScrollable?: boolean }) => (
    <div className="bg-white border border-gray-100 p-5 rounded-md shadow-sm flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-[#006E62]" />
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{title}</h4>
        </div>
        {onAdd && (
          <button onClick={onAdd} className="p-1.5 bg-[#006E62]/5 text-[#006E62] rounded hover:bg-[#006E62]/10 transition-colors">
            <Plus size={14} />
          </button>
        )}
      </div>
      <div className={`flex-1 ${isScrollable ? 'overflow-y-auto max-h-60 scrollbar-thin pr-2' : ''}`}>
        {children}
      </div>
    </div>
  );

  // FIX: Completed truncated main return block and added default export
  return (
    <div className="space-y-6">
      {isSaving && <LoadingSpinner />}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Profil */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 p-6 rounded-md shadow-sm text-center">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-full bg-gray-50 border-2 border-emerald-50 overflow-hidden mx-auto">
                {account.photo_google_id ? (
                  <img src={googleDriveService.getFileUrl(account.photo_google_id)} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <User size={48} />
                  </div>
                )}
              </div>
              {isInactive && (
                <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full border-2 border-white uppercase">Exit</div>
              )}
            </div>
            
            <h3 className="text-lg font-bold text-gray-800">{account.full_name}</h3>
            <p className="text-xs font-mono text-gray-400 mb-4">{account.internal_nik}</p>
            
            <div className="flex gap-2 justify-center">
              <button onClick={() => onEdit(account)} className="p-2 text-gray-400 hover:text-[#006E62] border border-gray-100 rounded hover:bg-gray-50 transition-all">
                <Edit2 size={16} />
              </button>
              <button onClick={() => onDelete(account.id)} className="p-2 text-gray-400 hover:text-red-500 border border-gray-100 rounded hover:bg-gray-50 transition-all">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-100 p-6 rounded-md shadow-sm text-center space-y-4">
            <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
               <QRCodeSVG id="qr-member-code" value={account.internal_nik} size={120} level="H" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">QR Presensi Karyawan</p>
              <button onClick={downloadQR} className="flex items-center gap-2 mx-auto text-[10px] font-bold text-[#006E62] hover:underline uppercase">
                <Download size={12} /> Unduh QR Code
              </button>
            </div>
          </div>
        </div>

        {/* Kolom Informasi & Riwayat */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <DetailSection icon={Briefcase} title="Karier Terakhir">
             <div className="space-y-3">
                <div>
                   <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Jabatan & Grade</p>
                   <p className="text-xs font-bold text-[#006E62]">{currentPosition} • {currentGrade || '-'}</p>
                </div>
                <div>
                   <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Lokasi Penempatan</p>
                   <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
                      <MapPin size={10} className="text-gray-300" /> {currentLocation}
                   </div>
                </div>
             </div>
          </DetailSection>

          <DetailSection icon={History} title="Log Karier" onAdd={() => setShowLogForm({ type: 'career' })} isScrollable>
             <div className="space-y-3">
                {careerLogs.map(log => (
                  <div key={log.id} className="text-[11px] border-l-2 border-gray-100 pl-3 py-1 hover:border-[#006E62] transition-colors group relative">
                    <button onClick={() => handleDeleteLog(log.id, 'career')} className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                      <Trash2 size={10} />
                    </button>
                    <p className="font-bold text-gray-800">{log.position}</p>
                    <p className="text-[9px] text-gray-400 italic mb-1">{new Date(log.change_date).toLocaleDateString('id-ID')}</p>
                    {log.file_sk_id && <a href={googleDriveService.getFileUrl(log.file_sk_id)} target="_blank" className="text-[8px] font-bold text-[#006E62] hover:underline flex items-center gap-1"><Paperclip size={8}/> LIHAT SK</a>}
                  </div>
                ))}
             </div>
          </DetailSection>

          <DetailSection icon={Activity} title="Kesehatan" onAdd={() => setShowLogForm({ type: 'health' })}>
             <div className="space-y-3">
                <div className="flex justify-between items-start">
                   <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Status MCU</p>
                      <p className="text-xs font-bold text-[#006E62] uppercase">{account.mcu_status || '-'}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Risiko</p>
                      <p className="text-xs font-bold text-orange-500 uppercase">{account.health_risk || '-'}</p>
                   </div>
                </div>
             </div>
          </DetailSection>

          <DetailSection icon={FileBadge} title="Kontrak Kerja" onAdd={() => setShowContractForm({ show: true })} isScrollable>
             <div className="space-y-3">
                {contracts.map(c => (
                  <div key={c.id} className="text-[11px] border-b border-gray-50 pb-2 last:border-0 group relative">
                    <button onClick={() => handleDeleteContract(c.id)} className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"><Trash2 size={10} /></button>
                    <p className="font-bold text-gray-800">{c.contract_number}</p>
                    <p className="text-[9px] text-gray-500">{c.contract_type} • {new Date(c.start_date).toLocaleDateString('id-ID')} s/d {c.end_date ? new Date(c.end_date).toLocaleDateString('id-ID') : 'TETAP'}</p>
                  </div>
                ))}
             </div>
          </DetailSection>

          <DetailSection icon={Award} title="Sertifikasi" onAdd={() => setShowCertForm({ show: true })} isScrollable>
             <div className="space-y-3">
                {certs.map(c => (
                  <div key={c.id} className="text-[11px] border-b border-gray-50 pb-2 last:border-0 group relative">
                    <button onClick={() => handleDeleteCert(c.id)} className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"><Trash2 size={10} /></button>
                    <p className="font-bold text-gray-800">{c.cert_name}</p>
                    <p className="text-[9px] text-gray-400 uppercase">{c.cert_type}</p>
                  </div>
                ))}
             </div>
          </DetailSection>

          <DetailSection icon={ShieldAlert} title="Kedisiplinan & Exit" onAdd={() => setShowWarningForm(true)}>
             <div className="space-y-3">
                {termination ? (
                  <div className="p-2 bg-red-50 rounded border border-red-100">
                    <p className="text-[10px] font-bold text-red-600 uppercase mb-1">DATA EXIT</p>
                    <p className="text-[11px] font-bold text-gray-800">{termination.termination_type}</p>
                    <p className="text-[10px] text-gray-500">{new Date(termination.termination_date).toLocaleDateString('id-ID')}</p>
                  </div>
                ) : (
                  <button onClick={() => setShowTerminationForm(true)} className="w-full py-2 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase rounded border border-rose-100 hover:bg-rose-100 transition-colors">Proses Exit</button>
                )}
                
                <div className="space-y-2 mt-4 pt-4 border-t border-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Riwayat SP</p>
                  {warnings.map(w => (
                    <div key={w.id} className="text-[10px] flex justify-between items-center group">
                      <span className="font-bold text-orange-600">{w.warning_type}</span>
                      <span className="text-gray-400 italic">{new Date(w.issue_date).toLocaleDateString('id-ID')}</span>
                      <button onClick={() => handleDeleteWarning(w.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"><Trash2 size={10} /></button>
                    </div>
                  ))}
                </div>
             </div>
          </DetailSection>
        </div>
      </div>

      {/* Media Preview Modal */}
      {previewMedia && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewMedia(null)}>
           <button className="absolute top-6 right-6 text-white hover:rotate-90 transition-all"><X size={32} /></button>
           <img src={previewMedia.url} className="max-w-full max-h-full object-contain shadow-2xl rounded" />
        </div>
      )}

      {/* Modal Forms */}
      {showLogForm && (
        <LogForm 
          type={showLogForm.type} 
          accountId={account.id} 
          onClose={() => setShowLogForm(null)} 
          onSubmit={handleLogSubmit} 
          initialData={showLogForm.data} 
          isEdit={showLogForm.isEdit} 
        />
      )}
      {showCertForm.show && <CertificationFormModal onClose={() => setShowCertForm({ show: false })} onSuccess={() => { setShowCertForm({ show: false }); fetchData(); }} initialData={{ account_id: id }} />}
      {showContractForm.show && <ContractFormModal onClose={() => setShowContractForm({ show: false })} onSuccess={() => { setShowContractForm({ show: false }); fetchData(); }} initialData={{ account_id: id }} />}
      {showWarningForm && <WarningForm accountId={id} onClose={() => setShowWarningForm(false)} onSuccess={() => { setShowWarningForm(false); fetchData(); }} />}
      {showTerminationForm && <TerminationForm accountId={id} onClose={() => setShowTerminationForm(false)} onSuccess={() => { setShowTerminationForm(false); fetchData(); }} />}
    </div>
  );
};

export default AccountDetail;
