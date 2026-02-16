
import React, { useState } from 'react';
import { X, Save, Upload, LogOut, Loader2, Info } from 'lucide-react';
import Swal from 'sweetalert2';
import { disciplineService } from '../../services/disciplineService';
import { googleDriveService } from '../../services/googleDriveService';

interface TerminationFormProps {
  accountId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const TerminationForm: React.FC<TerminationFormProps> = ({ accountId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    termination_type: 'Resign' as 'Pemecatan' | 'Resign',
    termination_date: new Date().toISOString().split('T')[0],
    reason: '',
    file_id: '',
    severance_amount: 0,
    penalty_amount: 0
  });
  const [hasFinancial, setHasFinancial] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const id = await googleDriveService.uploadFile(file);
      setFormData(prev => ({ ...prev, file_id: id }));
    } catch (e) { Swal.fire('Gagal', 'Gagal mengunggah surat', 'error'); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const confirm = await Swal.fire({
      title: 'Konfirmasi Keluar',
      text: `Apakah Anda yakin memproses pemberhentian ini? Karyawan akan dinonaktifkan dari sistem per tanggal ${formData.termination_date}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#006E62',
      confirmButtonText: 'Ya, Proses Exit'
    });

    if (confirm.isConfirmed) {
      try {
        setSaving(true);
        await disciplineService.createTermination({
          account_id: accountId,
          termination_type: formData.termination_type,
          termination_date: formData.termination_date,
          reason: formData.reason,
          file_id: formData.file_id,
          severance_amount: (formData.termination_type === 'Pemecatan' && hasFinancial) ? formData.severance_amount : null,
          penalty_amount: (formData.termination_type === 'Resign' && hasFinancial) ? formData.penalty_amount : null
        });
        Swal.fire('Berhasil', 'Pemberhentian telah diproses.', 'success');
        onSuccess();
      } catch (e) { Swal.fire('Gagal', 'Gagal menyimpan data', 'error'); }
      finally { setSaving(false); }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-red-600 uppercase tracking-widest flex items-center gap-2"><LogOut size={16} /> Proses Pemberhentian</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Jenis Pemberhentian</label>
            <select 
              value={formData.termination_type} 
              onChange={(e) => setFormData(prev => ({ ...prev, termination_type: e.target.value as any }))}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="Resign">Resign (Mengundurkan Diri)</option>
              <option value="Pemecatan">Pemecatan / PHK</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tanggal Efektif Berhenti</label>
            <input 
              type="date" 
              required
              value={formData.termination_date}
              onChange={(e) => setFormData(prev => ({ ...prev, termination_date: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Alasan Keluar</label>
            <textarea 
              required
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-red-500 resize-none"
              placeholder="Jelaskan alasan detail pemberhentian..."
            />
          </div>

          <div className="p-3 bg-gray-50 rounded border border-gray-100 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ada {formData.termination_type === 'Pemecatan' ? 'Pesangon' : 'Penalti'}?</span>
              <input type="checkbox" checked={hasFinancial} onChange={(e) => setHasFinancial(e.target.checked)} className="rounded text-red-600 focus:ring-red-500" />
            </label>
            {hasFinancial && (
              <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Nominal Rupiah</p>
                <input 
                  type="number" 
                  value={formData.termination_type === 'Pemecatan' ? formData.severance_amount : formData.penalty_amount}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    [formData.termination_type === 'Pemecatan' ? 'severance_amount' : 'penalty_amount']: parseInt(e.target.value) || 0 
                  }))}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none"
                  placeholder="0"
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Upload Berkas Pendukung (Exit Clearance/SK)</label>
            <label className={`flex items-center justify-center p-4 bg-gray-50 border border-dashed rounded cursor-pointer transition-colors ${formData.file_id ? 'border-red-500' : 'border-gray-200 hover:border-red-500'}`}>
              {uploading ? <Loader2 className="animate-spin text-red-600" size={18} /> : (
                <div className="text-center">
                  <Upload size={18} className="mx-auto text-gray-300 mb-1" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{formData.file_id ? 'BERKAS OK' : 'Klik Unggah File'}</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="text-xs font-bold text-gray-400 uppercase">Batal</button>
            <button disabled={saving || uploading} className="bg-red-600 text-white px-6 py-2 rounded text-xs font-bold uppercase shadow-md">{saving ? 'Sedang Keluar...' : 'Proses Exit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TerminationForm;
