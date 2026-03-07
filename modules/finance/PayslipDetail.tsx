import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Eye, Download, Trash2, Send, CheckCircle, AlertCircle, Printer, X, DollarSign, User, MapPin, Calendar, FileText } from 'lucide-react';
import { financeService } from '../../services/financeService';
import { Payroll, PayrollItem, PayrollSettings } from '../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';

interface PayslipDetailProps {
  payroll: Payroll;
  onBack: () => void;
}

const PayslipDetail: React.FC<PayslipDetailProps> = ({ payroll, onBack }) => {
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewingItem, setViewingItem] = useState<PayrollItem | null>(null);
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const payslipRef = useRef<HTMLDivElement>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const [iData, sData] = await Promise.all([
        financeService.getPayrollItems(payroll.id),
        financeService.getPayrollSettings()
      ]);
      setItems(iData);
      setSettings(sData);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [payroll.id]);

  const handleStatusUpdate = async (status: Payroll['status']) => {
    try {
      await financeService.updatePayrollStatus(payroll.id, status);
      Swal.fire('Berhasil!', `Status payroll berhasil diubah menjadi ${status}.`, 'success');
      onBack();
    } catch (error) {
      Swal.fire('Gagal!', 'Terjadi kesalahan saat memperbarui status.', 'error');
    }
  };

  const handleDeleteItems = async (ids: string[]) => {
    const result = await Swal.fire({
      title: 'Hapus Payslip?',
      text: `${ids.length} data payslip akan dihapus permanen.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus'
    });

    if (result.isConfirmed) {
      try {
        await financeService.deletePayrollItems(ids);
        Swal.fire('Berhasil!', 'Data payslip berhasil dihapus.', 'success');
        fetchItems();
        setSelectedItems([]);
      } catch (error) {
        Swal.fire('Gagal!', 'Terjadi kesalahan saat menghapus data.', 'error');
      }
    }
  };

  const downloadPDF = async (item: PayrollItem) => {
    if (!payslipRef.current) return;
    
    try {
      Swal.fire({
        title: 'Generating PDF...',
        text: 'Mohon tunggu sebentar',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const canvas = await html2canvas(payslipRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Payslip_${item.account?.full_name}_${new Date(0, payroll.month - 1).toLocaleString('id-ID', { month: 'long' })}${payroll.year}.pdf`);
      
      Swal.close();
    } catch (error) {
      console.error('PDF Error:', error);
      Swal.fire('Gagal!', 'Terjadi kesalahan saat membuat PDF.', 'error');
    }
  };

  const filteredItems = items.filter(i => 
    i.account?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.account?.internal_nik.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Payslip {new Date(0, payroll.month - 1).toLocaleString('id-ID', { month: 'long' })} {payroll.year}
            </h2>
            <p className="text-sm text-gray-500">Daftar slip gaji karyawan untuk periode ini.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {payroll.status === 'Draft' && (
            <button
              onClick={() => handleStatusUpdate('Pending')}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all text-sm font-bold uppercase tracking-wider shadow-md"
            >
              <Send size={18} />
              Ajukan Verifikasi
            </button>
          )}
          {payroll.status === 'Pending' && (
            <button
              onClick={() => handleStatusUpdate('Approved')}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-bold uppercase tracking-wider shadow-md"
            >
              <CheckCircle size={18} />
              Setujui Payroll
            </button>
          )}
          {payroll.status === 'Approved' && (
            <button
              onClick={() => handleStatusUpdate('Paid')}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-bold uppercase tracking-wider shadow-md"
            >
              <Send size={18} />
              Sent Payslip (Terbitkan)
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari karyawan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#006E62] transition-all"
            />
          </div>
          {selectedItems.length > 0 && (
            <button
              onClick={() => handleDeleteItems(selectedItems)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all text-xs font-bold uppercase tracking-wider"
            >
              <Trash2 size={16} />
              Hapus Terpilih ({selectedItems.length})
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedItems(filteredItems.map(i => i.id));
                      else setSelectedItems([]);
                    }}
                    className="rounded border-gray-300 text-[#006E62] focus:ring-[#006E62]"
                  />
                </th>
                <th className="px-6 py-4">Karyawan</th>
                <th className="px-6 py-4">Jabatan / Lokasi</th>
                <th className="px-6 py-4">Total Pendapatan</th>
                <th className="px-6 py-4">Total Potongan</th>
                <th className="px-6 py-4">Take Home Pay</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-[#006E62] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memuat Data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <DollarSign size={48} strokeWidth={1} />
                      <p className="text-sm font-medium">Belum ada data payslip.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedItems.includes(item.id)}
                        onChange={() => {
                          setSelectedItems(prev => 
                            prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]
                          );
                        }}
                        className="rounded border-gray-300 text-[#006E62] focus:ring-[#006E62]"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800">{item.account?.full_name}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">{item.account?.internal_nik}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600">{item.account?.position}</div>
                      <div className="text-[10px] text-gray-400">{item.account?.location?.name || (item.account as any)?.location || '-'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-emerald-600 font-bold">
                      Rp {item.total_income.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-rose-600 font-bold">
                      Rp {item.total_deduction.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-[#006E62] font-bold">
                      Rp {item.take_home_pay.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setViewingItem(item)}
                          className="p-2 text-gray-400 hover:text-[#006E62] hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Lihat Slip Gaji"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => downloadPDF(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteItems([item.id])}
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

      {/* Payslip Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <FileText className="text-[#006E62]" size={20} />
                <h3 className="font-bold text-gray-800 uppercase tracking-widest text-xs">Preview Slip Gaji</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadPDF(viewingItem)}
                  className="flex items-center gap-2 px-4 py-1.5 bg-[#006E62] text-white rounded-lg hover:bg-[#005a50] transition-all text-[10px] font-bold uppercase tracking-wider"
                >
                  <Download size={14} />
                  Download PDF
                </button>
                <button
                  onClick={() => setViewingItem(null)}
                  className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-gray-100 custom-scrollbar">
              <div 
                ref={payslipRef}
                className="bg-white w-full max-w-[210mm] mx-auto p-12 shadow-lg min-h-[297mm] flex flex-col"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {/* Header / Kop */}
                <div className="flex justify-between items-start border-b-4 border-[#006E62] pb-6 mb-8">
                  <div className="flex items-center gap-6">
                    {settings?.company_logo_url && (
                      <img 
                        src={settings.company_logo_url} 
                        alt="Logo" 
                        className="w-24 h-24 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="space-y-1">
                      <h1 className="text-3xl font-black text-[#006E62] tracking-tighter uppercase">{settings?.company_name || 'HUREMA HRIS'}</h1>
                      <div className="text-xs text-gray-500 max-w-md leading-relaxed">
                        {settings?.company_address && <div className="flex items-center gap-2"><MapPin size={10} /> {settings.company_address}</div>}
                        <div className="flex items-center gap-4 mt-1">
                          {settings?.company_phone && <span>Telp: {settings.company_phone}</span>}
                          {settings?.company_email && <span>Email: {settings.company_email}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-black text-gray-300 uppercase tracking-widest">Slip Gaji</h2>
                    <div className="text-sm font-bold text-gray-800 mt-2">
                      {new Date(0, payroll.month - 1).toLocaleString('id-ID', { month: 'long' })} {payroll.year}
                    </div>
                  </div>
                </div>

                {/* Employee Info */}
                <div className="grid grid-cols-2 gap-12 mb-12 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Pegawai</div>
                      <div className="text-lg font-black text-gray-800">{viewingItem.account?.full_name}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nomor Induk Karyawan (NIK)</div>
                      <div className="text-sm font-bold text-gray-700">{viewingItem.account?.internal_nik}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Golongan / Jabatan</div>
                      <div className="text-sm font-bold text-gray-800">{viewingItem.account?.grade || '-'} / {viewingItem.account?.position}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lokasi Penugasan</div>
                      <div className="text-sm font-bold text-gray-700">{viewingItem.account?.location?.name || (viewingItem.account as any)?.location || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Salary Components */}
                <div className="grid grid-cols-2 gap-12 flex-1">
                  {/* Earnings */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b-2 border-emerald-100 pb-2">
                      <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><DollarSign size={14} /></div>
                      <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest">Pendapatan (Earnings)</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-start group">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-gray-700">Gaji Pokok ({viewingItem.salary_type})</div>
                          {viewingItem.basic_salary_notes && <div className="text-[9px] text-gray-400 italic">{viewingItem.basic_salary_notes}</div>}
                        </div>
                        <div className="text-xs font-bold text-gray-800">Rp {viewingItem.basic_salary.toLocaleString('id-ID')}</div>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-gray-700">Tunjangan Jabatan</div>
                          {viewingItem.position_allowance_notes && <div className="text-[9px] text-gray-400 italic">{viewingItem.position_allowance_notes}</div>}
                        </div>
                        <div className="text-xs font-bold text-gray-800">Rp {viewingItem.position_allowance.toLocaleString('id-ID')}</div>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-gray-700">Tunjangan Penempatan</div>
                          {viewingItem.placement_allowance_notes && <div className="text-[9px] text-gray-400 italic">{viewingItem.placement_allowance_notes}</div>}
                        </div>
                        <div className="text-xs font-bold text-gray-800">Rp {viewingItem.placement_allowance.toLocaleString('id-ID')}</div>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-gray-700">Tunjangan Lainnya</div>
                          {viewingItem.other_allowance_notes && <div className="text-[9px] text-gray-400 italic">{viewingItem.other_allowance_notes}</div>}
                        </div>
                        <div className="text-xs font-bold text-gray-800">Rp {viewingItem.other_allowance.toLocaleString('id-ID')}</div>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-gray-700">Tambahan Gaji Lain</div>
                          {viewingItem.other_additions_notes && <div className="text-[9px] text-gray-400 italic">{viewingItem.other_additions_notes}</div>}
                        </div>
                        <div className="text-xs font-bold text-gray-800">Rp {viewingItem.other_additions.toLocaleString('id-ID')}</div>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b-2 border-rose-100 pb-2">
                      <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg"><Trash2 size={14} /></div>
                      <h3 className="text-xs font-black text-rose-700 uppercase tracking-widest">Potongan (Deductions)</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-gray-700">Potongan Keterlambatan</div>
                          {viewingItem.late_deduction_notes && <div className="text-[9px] text-gray-400 italic">{viewingItem.late_deduction_notes}</div>}
                        </div>
                        <div className="text-xs font-bold text-rose-600">Rp {viewingItem.late_deduction.toLocaleString('id-ID')}</div>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-gray-700">Potongan Pulang Cepat</div>
                          {viewingItem.early_leave_deduction_notes && <div className="text-[9px] text-gray-400 italic">{viewingItem.early_leave_deduction_notes}</div>}
                        </div>
                        <div className="text-xs font-bold text-rose-600">Rp {viewingItem.early_leave_deduction.toLocaleString('id-ID')}</div>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-gray-700">Potongan Absensi</div>
                          {viewingItem.absent_deduction_notes && <div className="text-[9px] text-gray-400 italic">{viewingItem.absent_deduction_notes}</div>}
                        </div>
                        <div className="text-xs font-bold text-rose-600">Rp {viewingItem.absent_deduction.toLocaleString('id-ID')}</div>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-gray-700">Potongan Lainnya</div>
                          {viewingItem.other_deductions_notes && <div className="text-[9px] text-gray-400 italic">{viewingItem.other_deductions_notes}</div>}
                        </div>
                        <div className="text-xs font-bold text-rose-600">Rp {viewingItem.other_deductions.toLocaleString('id-ID')}</div>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="text-xs font-bold text-gray-700">BPJS Kesehatan</div>
                        <div className="text-xs font-bold text-rose-600">Rp {viewingItem.bpjs_kesehatan.toLocaleString('id-ID')}</div>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="text-xs font-bold text-gray-700">BPJS Ketenagakerjaan</div>
                        <div className="text-xs font-bold text-rose-600">Rp {viewingItem.bpjs_ketenagakerjaan.toLocaleString('id-ID')}</div>
                      </div>
                      <div className="flex justify-between items-start">
                        <div className="text-xs font-bold text-gray-700">PPh 21</div>
                        <div className="text-xs font-bold text-rose-600">Rp {viewingItem.pph21.toLocaleString('id-ID')}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-12 pt-8 border-t-2 border-gray-100">
                  <div className="grid grid-cols-2 gap-12">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-4 py-2 bg-emerald-50 rounded-lg">
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Total Pendapatan</span>
                        <span className="text-sm font-black text-emerald-700">Rp {viewingItem.total_income.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-2 bg-rose-50 rounded-lg">
                        <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Total Potongan</span>
                        <span className="text-sm font-black text-rose-700">Rp {viewingItem.total_deduction.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-center bg-[#006E62] text-white p-6 rounded-2xl shadow-xl">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">Take Home Pay</div>
                      <div className="text-3xl font-black tracking-tighter">Rp {viewingItem.take_home_pay.toLocaleString('id-ID')}</div>
                    </div>
                  </div>
                </div>

                {/* Footer / Signatures */}
                <div className="mt-auto pt-16 grid grid-cols-3 gap-12 text-center">
                  <div className="space-y-20">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Diterima Oleh,</div>
                    <div className="border-t border-gray-200 pt-2 text-xs font-bold text-gray-800">{viewingItem.account?.full_name}</div>
                  </div>
                  <div></div>
                  <div className="space-y-20">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Disetujui Oleh,</div>
                    <div className="border-t border-gray-200 pt-2 text-xs font-bold text-gray-800">{payroll.verifier?.full_name || 'HR Manager'}</div>
                  </div>
                </div>

                <div className="mt-12 text-[8px] text-gray-300 text-center uppercase tracking-[0.3em]">
                  Dokumen ini dihasilkan secara otomatis oleh sistem HUREMA HRIS • {new Date().toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayslipDetail;
