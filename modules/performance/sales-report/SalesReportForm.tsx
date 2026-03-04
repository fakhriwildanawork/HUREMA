import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, Camera, Info, Loader2, Link as LinkIcon, Trash2, Plus } from 'lucide-react';
import { SalesReportInput } from '../../../types';

interface SalesReportFormProps {
  onClose: () => void;
  onSubmit: (data: SalesReportInput) => void;
}

const SalesReportForm: React.FC<SalesReportFormProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<SalesReportInput>({
    account_id: '',
    customer_name: '',
    activity_type: 'Cold Call',
    description: '',
    latitude: 0,
    longitude: 0,
    address: '',
    photo_urls: []
  });

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  useEffect(() => {
    handleGetLocation();
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation tidak didukung oleh browser Anda.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setIsLocating(false);
        
        // Optional: Reverse geocoding could be done here if an API is available
        // For now, we just store coordinates
      },
      (error) => {
        console.error('Geolocation error:', error);
        let msg = 'Gagal mendapatkan lokasi.';
        if (error.code === error.PERMISSION_DENIED) msg = 'Izin lokasi ditolak. Mohon aktifkan GPS.';
        setLocationError(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addPhoto = () => {
    if (newPhotoUrl && !formData.photo_urls.includes(newPhotoUrl)) {
      setFormData(prev => ({ ...prev, photo_urls: [...prev.photo_urls, newPhotoUrl] }));
      setNewPhotoUrl('');
    }
  };

  const removePhoto = (url: string) => {
    setFormData(prev => ({ ...prev, photo_urls: prev.photo_urls.filter(u => u !== url) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.latitude === 0 || formData.longitude === 0) {
      alert('Lokasi GPS wajib didapatkan sebelum mengirim laporan.');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-[#006E62]" />
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Check-in Kunjungan Sales</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto scrollbar-thin">
          {/* Geolocation Status */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${locationError ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-[#006E62]'}`}>
            <div className="flex items-center gap-3">
              {isLocating ? (
                <Loader2 size={20} className="animate-spin" />
              ) : locationError ? (
                <Info size={20} />
              ) : (
                <MapPin size={20} />
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5">Status Lokasi GPS</p>
                <p className="text-xs font-bold">
                  {isLocating ? 'Mencari Koordinat...' : locationError ? locationError : `${formData.latitude.toFixed(6)}, ${formData.longitude.toFixed(6)}`}
                </p>
              </div>
            </div>
            {!isLocating && (
              <button 
                type="button" 
                onClick={handleGetLocation}
                className="text-[10px] font-bold uppercase underline tracking-widest"
              >
                Refresh
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Nama Klien / Toko</label>
            <input 
              required
              type="text" 
              name="customer_name" 
              value={formData.customer_name} 
              onChange={handleChange}
              placeholder="Contoh: Toko Berkah Jaya"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006E62]/20 focus:border-[#006E62] text-xs font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Tahap Pipeline</label>
            <select
              required
              name="activity_type"
              value={formData.activity_type}
              onChange={handleChange}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006E62]/20 focus:border-[#006E62] text-xs font-bold appearance-none"
            >
              <option value="Cold Call">Cold Call (Perkenalan)</option>
              <option value="Site Survey">Site Survey (Kunjungan Lokasi)</option>
              <option value="Product Demo">Product Demo (Presentasi)</option>
              <option value="Offering">Offering (Penawaran Harga)</option>
              <option value="Negotiation">Negotiation (Negosiasi)</option>
              <option value="Closing">Closing (Deal/Kontrak)</option>
              <option value="Maintenance">Maintenance (Kunjungan Rutin)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Catatan Kunjungan</label>
            <textarea 
              required
              name="description" 
              value={formData.description} 
              onChange={handleChange}
              rows={3}
              placeholder="Tuliskan hasil pertemuan atau kendala di lapangan..."
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006E62]/20 focus:border-[#006E62] text-xs font-medium resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Foto Bukti Kunjungan (Link Google Drive/Lainnya)</label>
            <div className="flex gap-2">
              <input 
                type="url" 
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006E62]/20 focus:border-[#006E62] text-xs"
              />
              <button 
                type="button" 
                onClick={addPhoto}
                className="px-3 py-2 bg-[#006E62] text-white rounded-xl hover:bg-[#005a50] transition-all"
              >
                <Plus size={16} />
              </button>
            </div>
            {formData.photo_urls.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {formData.photo_urls.map(url => (
                  <div key={url} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Camera size={12} className="text-gray-400 shrink-0" />
                      <span className="text-[10px] text-gray-600 truncate">{url}</span>
                    </div>
                    <button type="button" onClick={() => removePhoto(url)} className="text-rose-500 hover:text-rose-700">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 border border-gray-100 text-gray-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all"
            >
              Batal
            </button>
            <button 
              type="submit"
              disabled={isLocating}
              className="flex-2 py-3 bg-[#006E62] text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#005a50] shadow-lg shadow-[#006E62]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              Kirim Laporan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesReportForm;
