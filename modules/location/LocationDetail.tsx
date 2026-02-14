
import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2, MapPin, Calendar, Clock, Image as ImageIcon, Phone, Target, Layers } from 'lucide-react';
import { Location } from '../../types';
import { locationService } from '../../services/locationService';
import { googleDriveService } from '../../services/googleDriveService';

interface LocationDetailProps {
  id: string;
  onClose: () => void;
  onEdit: (location: Location) => void;
  onDelete: (id: string) => void;
}

const LocationDetail: React.FC<LocationDetailProps> = ({ id, onClose, onEdit, onDelete }) => {
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await locationService.getById(id);
        setLocation(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (isLoading) return null;
  if (!location) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="relative h-44 bg-gray-100">
          {location.image_google_id ? (
            <img 
              src={googleDriveService.getFileUrl(location.image_google_id)} 
              alt={location.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
              <ImageIcon size={40} strokeWidth={1} />
              <span className="text-[10px] uppercase font-bold tracking-widest mt-2">Gambar Tidak Tersedia</span>
            </div>
          )}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-start mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Layers size={14} className="text-[#006E62]" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#006E62]">{location.location_type || 'Lokasi'}</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">{location.name}</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onEdit(location)} className="p-2 text-gray-400 hover:text-[#006E62] border border-gray-100 rounded hover:bg-gray-50 transition-all">
                <Edit2 size={16} />
              </button>
              <button onClick={() => onDelete(location.id)} className="p-2 text-gray-400 hover:text-red-500 border border-gray-100 rounded hover:bg-gray-50 transition-all">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Nomor Telepon</p>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Phone size={12} className="text-gray-400" /> {location.phone || '-'}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Radius Toleransi</p>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Target size={12} className="text-gray-400" /> {location.radius} Meter
              </div>
            </div>
            <div className="col-span-2 space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Alamat Lengkap</p>
              <p className="text-xs text-gray-600 leading-relaxed">{location.address}, {location.city}, {location.province} {location.zip_code}</p>
            </div>
            {location.description && (
              <div className="col-span-2 space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Keterangan</p>
                <p className="text-xs text-gray-600 italic">"{location.description}"</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-5 border-t border-gray-100 text-[9px] text-gray-400 uppercase font-bold tracking-widest">
            <div className="flex items-center gap-1"><Calendar size={10} /> <span>{formatDate(location.created_at)}</span></div>
            <div className="flex items-center gap-1"><Clock size={10} /> <span>{location.id.slice(0, 8)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationDetail;
