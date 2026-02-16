
import React, { useState } from 'react';
import { X, Save, Upload, ShieldAlert, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { disciplineService } from '../../services/disciplineService';
import { googleDriveService } from '../../services/googleDriveService';

interface WarningFormProps {
  accountId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const WarningForm: React.FC<WarningFormProps> = ({ accountId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    warning_type: 'Teguran' as any,
    issue_date: new Date().toISOString().split('T')[0],
    reason: '',
    file_id: ''
  });
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
    try {
      setSaving(true);
      await disciplineService.createWarning({ ...formData, account_id: accountId });
      Swal.fire({ title: 'Berhasil', text: 'Peringatan telah dicatat', icon: 'success', timer: 1500, showConfirmButton: false });
      onSuccess();
    } catch (e) { Swal.fire('Gagal', 'Gagal menyimpan data', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#006E62] uppercase tracking-widest flex items-center gap-2"><ShieldAlert size={16} /> Catat Peringatan</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Jenis Peringatan</label>
            <select 
              value={formData.warning_type} 
              onChange={(e) => setFormData(prev => ({ ...prev, warning_type: e.target.value as any }))}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-[#006E62]"
            >
              <option value="Teguran">Teguran</option>
              <option value="SP1">SP1 (Peringatan Pertama)</option>
              <option value="SP2">SP2 (Peringatan Kedua)</option>
              <option value="SP3">SP3 (Peringatan Ketiga)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tanggal Penerbitan</label>
            <input 
              type="date" 
              required
              value={formData.issue_date}
              onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-[#006E62]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Alasan / Pelanggaran</label>
            <textarea 
              required
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-[#006E62] resize-none"
              placeholder="Jelaskan alasan pemberian SP..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Upload Scan Surat</label>
            <label className={`flex items-center justify-center p-4 bg-gray-50 border border-dashed rounded cursor-pointer transition-colors ${formData.file_id ? 'border-[#006E62]' : 'border-gray-200 hover:border-[#006E62]'}`}>
              {uploading ? <Loader2 className="animate-spin text-[#006E62]" size={18} /> : (
                <div className="text-center">
                  <Upload size={18} className="mx-auto text-gray-300 mb-1" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{formData.file_id ? 'DOKUMEN OK' : 'Klik Unggah Surat'}</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="text-xs font-bold text-gray-400 uppercase">Batal</button>
            <button disabled={saving || uploading} className="bg-[#006E62] text-white px-6 py-2 rounded text-xs font-bold uppercase shadow-md">{saving ? 'Menyimpan...' : 'Simpan Log'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WarningForm;
