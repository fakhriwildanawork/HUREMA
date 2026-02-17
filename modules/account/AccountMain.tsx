
import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Users, Grid, List as ListIcon, 
  ArrowLeft, UserCircle, UserCheck, UserX,
  History, FileBadge, Award, Activity, ShieldAlert 
} from 'lucide-react';
import Swal from 'sweetalert2';
import { accountService } from '../../services/accountService';
import { Account, AccountInput } from '../../types';
import AccountForm from './AccountForm';
import AccountDetail from './AccountDetail';
import { CardSkeleton } from '../../components/Common/Skeleton';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { googleDriveService } from '../../services/googleDriveService';

// Import sub-modules
import CareerLogMain from '../career/CareerLogMain';
import HealthLogMain from '../health/HealthLogMain';
import ContractMain from '../contract/ContractMain';
import CertificationMain from '../certification/CertificationMain';
import DisciplineMain from '../discipline/DisciplineMain';

const AccountMain: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'aktif' | 'non-aktif'>('aktif');
  const [showForm, setShowForm] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
  // Tab State Internal Modul Akun
  const [activeSubTab, setActiveSubTab] = useState<'data' | 'career' | 'contract' | 'cert' | 'health' | 'discipline'>('data');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const data = await accountService.getAll();
      setAccounts(data as any);
    } catch (error) {
      Swal.fire('Gagal', 'Gagal memuat data akun', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (input: AccountInput) => {
    setIsSaving(true);
    const tempId = `temp-${Math.random().toString(36).substring(7)}`;
    const optimisticAccount: Account = { 
      ...input, 
      id: tempId, 
      created_at: new Date().toISOString()
    };
    
    setAccounts(prev => [optimisticAccount, ...prev]);
    setShowForm(false);

    try {
      const created = await accountService.create(input);
      setAccounts(prev => prev.map(acc => acc.id === tempId ? created : acc));
      Swal.fire({
        title: 'Berhasil!',
        text: 'Akun baru telah ditambahkan.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      setAccounts(prev => prev.filter(acc => acc.id !== tempId));
      Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (id: string, input: Partial<AccountInput>) => {
    setIsSaving(true);
    try {
      const updated = await accountService.update(id, input);
      setAccounts(prev => prev.map(acc => acc.id === id ? updated : acc));
      setEditingAccount(null);
      setShowForm(false);
      Swal.fire({
        title: 'Terupdate!',
        text: 'Data akun berhasil diperbarui.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire('Gagal', 'Gagal memperbarui data', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Apakah Anda yakin?',
      text: "Akun ini akan dihapus permanen.",
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
        await accountService.delete(id);
        setAccounts(prev => prev.filter(acc => acc.id !== id));
        setSelectedAccountId(null);
        Swal.fire('Terhapus!', 'Akun telah dihapus.', 'success');
      } catch (error) {
        Swal.fire('Gagal', 'Gagal menghapus data', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const today = new Date().toISOString().split('T')[0];
  
  const activeAccounts = accounts.filter(acc => !acc.end_date || acc.end_date > today);
  const inactiveAccounts = accounts.filter(acc => acc.end_date && acc.end_date <= today);

  const filteredAccounts = (statusFilter === 'aktif' ? activeAccounts : inactiveAccounts).filter(acc => {
    const searchStr = (acc.search_all || `${acc.full_name} ${acc.internal_nik} ${acc.position}`).toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  // Halaman Detail
  if (selectedAccountId) {
    return (
      <div className="animate-in fade-in slide-in-from-right duration-300">
        <button 
          onClick={() => setSelectedAccountId(null)}
          className="mb-4 flex items-center gap-2 text-gray-500 hover:text-[#006E62] transition-colors font-bold text-xs uppercase"
        >
          <ArrowLeft size={16} /> Kembali ke Daftar
        </button>
        <AccountDetail
          id={selectedAccountId}
          onClose={() => setSelectedAccountId(null)}
          onEdit={(acc) => { setSelectedAccountId(null); setEditingAccount(acc); setShowForm(true); }}
          onDelete={(id) => handleDelete(id)}
        />
      </div>
    );
  }

  const SubTab = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
    <button
      onClick={() => setActiveSubTab(id)}
      className={`flex items-center gap-2 px-5 py-3 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${
        activeSubTab === id ? 'border-[#006E62] text-[#006E62] bg-emerald-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {isSaving && <LoadingSpinner />}

      {/* Internal Sub-Tabs Navigation */}
      <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-none bg-white -mt-4 mb-6">
        <SubTab id="data" label="Data Akun" icon={Users} />
        <SubTab id="career" label="Log Karir" icon={History} />
        <SubTab id="contract" label="Kontrak Kerja" icon={FileBadge} />
        <SubTab id="cert" label="Sertifikasi" icon={Award} />
        <SubTab id="health" label="Log Kesehatan" icon={Activity} />
        <SubTab id="discipline" label="Peringatan & Keluar" icon={ShieldAlert} />
      </div>

      {activeSubTab === 'data' ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Cari (Nama, NIK, Jabatan)..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006E62] focus:border-transparent transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex border border-gray-200 rounded-md overflow-hidden bg-white">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-[#006E62]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Grid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-[#006E62]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <ListIcon size={18} />
                </button>
              </div>
              <button 
                onClick={() => { setEditingAccount(null); setShowForm(true); }}
                className="flex items-center gap-2 bg-[#006E62] text-white px-4 py-2 rounded-md hover:bg-[#005a50] transition-colors shadow-sm"
              >
                <Plus size={18} />
                <span className="font-medium text-sm">Tambah Akun</span>
              </button>
            </div>
          </div>

          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setStatusFilter('aktif')}
              className={`px-6 py-3 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                statusFilter === 'aktif' ? 'border-[#006E62] text-[#006E62]' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <UserCheck size={14} />
              Karyawan Aktif <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${statusFilter === 'aktif' ? 'bg-[#006E62] text-white' : 'bg-gray-100 text-gray-400'}`}>{activeAccounts.length}</span>
            </button>
            <button
              onClick={() => setStatusFilter('non-aktif')}
              className={`px-6 py-3 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                statusFilter === 'non-aktif' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <UserX size={14} />
              Karyawan Non-Aktif <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${statusFilter === 'non-aktif' ? 'bg-red-50 text-white' : 'bg-gray-100 text-gray-400'}`}>{inactiveAccounts.length}</span>
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Users size={48} strokeWidth={1} className="mb-4" />
              <p className="text-lg">Data akun {statusFilter === 'aktif' ? 'aktif' : 'non-aktif'} tidak ditemukan.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAccounts.map(account => {
                const isInactive = account.end_date && account.end_date <= today;
                return (
                  <div 
                    key={account.id} 
                    onClick={() => setSelectedAccountId(account.id)}
                    className={`group bg-white border border-gray-100 p-4 rounded-md shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 border-l-transparent ${isInactive ? 'hover:border-l-red-500' : 'hover:border-l-[#006E62]'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                        {account.photo_google_id ? (
                          <img src={googleDriveService.getFileUrl(account.photo_google_id)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <UserCircle size={24} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-[#006E62] group-hover:text-[#005a50] line-clamp-1 text-sm">{account.full_name}</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{account.position} • {account.internal_nik}</p>
                      </div>
                      {isInactive && <span className="text-[8px] font-bold px-1 py-0.5 bg-red-50 text-red-600 rounded uppercase">Exit</span>}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                       <span className="text-[10px] text-gray-500 font-medium">{(account as any).location?.name || 'Tanpa Lokasi'}</span>
                       <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                         isInactive ? 'bg-gray-100 text-gray-400' : (account.employee_type === 'Tetap' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600')
                       }`}>
                         {account.employee_type}
                       </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-md overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-3">Nama & Posisi</th>
                    <th className="px-6 py-3">NIK Internal</th>
                    <th className="px-6 py-3">Lokasi Penempatan</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAccounts.map(account => {
                    const isInactive = account.end_date && account.end_date <= today;
                    return (
                      <tr 
                        key={account.id} 
                        onClick={() => setSelectedAccountId(account.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                              {account.photo_google_id && <img src={googleDriveService.getFileUrl(account.photo_google_id)} className="w-full h-full object-cover" />}
                            </div>
                            <div>
                              <div className="font-bold text-[#006E62] text-xs">{account.full_name}</div>
                              <div className="text-[9px] text-gray-400 uppercase font-bold">{account.position}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-gray-500">{account.internal_nik}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">{(account as any).location?.name || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 border border-gray-100 rounded uppercase ${isInactive ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}`}>
                            {isInactive ? 'NON-AKTIF' : account.employee_type}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeSubTab === 'career' ? (
        <div className="animate-in fade-in duration-300">
          <CareerLogMain />
        </div>
      ) : activeSubTab === 'contract' ? (
        <div className="animate-in fade-in duration-300">
          <ContractMain />
        </div>
      ) : activeSubTab === 'cert' ? (
        <div className="animate-in fade-in duration-300">
          <CertificationMain />
        </div>
      ) : activeSubTab === 'health' ? (
        <div className="animate-in fade-in duration-300">
          <HealthLogMain />
        </div>
      ) : activeSubTab === 'discipline' ? (
        <div className="animate-in fade-in duration-300">
          <DisciplineMain />
        </div>
      ) : null}

      {showForm && (
        <AccountForm 
          onClose={() => { setShowForm(false); setEditingAccount(null); }}
          onSubmit={editingAccount ? (data) => handleUpdate(editingAccount.id, data) : handleCreate}
          initialData={editingAccount || undefined}
        />
      )}
    </div>
  );
};

export default AccountMain;
