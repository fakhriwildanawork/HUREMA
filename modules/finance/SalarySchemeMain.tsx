import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Users, Receipt, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { financeService } from '../../services/financeService';
import { SalaryScheme } from '../../types';
import SalarySchemeForm from './SalarySchemeForm';
import SalarySchemeAssignment from './SalarySchemeAssignment';
import Swal from 'sweetalert2';

const SalarySchemeMain: React.FC = () => {
  const [schemes, setSchemes] = useState<SalaryScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'list' | 'form' | 'assignment'>('list');
  const [selectedScheme, setSelectedScheme] = useState<SalaryScheme | null>(null);

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const data = await financeService.getSchemes();
      setSchemes(data);
    } catch (error) {
      console.error('Error fetching schemes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, []);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Skema?',
      text: "Data skema dan penugasan terkait akan dihapus permanen.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await financeService.deleteScheme(id);
        Swal.fire('Terhapus!', 'Skema gaji berhasil dihapus.', 'success');
        fetchSchemes();
      } catch (error) {
        Swal.fire('Gagal!', 'Terjadi kesalahan saat menghapus data.', 'error');
      }
    }
  };

  const filteredSchemes = schemes.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (activeView === 'form') {
    return (
      <SalarySchemeForm 
        scheme={selectedScheme} 
        onBack={() => {
          setActiveView('list');
          setSelectedScheme(null);
          fetchSchemes();
        }} 
      />
    );
  }

  if (activeView === 'assignment') {
    return (
      <SalarySchemeAssignment 
        onBack={() => setActiveView('list')} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Master Skema Gaji</h2>
          <p className="text-sm text-gray-500">Kelola template skema gaji dan penugasan karyawan.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('assignment')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium shadow-sm"
          >
            <Users size={18} />
            Penugasan Karyawan
          </button>
          <button
            onClick={() => {
              setSelectedScheme(null);
              setActiveView('form');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#006E62] text-white rounded-lg hover:bg-[#005a50] transition-all text-sm font-medium shadow-md"
          >
            <Plus size={18} />
            Tambah Skema
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama skema..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#006E62] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Nama Skema</th>
                <th className="px-6 py-4">Tipe</th>
                <th className="px-6 py-4">Gaji Pokok</th>
                <th className="px-6 py-4">Tunjangan (J/P/L)</th>
                <th className="px-6 py-4">Potongan (T/P/A)</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-[#006E62] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memuat Data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSchemes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Receipt size={48} strokeWidth={1} />
                      <p className="text-sm font-medium">Belum ada skema gaji.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSchemes.map((scheme) => (
                  <tr key={scheme.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{scheme.name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">{scheme.description || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        scheme.type === 'Bulanan' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {scheme.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-700">
                      Rp {scheme.basic_salary.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Jab:</span>
                          <span className="font-medium">Rp {scheme.position_allowance.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Pen:</span>
                          <span className="font-medium">Rp {scheme.placement_allowance.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Lain:</span>
                          <span className="font-medium">Rp {scheme.other_allowance.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Telat/Jam:</span>
                          <span className="font-medium text-red-600">Rp {scheme.late_deduction_per_hour.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-400">Absen/Hari:</span>
                          <span className="font-medium text-red-600">Rp {scheme.absent_deduction_per_day.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedScheme(scheme);
                            setActiveView('form');
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(scheme.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalarySchemeMain;
