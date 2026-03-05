import React, { useState, useRef, useEffect } from 'react';
import { X, Save, Paperclip, Link as LinkIcon, Plus, Trash2, Loader2, Play, StopCircle, Clock, FileText, Send, AlertCircle } from 'lucide-react';
import { Meeting } from '../../types';
import { googleDriveService } from '../../services/googleDriveService';

interface MeetingSessionProps {
  meeting: Meeting;
  onClose: () => void;
  onEnd: (minutesContent: string, attachments: string[], links: string[]) => void;
}

const MeetingSession: React.FC<MeetingSessionProps> = ({ meeting, onClose, onEnd }) => {
  const [minutesContent, setMinutesContent] = useState('');
  const [links, setLinks] = useState<string[]>(['']);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const startTime = meeting.started_at ? new Date(meeting.started_at).getTime() : Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [meeting.started_at]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAddLink = () => setLinks([...links, '']);
  const handleRemoveLink = (index: number) => setLinks(links.filter((_, i) => i !== index));
  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      for (let i = 0; i < files.length; i++) {
        const fileId = await googleDriveService.uploadFile(files[i]);
        setAttachments(prev => [...prev, fileId]);
      }
    } catch (error) {
      alert('Gagal mengunggah file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => setAttachments(attachments.filter((_, i) => i !== index));

  const handleEndMeeting = () => {
    if (!minutesContent.trim()) {
      alert('Tuliskan notulensi rapat sebelum mengakhiri.');
      return;
    }
    onEnd(
      minutesContent,
      attachments,
      links.filter(l => l.trim() !== '')
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300 h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-amber-50/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center animate-pulse">
              <Play size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 tracking-tight">{meeting.title}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest flex items-center gap-1">
                  <Clock size={12} />
                  Durasi: {formatTime(elapsedTime)}
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">•</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sesi Rapat Berlangsung</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Editor */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-none border-r border-gray-100">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Isi Notulensi Rapat</label>
              <textarea 
                value={minutesContent}
                onChange={(e) => setMinutesContent(e.target.value)}
                placeholder="Tuliskan hasil pembahasan, keputusan, dan rencana tindak lanjut di sini..."
                className="w-full h-[500px] px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-all text-sm font-medium text-gray-700 resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Right: Attachments & Info */}
          <div className="w-80 p-6 overflow-y-auto space-y-8 scrollbar-none bg-gray-50/30">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dokumentasi (File)</label>
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isUploading}
                  className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1 hover:underline disabled:opacity-50"
                >
                  <Plus size={12} /> Tambah
                </button>
                <input 
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {isUploading && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-600 rounded-xl animate-pulse">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Mengunggah...</span>
                </div>
              )}

              <div className="space-y-2">
                {attachments.map((fileId, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 bg-white border border-gray-100 rounded-xl group">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip size={12} className="text-gray-400 shrink-0" />
                      <span className="text-[10px] text-gray-600 truncate">File_{idx + 1}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveAttachment(idx)} 
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {attachments.length === 0 && !isUploading && (
                  <p className="text-[10px] text-gray-400 italic text-center py-4">Belum ada lampiran file.</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Link Pendukung</label>
                <button type="button" onClick={handleAddLink} className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1 hover:underline">
                  <Plus size={12} /> Tambah
                </button>
              </div>
              <div className="space-y-2">
                {links.map((link, idx) => (
                  <div key={idx} className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                      <input 
                        type="url"
                        value={link}
                        onChange={(e) => handleLinkChange(idx, e.target.value)}
                        placeholder="https://..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/20 text-[10px] font-medium"
                      />
                    </div>
                    {links.length > 1 && (
                      <button type="button" onClick={() => handleRemoveLink(idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Informasi Sesi</span>
              </div>
              <p className="text-[10px] text-amber-600/80 leading-relaxed font-medium">
                Hanya Notulen yang ditunjuk yang dapat menyimpan hasil rapat ini. Pastikan semua poin penting telah dicatat sebelum mengakhiri sesi.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white transition-all"
          >
            Simpan Draf & Keluar
          </button>
          <button 
            onClick={handleEndMeeting}
            disabled={isUploading}
            className="flex-[2] py-3 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <StopCircle size={18} />
            Akhiri Rapat & Kunci Notulensi
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingSession;
