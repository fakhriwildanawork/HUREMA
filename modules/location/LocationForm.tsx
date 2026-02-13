
import React, { useState } from 'react';
import { X, Upload, Save } from 'lucide-react';
import { LocationInput } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';

interface LocationFormProps {
  onClose: () => void;
  onSubmit: (data: LocationInput) => void;
  initialData?: Partial<LocationInput>;
}

const LocationForm: React.FC<LocationFormProps> = ({ onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState<LocationInput>({
    name: initialData?.name || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    province: initialData?.province || '',
    zip_code: initialData?.zip_code || '',
    description: initialData?.description || '',
    image_google_id: initialData?.image_google_id || '',
  });

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileId = await googleDriveService.uploadFile(file);
      setFormData(prev => ({ ...prev, image_google_id: fileId }));
      setPreviewUrl(URL.createObjectURL(file));
    } catch (error) {
      console.error(error);
      alert('Gagal mengunggah gambar');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
          <h3 className="text-lg font-bold text-[#006E62]">
            {initialData ? 'Ubah Lokasi' : 'Tambah Lokasi Baru'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nama Lokasi</label>
              <input
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="cth: Kantor Pusat"
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] focus:border-[#006E62] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kota</label>
              <input
                required
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="cth: Jakarta Selatan"
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] focus:border-[#006E62] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Provinsi</label>
              <input
                required
                name="province"
                value={formData.province}
                onChange={handleChange}
                placeholder="cth: DKI Jakarta"
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] focus:border-[#006E62] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kode Pos</label>
              <input
                name="zip_code"
                value={formData.zip_code}
                onChange={handleChange}
                placeholder="cth: 12345"
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] focus:border-[#006E62] outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Alamat Lengkap</label>
            <textarea
              required
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] focus:border-[#006E62] outline-none resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Deskripsi / Catatan</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#006E62] focus:border-[#006E62] outline-none resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Foto Lokasi (GDrive)</label>
            <div className="flex flex-wrap gap-4 items-center">
              {previewUrl || formData.image_google_id ? (
                <div className="w-24 h-24 rounded border border-gray-200 overflow-hidden relative group">
                  <img 
                    src={previewUrl || googleDriveService.getFileUrl(formData.image_google_id!)} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <label className="cursor-pointer text-white p-2">
                      <Upload size={16} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                  </div>
                </div>
              ) : (
                <label className={`w-24 h-24 border-2 border-dashed border-gray-200 rounded flex flex-col items-center justify-center cursor-pointer hover:border-[#006E62] hover:bg-gray-50 transition-all ${uploading ? 'animate-pulse' : ''}`}>
                  <Upload className="text-gray-400 mb-1" size={20} />
                  <span className="text-[10px] text-gray-400 font-bold uppercase">{uploading ? 'Mengunggah...' : 'Upload'}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                </label>
              )}
              <div className="flex-1 text-xs text-gray-400">
                Format yang diijinkan: JPG, PNG. Ukuran maks 5MB. File akan otomatis tersimpan di Google Drive folder HUREMA.
              </div>
            </div>
          </div>
        </form>

        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 bg-[#006E62] text-white px-6 py-2 rounded-md hover:bg-[#005a50] transition-colors shadow-md text-sm font-bold"
          >
            <Save size={18} />
            Simpan Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationForm;
