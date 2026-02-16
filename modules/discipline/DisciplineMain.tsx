
import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Download, FileUp, Paperclip, UserCircle, LogOut, Info, AlertTriangle, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { disciplineService } from '../../services/disciplineService';
import { googleDriveService } from '../../services/googleDriveService';
import { WarningLogExtended, TerminationLogExtended } from '../../types';
import DisciplineImportModal from './DisciplineImportModal';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const DisciplineMain: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'warnings' | 'terminations'>('warnings');
  const [warnings, setWarnings] = useState<WarningLogExtended[]>([]);
  const [terminations, setTerminations] = useState<TerminationLogExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [w, t] = await Promise.all([
        disciplineService.getWarningsGlobal(),
        disciplineService.getTerminationsGlobal()
      ]);
      setWarnings(w);
      setTerminations(t);
    } catch (error) {
      Swal.fire('Gagal', 'Gagal memuat data kedisiplinan', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWarning = async (id: string) => {
    const res = await Swal.fire({
      title: 'Hapus data?',
      text: "Riwayat peringatan ini akan dihapus permanen.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#006E62',
      confirmButtonText: 'Ya, Hapus'
    });
    if (res.isConfirmed) {
      try {
        await disciplineService.deleteWarning(id);
        setWarnings(prev => prev.filter(w => w.id !== id));
        Swal.fire('Berhasil', 'Data telah dihapus', 'success');
      } catch (e) { Swal.fire('Gagal', 'Gagal menghapus data', 'error'); }
    }
  };

  const filteredWarnings = warnings.filter(w => 
    `${w.account?.full_name} ${w.account?.internal_nik} ${w.warning_type}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTerminations = terminations.filter(t => 
    `${t.account?.full_name} ${t.account?.internal_nik} ${t.termination_type}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount?: number | null) => {
    if (!amount) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-gray-100 p-1 rounded-md shrink-0">
          <button 
            onClick={() => setActiveTab('warnings')}
            className={`px-4 py-2 text-xs font-bold uppercase rounded-md transition-all ${activeTab === 'warnings' ? 'bg-white text-[#006E62] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Peringatan (SP)
          </button>
          <button 
            onClick={() => setActiveTab('terminations')}
            className={`px-4 py-2 text-xs font-bold uppercase rounded-md transition-all ${activeTab === 'terminations' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Pemberhentian
          </button>
        </div>

        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Cari data..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-[#006E62]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => disciplineService.downloadTemplate()} className="p-2 border border-gray-200 rounded-md text-gray-400 hover:bg-gray-50"><Download size={18} /></button>
          <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 bg-[#006E62] text-white px-4 py-2 rounded-md hover:bg-[#005a50] text-sm font-bold uppercase tracking-tighter shadow-sm"><FileUp size={18} /> Impor Massal</button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-md overflow-hidden shadow-sm">
        {activeTab === 'warnings' ? (
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Karyawan</th>
                <th className="px-6 py-4">Tipe Surat</th>
                <th className="px-6 py-4">Alasan</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Dokumen</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-20 text-gray-400">Memuat data...</td></tr>
              ) : filteredWarnings.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-20 text-gray-400 uppercase text-[10px] font-bold tracking-widest">Belum ada riwayat peringatan</td></tr>
              ) : (
                filteredWarnings.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserCircle size={24} className="text-gray-300" />
                        <div>
                          <p className="text-xs font-bold text-gray-800">{w.account?.full_name}</p>
                          <p className="text-[10px] font-mono text-gray-400 uppercase">{w.account?.internal_nik}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${w.warning_type === 'Teguran' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'}`}>
                        {w.warning_type}
                      </span>
                    </td>
                    <td className="px-6 py-4"><p className="text-xs text-gray-500 line-clamp-1">{w.reason}</p></td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{formatDate(w.issue_date)}</td>
                    <td className="px-6 py-4">
                      {w.file_id ? (
                        <a href={googleDriveService.getFileUrl(w.file_id).replace('=s1600', '=s0')} target="_blank" rel="noreferrer" className="text-[#006E62] hover:underline flex items-center gap-1 text-[10px] font-bold uppercase"><Paperclip size={12} /> Surat</a>
                      ) : <span className="text-[10px] text-gray-300">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDeleteWarning(w.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Karyawan</th>
                <th className="px-6 py-4">Jenis Keluar</th>
                <th className="px-6 py-4">Alasan</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Keuangan</th>
                <th className="px-6 py-4">Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-20 text-gray-400">Memuat data...</td></tr>
              ) : filteredTerminations.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-20 text-gray-400 uppercase text-[10px] font-bold tracking-widest">Belum ada riwayat pemberhentian</td></tr>
              ) : (
                filteredTerminations.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <LogOut size={24} className="text-red-200" />
                        <div>
                          <p className="text-xs font-bold text-gray-800">{t.account?.full_name}</p>
                          <p className="text-[10px] font-mono text-gray-400 uppercase">{t.account?.internal_nik}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.termination_type === 'Pemecatan' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                        {t.termination_type}
                      </span>
                    </td>
                    <td className="px-6 py-4"><p className="text-xs text-gray-500 line-clamp-1">{t.reason}</p></td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{formatDate(t.termination_date)}</td>
                    <td className="px-6 py-4">
                      {t.termination_type === 'Pemecatan' ? (
                        <div className="text-[10px]">
                          <p className="text-gray-400 uppercase font-bold">Pesangon:</p>
                          <p className="text-emerald-600 font-bold">{formatCurrency(t.severance_amount)}</p>
                        </div>
                      ) : (
                        <div className="text-[10px]">
                          <p className="text-gray-400 uppercase font-bold">Penalti:</p>
                          <p className="text-red-500 font-bold">{formatCurrency(t.penalty_amount)}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {t.file_id ? (
                        <a href={googleDriveService.getFileUrl(t.file_id).replace('=s1600', '=s0')} target="_blank" rel="noreferrer" className="text-[#006E62] hover:underline flex items-center gap-1 text-[10px] font-bold uppercase"><Paperclip size={12} /> Surat</a>
                      ) : <span className="text-[10px] text-gray-300">-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showImportModal && (
        <DisciplineImportModal onClose={() => setShowImportModal(false)} onSuccess={() => { setShowImportModal(false); fetchData(); }} />
      )}
    </div>
  );
};

export default DisciplineMain;
