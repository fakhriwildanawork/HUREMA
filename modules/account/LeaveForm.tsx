import React, { useState } from 'react';
import { X, Save, Calendar } from 'lucide-react';
import { LeaveRequestInput } from '../../types';

interface LeaveFormProps {
  accountId: string;
  onClose: () => void;
  onSubmit: (data: LeaveRequestInput) => void;
}

const LeaveForm: React.FC<LeaveFormProps> = ({ accountId, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<LeaveRequestInput>({
    account_id: accountId,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#006E62]">Pengajuan Libur Mandiri</h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Khusus Jadwal Fleksibel / Dinamis</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="start_date" className="text-[9px] font-bold text-gray-500 uppercase">Tanggal Awal</label>
              <div className="relative">
                <input 
                  id="start_date"
                  type="date"
                  required 
                  name="start_date" 
                  value={formData.start_date} 
                  onChange={handleChange} 
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-[#006E62] bg-gray-50" 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="end_date" className="text-[9px] font-bold text-gray-500 uppercase">Tanggal Akhir</label>
              <div className="relative">
                <input 
                  id="end_date"
                  type="date"
                  required 
                  name="end_date" 
                  value={formData.end_date} 
                  onChange={handleChange} 
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-[#006E62] bg-gray-50" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="description" className="text-[9px] font-bold text-gray-500 uppercase">Keterangan Libur</label>
            <textarea 
              id="description"
              required
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows={3} 
              placeholder="Alasan pengajuan libur..."
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:ring-1 focus:ring-[#006E62] resize-none" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="text-[10px] font-bold text-gray-400 uppercase">Batal</button>
            <button 
              type="submit" 
              className="flex items-center gap-2 bg-[#006E62] text-white px-5 py-1.5 rounded text-[10px] font-bold uppercase shadow-md hover:bg-[#005a50]"
            >
              <Save size={12} /> Kirim Pengajuan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveForm;
