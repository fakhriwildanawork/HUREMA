
import React, { useState, useMemo, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
// Fix: Added missing SupportingData import from types to resolve the error on line 413
import { LibraryItem, PubInfo, Identifiers, SupportingData } from '../../types';
import { 
  XMarkIcon, 
  ArrowLeftIcon,
  EyeIcon,
  BookmarkIcon,
  StarIcon,
  EllipsisVerticalIcon,
  PresentationChartBarIcon,
  ClipboardDocumentListIcon,
  ChatBubbleBottomCenterTextIcon,
  ShareIcon,
  AcademicCapIcon,
  LinkIcon,
  VideoCameraIcon,
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
  LightBulbIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  HashtagIcon,
  TagIcon,
  BeakerIcon,
  ClockIcon,
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  LanguageIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { 
  BookmarkIcon as BookmarkSolid, 
  StarIcon as StarSolid
} from '@heroicons/react/24/solid';
import { 
  StickyNote, 
  Share2, 
  Target, 
  BookOpenCheck, 
  Recycle, 
  Trash, 
  Presentation,
  MonitorPlay,
  ListTodo,
  NotebookPen,
  Grip,
  FileCode
} from 'lucide-react';
import Swal from 'sweetalert2';
import { XEENAPS_SWAL_CONFIG } from '../../utils/swalUtils';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
// Fix: Removed non-existent saveLibraryItem and imported Supabase services
import { deleteLibraryItem, generateCitations, generateInsight, fetchFileContent, translateInsightSection } from '../../services/gasService';
import { upsertLibraryItemToSupabase, deleteLibraryItemFromSupabase } from '../../services/LibrarySupabaseService';
import { FormDropdown } from '../Common/FormComponents';
import Header from '../Layout/Header';
import RelatedPresentations from '../Presenter/RelatedPresentations';
import RelatedQuestion from '../QuestionBank/RelatedQuestion';
import ConsultationGallery from '../Consultation/ConsultationGallery';
import NotebookMain from '../Notebook/NotebookMain';
import SharboxWorkflowModal from '../Sharbox/SharboxWorkflowModal';
import TracerProjectPicker from '../Research/Tracer/TracerProjectPicker';
import TeachingSessionPicker from '../Teaching/TeachingSessionPicker';
import ContentManagerModal from './ContentManagerModal';

interface LibraryDetailViewProps {
  item: LibraryItem;
  onClose: () => void;
  isLoading?: boolean;
  isMobileSidebarOpen?: boolean;
  onRefresh?: () => Promise<void>;
  onUpdateOptimistic?: (updatedItem: LibraryItem) => void;
  onDeleteOptimistic?: (id: string) => void;
  isLocalOverlay?: boolean;
}

/**
 * Tooltip Component for Premium Hover Effect
 */
const MiniTooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#004A74] text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-y-1 group-hover:translate-y-0 whitespace-nowrap z-[100]">
    {text}
    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#004A74]"></div>
  </div>
);

/**
 * Citation Modal Component
 */
const CitationModal: React.FC<{ 
  item: LibraryItem; 
  onClose: () => void 
}> = ({ item, onClose }) => {
  const [style, setStyle] = useState('Harvard');
  const [language, setLanguage] = useState('English');
  const [results, setResults] = useState<{ parenthetical: string; narrative: string; bibliography: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Editable states
  const [editableParenthetical, setEditableParenthetical] = useState('');
  const [editableNarrative, setEditableNarrative] = useState('');
  const [editableBibliography, setEditableBibliography] = useState('');
  
  const bibRef = useRef<HTMLDivElement>(null);

  const styles = ['Harvard', 'APA 7th Edition', 'IEEE', 'Chicago', 'Vancouver', 'MLA 9th Edition'];
  const languages = ['English', 'Indonesian', 'French', 'German', 'Dutch'];

  const handleGenerate = async () => {
    setIsGenerating(true);
    const data = await generateCitations(item, style, language);
    if (data) {
      setResults(data);
      setEditableParenthetical(data.parenthetical);
      setEditableNarrative(data.narrative);
      setEditableBibliography(data.bibliography);
    }
    setIsGenerating(false);
  };
  
  // Sync innerHTML when results change (for contentEditable div)
  useEffect(() => {
    if (results && bibRef.current) {
        bibRef.current.innerHTML = results.bibliography;
    }
  }, [results]);

  const copyToClipboard = (text: string, isHtml: boolean = false) => {
    if (isHtml) {
        const blobHtml = new Blob([text], { type: "text/html" });
        const blobText = new Blob([text.replace(/<[^>]*>/g, '')], { type: "text/plain" });
        try {
            navigator.clipboard.write([
                new ClipboardItem({
                    "text/html": blobHtml,
                    "text/plain": blobText,
                })
            ]);
            showXeenapsToast('success', 'Rich Text Citation Copied!');
        } catch (err) {
            // Fallback for incompatible browsers
            navigator.clipboard.writeText(text.replace(/<[^>]*>/g, ''));
            showXeenapsToast('success', 'Citation Copied (Plain Text)!');
        }
    } else {
        navigator.clipboard.writeText(text);
        showXeenapsToast('success', 'Citation Copied!');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-2xl p-6 md:p-10 rounded-[3rem] w-full max-w-2xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] relative border border-white/20 flex flex-col max-h-[85vh] min-h-[450px] md:min-h-[580px]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg">
              <AcademicCapIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight">Citation Generator</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Premium Academic Standards</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"
          >
            <XMarkIcon className="w-8 h-8" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
          {/* Configuration Grid using Xeenaps FormDropdown (Search disabled for fixed options) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Citation Style</label>
              <FormDropdown 
                value={style} 
                onChange={(v) => setStyle(v)} 
                options={styles} 
                placeholder="Select style..."
                allowCustom={false}
                showSearch={false}
                disabled={isGenerating}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Language</label>
              <FormDropdown 
                value={language} 
                onChange={(v) => setLanguage(v)} 
                options={languages} 
                placeholder="Select language..."
                allowCustom={false}
                showSearch={false}
                disabled={isGenerating}
              />
            </div>
          </div>

          <button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full py-4 bg-[#004A74] text-[#FED400] rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-[#004A74]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isGenerating ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
            {isGenerating ? 'Processing...' : 'Cite Now'}
          </button>

          {/* Results Section */}
          {results && (
            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500 pb-4">
              <div className="h-px bg-gray-100 w-full" />
              
              {/* In-Text Parenthetical */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">In-Text (Parenthetical)</span>
                  <button onClick={() => copyToClipboard(editableParenthetical, false)} className="text-[#004A74] hover:scale-110 transition-transform"><DocumentDuplicateIcon className="w-4 h-4" /></button>
                </div>
                <textarea 
                  value={editableParenthetical}
                  onChange={(e) => setEditableParenthetical(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold text-[#004A74] leading-relaxed focus:bg-white transition-all outline-none resize-none min-h-[60px]"
                />
              </div>

              {/* In-Text Narrative */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">In Narrative Citation</span>
                  <button onClick={() => copyToClipboard(editableNarrative, false)} className="text-[#004A74] hover:scale-110 transition-transform"><DocumentDuplicateIcon className="w-4 h-4" /></button>
                </div>
                <textarea 
                  value={editableNarrative}
                  onChange={(e) => setEditableNarrative(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold text-[#004A74] leading-relaxed focus:bg-white transition-all outline-none resize-none min-h-[60px]"
                />
              </div>

              {/* Bibliography (Rich Text Support) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Bibliographic Citation (Rich Text)</span>
                  <button onClick={() => copyToClipboard(bibRef.current ? bibRef.current.innerHTML : editableBibliography, true)} className="text-[#004A74] hover:scale-110 transition-transform"><DocumentDuplicateIcon className="w-4 h-4" /></button>
                </div>
                <div
                    contentEditable
                    suppressContentEditableWarning
                    ref={bibRef}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold text-[#004A74] leading-relaxed focus:bg-white transition-all outline-none overflow-y-auto min-h-[100px]"
                    onInput={(e) => setEditableBibliography(e.currentTarget.innerHTML)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Tips Modal Component
 */
const TipsModal: React.FC<{ tips: string; onClose: () => void }> = ({ tips, onClose }) => {
  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative border border-white/20">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-red-500 rounded-full transition-all">
          <XMarkIcon className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center text-center space-y-6">
           <div className="w-16 h-16 bg-[#FED400]/20 text-[#004A74] rounded-2xl flex items-center justify-center shadow-inner">
              <LightBulbIcon className="w-8 h-8" />
           </div>
           <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tight">Quick Tips</h3>
           <div className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100 w-full text-left max-h-[60vh] overflow-y-auto custom-scrollbar" dangerouslySetInnerHTML={{ __html: tips || "No tips available." }} />
        </div>
      </div>
    </div>
  );
};

/**
 * Helper to safely format dates from ISO or raw strings.
 */
const formatDate = (dateStr: any) => {
  if (!dateStr || dateStr === 'N/A' || dateStr === 'Unknown') return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      if (/^\d{4}$/.test(String(dateStr).trim())) return dateStr;
      return null;
    }
    const day = d.getDate().toString().padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    if (String(dateStr).includes('T00:00:00') || String(dateStr).length < 10) return year.toString();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return null;
  }
};

/**
 * Helper to format creation/update time in "DD Mmm YYYY hh:mm"
 */
const formatTimeMeta = (dateStr: string) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const day = d.getDate().toString().padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  } catch {
    return "-";
  }
};

/**
 * Helper to parse dynamic JSON fields
 */
const parseJsonField = (field: any, defaultValue: any = {}) => {
  if (!field) return defaultValue;
  if (typeof field === 'object' && !Array.isArray(field)) return field;
  try {
    const parsed = typeof field === 'string' ? JSON.parse(field) : field;
    return parsed || defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

/**
 * Enhanced List Component with Primary Circle and Yellow Text
 * MODIFIED: Supports Narrative HTML blocks without numeric markers if complex tags are detected.
 */
const ElegantList: React.FC<{ text?: any; className?: string; isLoading?: boolean }> = ({ text, className = "", isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 items-center">
            <div className="w-6 h-6 rounded-full skeleton shrink-0" />
            <div className="h-4 w-full skeleton rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (text === null || text === undefined || text === 'N/A') return null;
  
  // NARRATIVE DETECTION: If text is standard paragraphs without newline/bullet list structure
  const isNarrative = typeof text === 'string' && !text.includes('\n') && !text.includes('•') && (text.includes('<span') || text.includes('<b') || text.length > 500);

  if (isNarrative) {
    return (
      <div 
        className={`text-sm leading-relaxed text-[#004A74] font-medium ${className}`} 
        dangerouslySetInnerHTML={{ __html: text }} 
      />
    );
  }

  let items: string[] = [];
  if (Array.isArray(text)) {
    items = text.map(i => String(i).trim()).filter(Boolean);
  } else if (typeof text === 'string') {
    const trimmedText = text.trim();
    if (trimmedText === '') return null;
    items = trimmedText.split(/\n|(?=\d+\.)|(?=•)/)
      .map(i => i.replace(/^\d+\.\s*|•\s*/, '').trim())
      .filter(Boolean);
  } else {
    const strVal = String(text).trim();
    if (strVal === '') return null;
    items = [strVal];
  }

  if (items.length === 0) return null;

  if (items.length === 1 && typeof text === 'string' && !text.match(/\n|(?=\d+\.)|(?=•)/)) {
    return (
      <div className={`text-sm leading-relaxed text-[#004A74] font-medium ${className}`} dangerouslySetInnerHTML={{ __html: text }} />
    );
  }

  return (
    <ol className={`space-y-3 list-none ${className}`}>
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-3 items-start group">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#004A74] text-[#FED400] text-[10px] font-black flex items-center justify-center shadow-sm">
            {idx + 1}
          </span>
          <span className="text-sm text-[#004A74]/90 leading-relaxed font-semibold" dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ol>
  );
};

 /**
 * SelectionPopover component - Interactive Floating Highlighter & Style Customizer
 */
interface SelectionState {
  sectionName: string;
  text: string;
  range: Range;
  clientX: number;
  clientY: number;
}

const SelectionPopover: React.FC<{
  state: SelectionState;
  onClose: () => void;
  onApply: (
    hlColor: string,
    txtColor: string,
    bold: boolean,
    italic: boolean,
    underline: boolean,
    note: string
  ) => void;
}> = ({ state, onClose, onApply }) => {
  const [highlightColor, setHighlightColor] = useState('#FED400');
  const [textColor, setTextColor] = useState('#004A74');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [noteText, setNoteText] = useState('');
  
  // Custom states for the horizontal choice tabs (Highlight, Text Color, TextFormat, Input)
  const [activeTab, setActiveTab] = useState<'highlight' | 'textColor' | 'format' | 'note' | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [noteText, activeTab]);

  const colors = [
    { name: 'Kuning', value: '#FED400' },
    { name: 'Hijau', value: '#86EFAC' },
    { name: 'Biru', value: '#93C5FD' },
    { name: 'Merah', value: '#FCA5A5' },
    { name: 'Oranye', value: '#FDBA74' },
    { name: 'Bening', value: 'transparent' },
  ];

  const textColors = [
    { name: 'Gelap', value: '#004A74' },
    { name: 'Merah', value: '#EF4444' },
    { name: 'Hijau', value: '#10B981' },
    { name: 'Hitam', value: '#000000' },
    { name: 'Putih', value: '#FFFFFF' },
  ];

  return (
    <div 
      className="fixed z-[10005] bg-white rounded-3xl border border-gray-150 shadow-2xl p-4 w-80 animate-in fade-in duration-150 zoom-in-95 pointer-events-auto font-sans"
      style={window.innerWidth < 768 ? {
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: '24px',
        top: 'auto'
      } : {
        left: `${Math.max(16, Math.min(window.innerWidth - 336, state.clientX - 160))}px`,
        top: `${Math.max(16, Math.min(window.innerHeight - 340, state.clientY - 120))}px`
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-gray-50">
        <span className="text-[9px] font-black uppercase text-[#004A74]/50 tracking-wider">Format Selection</span>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 p-1 transition-all cursor-pointer"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sleek Horizontal Choice Tabs */}
      <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-2xl mb-3">
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'highlight' ? null : 'highlight')}
          className={`flex-1 py-1 px-0.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 min-h-[42px] cursor-pointer ${
            activeTab === 'highlight' ? 'bg-[#004A74] text-[#FED400] shadow-sm' : 'hover:bg-white text-gray-500 hover:text-[#004A74]'
          }`}
        >
          <span className="w-3 h-3 rounded-full border border-gray-300 shadow-sm animate-in zoom-in duration-100" style={{ backgroundColor: highlightColor === 'transparent' ? '#E5E7EB' : highlightColor }} />
          Highlight
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'textColor' ? null : 'textColor')}
          className={`flex-1 py-1 px-0.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 min-h-[42px] cursor-pointer ${
            activeTab === 'textColor' ? 'bg-[#004A74] text-[#FED400] shadow-sm' : 'hover:bg-white text-gray-500 hover:text-[#004A74]'
          }`}
        >
          <span className="w-3 h-3 rounded-full border border-gray-300 shadow-sm animate-in zoom-in duration-100" style={{ backgroundColor: textColor }} />
          TextColor
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'format' ? null : 'format')}
          className={`flex-1 py-1 px-0.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 min-h-[42px] cursor-pointer ${
            activeTab === 'format' ? 'bg-[#004A74] text-[#FED400] shadow-sm' : 'hover:bg-white text-gray-500 hover:text-[#004A74]'
          }`}
        >
          <span className="text-[10px] font-bold leading-none select-none">B/I/U</span>
          TextFormat
        </button>

        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'note' ? null : 'note')}
          className={`flex-1 py-1 px-0.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 min-h-[42px] cursor-pointer ${
            activeTab === 'note' ? 'bg-[#004A74] text-[#FED400] shadow-sm' : 'hover:bg-white text-gray-500 hover:text-[#004A74]'
          }`}
        >
          <StickyNote className="w-3.5 h-3.5 shrink-0" />
          Input
        </button>
      </div>

      <div className="space-y-3">
        {/* Dynamic Inner Panels relative to selected tabs */}
        {activeTab === 'highlight' && (
          <div className="animate-in slide-in-from-top-1 duration-150 p-2.5 bg-gray-50/70 border border-gray-100 rounded-2xl">
            <label className="text-[8px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">Pilih Warna Highlight:</label>
            <div className="flex items-center gap-2 flex-wrap">
              {colors.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setHighlightColor(c.value)}
                  className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                    highlightColor === c.value ? 'border-[#004A74] scale-110 ring-2 ring-[#004A74]/20' : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value === 'transparent' ? '#F3F4F6' : c.value }}
                  title={c.name}
                />
              ))}
              <div className="relative w-6 h-6 rounded-full border border-gray-300 overflow-hidden shrink-0 cursor-pointer flex items-center justify-center bg-gray-50 hover:scale-105 transition-all">
                <input 
                  type="color" 
                  value={highlightColor.startsWith('#') ? highlightColor : '#FED400'} 
                  onChange={(e) => setHighlightColor(e.target.value)} 
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  title="Warna Kustom"
                />
                <span className="text-[9px] font-black text-gray-400">#</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'textColor' && (
          <div className="animate-in slide-in-from-top-1 duration-150 p-2.5 bg-gray-50/70 border border-gray-100 rounded-2xl">
            <label className="text-[8px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">Pilih Warna Teks:</label>
            <div className="flex items-center gap-2 flex-wrap">
              {textColors.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setTextColor(c.value)}
                  className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                    textColor === c.value ? 'border-[#004A74] scale-110 ring-2 ring-[#004A74]/20' : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
              <div className="relative w-6 h-6 rounded-full border border-gray-300 overflow-hidden shrink-0 cursor-pointer flex items-center justify-center bg-gray-50 hover:scale-105 transition-all">
                <input 
                  type="color" 
                  value={textColor.startsWith('#') ? textColor : '#004A74'} 
                  onChange={(e) => setTextColor(e.target.value)} 
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  title="Teks Kustom"
                />
                <span className="text-[9px] font-black text-gray-400">T</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'format' && (
          <div className="animate-in slide-in-from-top-1 duration-150 p-2.5 bg-gray-50/70 border border-gray-100 rounded-2xl">
            <label className="text-[8px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">Format Gaya Font:</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBold(!isBold)}
                className={`w-9 h-9 rounded-xl font-black text-xs transition-all cursor-pointer ${
                  isBold ? 'bg-[#004A74] text-[#FED400]' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                }`}
                title="Sangat Tebal (Bold)"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => setIsItalic(!isItalic)}
                className={`w-9 h-9 rounded-xl font-black italic text-xs transition-all cursor-pointer ${
                  isItalic ? 'bg-[#004A74] text-[#FED400]' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                }`}
                title="Miring (Italic)"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => setIsUnderline(!isUnderline)}
                className={`w-9 h-9 rounded-xl font-black underline text-xs transition-all cursor-pointer ${
                  isUnderline ? 'bg-[#004A74] text-[#FED400]' : 'bg-white text-gray-500 hover:bg-gray-100 border border-[#FED400]'
                }`}
                title="Garis Bawah (Underline)"
              >
                U
              </button>
            </div>
          </div>
        )}

        {activeTab === 'note' && (
          <div className="animate-in slide-in-from-top-1 duration-150 p-2.5 bg-gray-50/70 border border-gray-100 rounded-2xl">
            <label className="text-[8px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">Tulis Catatan (Expandable):</label>
            <div className="relative font-sans">
              <textarea
                ref={textareaRef}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Tulis catatan lengkap di sini..."
                className="w-full pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:border-[#004A74] text-[#004A74] outline-none resize-none transition-all duration-150 min-h-[60px]"
                rows={2}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <StickyNote className="absolute left-2 top-3 w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end gap-1.5 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[10px] font-bold text-gray-600 transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onApply(highlightColor, textColor, isBold, isItalic, isUnderline, noteText)}
            className="px-4.5 py-1.5 rounded-xl bg-[#004A74] text-[#FED400] text-[10px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
};

const LibraryDetailView: React.FC<LibraryDetailViewProps> = ({ item, onClose, isLoading, isMobileSidebarOpen, onRefresh, onUpdateOptimistic, onDeleteOptimistic, isLocalOverlay }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showCiteModal, setShowCiteModal] = useState(false);
  const [showPresentations, setShowPresentations] = useState(false); 
  const [showQuestions, setShowQuestions] = useState(false); 
  const [showConsultations, setShowConsultations] = useState(false); 
  const [showNotebook, setShowNotebook] = useState(false); 

  // Selection & Annotations state
  const [selectionState, setSelectionState] = useState<SelectionState | null>(null);
  const [hoveredNote, setHoveredNote] = useState<{ text: string; x: number; y: number } | null>(null);

  const handleTextSelection = (sectionName: string) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return;
    }
    const text = selection.toString().trim();
    if (text.length === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const container = document.getElementById(`section-container-${sectionName}`);
    if (container && container.contains(range.commonAncestorContainer)) {
      const rect = range.getBoundingClientRect();
      setSelectionState({
        sectionName,
        text,
        range,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top - 12
      });
    }
  };

  const getSectionHtml = (sectionName: string, container: HTMLElement) => {
    if (sectionName === 'summary') {
      return container.innerHTML;
    }
    const itemSpans = Array.from(container.querySelectorAll('.leading-relaxed.font-semibold'));
    if (itemSpans.length > 0) {
      return itemSpans.map(s => s.innerHTML).join('\n');
    }
    return container.innerHTML;
  };

  const handleApplyHighlight = async (
    hlColor: string,
    txtColor: string,
    bold: boolean,
    italic: boolean,
    underline: boolean,
    note: string
  ) => {
    if (!selectionState) return;

    const { range, sectionName } = selectionState;
    const span = document.createElement('span');
    span.className = 'xeenaps-highlight relative cursor-pointer border-b border-dashed border-[#004A74] shadow-sm transition-all duration-200';
    
    let styles = [];
    if (hlColor && hlColor !== 'transparent') styles.push(`background-color: ${hlColor} !important`);
    if (txtColor) styles.push(`color: ${txtColor} !important`);
    if (bold) styles.push(`font-weight: bold !important`);
    if (italic) styles.push(`font-style: italic !important`);
    if (underline) styles.push(`text-decoration: underline !important`);
    
    span.style.cssText = styles.join('; ');
    
    if (note.trim()) {
      span.setAttribute('data-note', note.trim());
    }

    try {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      
      window.getSelection()?.removeAllRanges();
      setSelectionState(null);

      const container = document.getElementById(`section-container-${sectionName}`);
      if (container) {
        const newHtml = getSectionHtml(sectionName, container);
        await handleSaveSection(sectionName, newHtml);
      }
    } catch (error) {
      console.error('Failed to apply selection:', error);
      showXeenapsToast('error', 'Gagal memformat teks yang dipilih.');
    }
  };

  const handleSaveSection = async (sectionName: string, newHtml: string) => {
    const updatedItem = {
      ...currentItem,
      [sectionName]: newHtml,
      updatedAt: new Date().toISOString()
    };
    
    setCurrentItem(updatedItem);
    showXeenapsToast('info', 'Menyimpan perubahan ke basis data...');
    
    if (onUpdateOptimistic) {
      onUpdateOptimistic(updatedItem);
    }
    
    try {
      const res = await upsertLibraryItemToSupabase(updatedItem);
      if (res) {
        showXeenapsToast('success', 'Highlight dan catatan berhasil disimpan!');
      } else {
        showXeenapsToast('error', 'Gagal menyimpan perubahan');
      }
    } catch (e) {
      showXeenapsToast('error', 'Terjadi kesalahan sistem saat menyimpan');
    }
  };

  const handleContainerMouseOver = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('.xeenaps-highlight');
    if (target) {
      const note = target.getAttribute('data-note');
      if (note) {
        const rect = target.getBoundingClientRect();
        setHoveredNote({
          text: note,
          x: rect.left + rect.width / 2,
          y: rect.top - 8
        });
      }
    }
  };

  const handleContainerMouseOut = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('.xeenaps-highlight');
    if (target) {
      setHoveredNote(null);
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('.xeenaps-highlight');
    if (target) {
      e.stopPropagation();
      setSelectionState(null);

      const note = target.getAttribute('data-note');
      const sectionElement = target.closest('[id^="section-container-"]');
      const sectionName = sectionElement ? sectionElement.id.replace('section-container-', '') : '';

      Swal.fire({
        ...XEENAPS_SWAL_CONFIG,
        title: "Pilihan Highlight",
        html: `
          <div class="space-y-4">
            ${note ? `
              <div class="text-left font-sans">
                <span class="text-[9px] font-black uppercase text-gray-400 tracking-widest block mb-1">Catatan Tersimpan:</span>
                <div class="p-3 border-l-4 border-[#004A74] bg-[#004A74]/5 rounded-r-xl text-[#004A74] text-xs font-semibold leading-relaxed">${note}</div>
              </div>
            ` : '<p class="text-xs text-gray-500 font-semibold text-center">Teks ini dihighlight tanpa catatan.</p>'}
            <p class="text-[10px] font-bold text-gray-400 text-center">Pilih tindakan untuk highlight ini:</p>
          </div>
        `,
        icon: "info",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Tutup",
        denyButtonText: "Hapus Highlight",
        cancelButtonText: "Edit Catatan",
        confirmButtonColor: "#004A74",
        denyButtonColor: "#EF4444",
      }).then(async (result) => {
        if (result.isDenied) {
          const parent = target.parentNode;
          if (parent) {
            while (target.firstChild) {
              parent.insertBefore(target.firstChild, target);
            }
            parent.removeChild(target);
          }
          showXeenapsToast('success', 'Highlight berhasil dihapus!');
          
          if (sectionElement) {
            const newHtml = getSectionHtml(sectionName, sectionElement as HTMLElement);
            await handleSaveSection(sectionName, newHtml);
          }
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          Swal.fire({
            ...XEENAPS_SWAL_CONFIG,
            title: "Edit Catatan Highlight",
            input: 'textarea',
            inputValue: note || '',
            inputPlaceholder: 'Tulis catatan Anda di sini...',
            inputAttributes: {
              'aria-label': 'Tulis catatan Anda di sini',
              'class': 'rounded-xl p-3 text-xs font-semibold'
            },
            showCancelButton: true,
            confirmButtonText: "Simpan",
            cancelButtonText: "Batal",
            confirmButtonColor: "#004A74"
          }).then(async (noteResult) => {
            if (noteResult.isConfirmed) {
              const newNote = noteResult.value;
              if (newNote && newNote.trim()) {
                target.setAttribute('data-note', newNote.trim());
              } else {
                target.removeAttribute('data-note');
              }
              showXeenapsToast('success', 'Catatan diperbarui!');
              if (sectionElement) {
                const newHtml = getSectionHtml(sectionName, sectionElement as HTMLElement);
                await handleSaveSection(sectionName, newHtml);
              }
            }
          });
        }
      });
    }
  };

  const [isShareModalOpen, setIsShareModalOpen] = useState(false); 
  const [isTracerPickerOpen, setIsTracerPickerOpen] = useState(false);
  const [isTeachingPickerOpen, setIsTeachingPickerOpen] = useState(false);
  const [isContentManagerOpen, setIsContentManagerOpen] = useState(false);
  const [dummySearch, setDummySearch] = useState('');
  
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const [isBookmarked, setIsBookmarked] = useState(!!item.isBookmarked);
  const [isFavorite, setIsFavorite] = useState(!!item.isFavorite);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isFetchingStoredInsights, setIsFetchingStoredInsights] = useState(false);

  // New state for section-specific translation
  const [translatingSection, setTranslatingSection] = useState<string | null>(null);
  const [openTranslationMenu, setOpenTranslationMenu] = useState<string | null>(null);

  const [currentItem, setCurrentItem] = useState(item);

  // MOUNT-TIME STATE MEMORY (FROZEN METADATA)
  // Menyimpan data navigasi saat komponen pertama kali dipasang untuk mengatasi amnesia state setelah sanitasi.
  const initialLocationStateRef = useRef(location.state);
  const wasOpenedViaExternalRef = useRef(!!(location.state as any)?.openItem);

  useEffect(() => {
    const loadJsonInsights = async () => {
      if (item.insightJsonId) {
        setIsFetchingStoredInsights(true);
        const jsonInsights = await fetchFileContent(item.insightJsonId, item.storageNodeUrl);
        if (jsonInsights && Object.keys(jsonInsights).length > 0) {
          setCurrentItem(prev => ({
            ...prev,
            ...jsonInsights
          }));
        }
        setIsFetchingStoredInsights(false);
      }
    };
    
    setCurrentItem(item);
    loadJsonInsights();
  }, [item]);

  const pubInfo: PubInfo = useMemo(() => parseJsonField(currentItem.pubInfo), [currentItem.pubInfo]);
  const identifiers: Identifiers = useMemo(() => parseJsonField(currentItem.identifiers), [currentItem.identifiers]);
  const tags = useMemo(() => parseJsonField(currentItem.tags, { keywords: [], labels: [] }), [currentItem.tags]);
  const supportingData: SupportingData = useMemo(() => parseJsonField(currentItem.supportingReferences, { references: [], videoUrl: null }), [currentItem.supportingReferences]);
  
  const displayDate = formatDate(currentItem.fullDate || currentItem.year);
  const authorsText = Array.isArray(currentItem.authors) ? currentItem.authors.join(', ') : (currentItem.authors || 'Unknown');

  const LANG_OPTIONS = [
    { label: "English", code: "en" },
    { label: "Indonesian", code: "id" },
    { label: "Portuguese", code: "pt" },
    { label: "Spanish", code: "es" },
    { label: "German", code: "de" },
    { label: "French", code: "fr" },
    { label: "Dutch", code: "nl" },
    { label: "Mandarin", code: "zh" },
    { label: "Japanese", code: "ja" },
    { label: "Vietnamese", code: "vi" },
    { label: "Thai", code: "th" },
    { label: "Hindi", code: "hi" },
    { label: "Turkish", code: "tr" },
    { label: "Russian", code: "ru" },
    { label: "Arabic", code: "ar" }
  ];

  const handleOpenLink = (url: string | null) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    showXeenapsToast('success', 'Reference Copied!');
  };

  const handleReplaceVideo = async () => {
    const swalRes = await Swal.fire({
      ...XEENAPS_SWAL_CONFIG,
      title: "Replace Video",
      text: "Paste a YouTube URL to replace the current recommendation",
      input: "url",
      inputPlaceholder: "https://www.youtube.com/watch?v=...",
      showCancelButton: true,
      confirmButtonText: "Replace",
    });

    if (swalRes.isConfirmed && swalRes.value) {
      const url = swalRes.value as string;
      const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      if (match && match[1]) {
        const videoId = match[1];
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        const updatedRef = { ...supportingData, videoUrl: embedUrl };
        const updatedItem = {
          ...currentItem,
          supportingReferences: updatedRef
        };
        
        showXeenapsToast('info', 'Updating video...');
        setCurrentItem(updatedItem);
        if (onUpdateOptimistic) onUpdateOptimistic(updatedItem);

        try {
          await upsertLibraryItemToSupabase(updatedItem);
          showXeenapsToast('success', 'Video Replaced');
        } catch (e) {
          showXeenapsToast('error', 'Failed to save video');
          setCurrentItem(currentItem);
          if (onUpdateOptimistic) onUpdateOptimistic(currentItem);
        }
      } else {
        showXeenapsToast('error', 'Invalid YouTube URL');
      }
    }
  };

  const handleDeleteVideo = async () => {
    const swalRes = await Swal.fire({
      ...XEENAPS_SWAL_CONFIG,
      title: "Remove Video?",
      text: "Are you sure you want to remove the video recommendation?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remove",
    });
    
    if (swalRes.isConfirmed) {
      const updatedRef = { ...supportingData, videoUrl: "" };
      const updatedItem = {
        ...currentItem,
        supportingReferences: updatedRef
      };

      showXeenapsToast('info', 'Removing video...');
      setCurrentItem(updatedItem);
      if (onUpdateOptimistic) onUpdateOptimistic(updatedItem);

      try {
        await upsertLibraryItemToSupabase(updatedItem);
        showXeenapsToast('success', 'Video Removed');
      } catch (e) {
        showXeenapsToast('error', 'Failed to save');
        setCurrentItem(currentItem);
        if (onUpdateOptimistic) onUpdateOptimistic(currentItem);
      }
    }
  };

  const handleToggleAction = async (property: 'isBookmarked' | 'isFavorite') => {
    const newValue = property === 'isBookmarked' ? !isBookmarked : !isFavorite;
    
    if (property === 'isBookmarked') setIsBookmarked(newValue);
    else setIsFavorite(newValue);
    
    const updatedItem = { ...currentItem, [property]: newValue };
    
    if (onUpdateOptimistic) {
      onUpdateOptimistic(updatedItem);
    }

    try {
      // Fix: Used upsertLibraryItemToSupabase instead of non-existent saveLibraryItem
      await upsertLibraryItemToSupabase(updatedItem);
    } catch (e) {
      if (property === 'isBookmarked') setIsBookmarked(!newValue);
      else setIsFavorite(!newValue);
      if (onUpdateOptimistic) onUpdateOptimistic(item);
      showXeenapsToast('error', 'Failed to sync with server');
    }
  };

  const handleGenerateInsights = async () => {
    if (isGeneratingInsights || isFetchingStoredInsights) return;
    setIsGeneratingInsights(true);
    showXeenapsToast('info', 'AI Insighter is analyzing content...');

    try {
      const data = await generateInsight(currentItem);
      if (data) {
        const updated = {
          ...currentItem,
          researchMethodology: data.researchMethodology,
          summary: data.summary,
          strength: data.strength,
          weakness: data.weakness,
          unfamiliarTerminology: data.unfamiliarTerminology,
          quickTipsForYou: data.quickTipsForYou,
          updatedAt: new Date().toISOString()
        };
        setCurrentItem(updated);
        showXeenapsToast('success', 'Deep Insights Generated!');
      } else {
        showXeenapsToast('error', 'Analysis failed on server');
      }
    } catch (e) {
      showXeenapsToast('error', 'Connection error during analysis');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleTranslateSection = async (sectionName: string, langCode: string) => {
    if (translatingSection) return;
    setTranslatingSection(sectionName);
    setOpenTranslationMenu(null);
    showXeenapsToast('info', 'Translating content...');

    try {
      const translated = await translateInsightSection(currentItem, sectionName, langCode);
      if (translated) {
        setCurrentItem(prev => ({
          ...prev,
          [sectionName]: translated
        }));
        showXeenapsToast('success', 'Translation successful!');
      } else {
        showXeenapsToast('error', 'Translation service error');
      }
    } catch (e) {
      showXeenapsToast('error', 'Translation failed');
    } finally {
      setTranslatingSection(null);
    }
  };

  const handleViewCollection = () => {
    let targetUrl = '';
    if (currentItem.fileId) {
      targetUrl = `https://drive.google.com/file/d/${currentItem.fileId}/view`;
    } else if (currentItem.url) {
      targetUrl = currentItem.url;
    }
    
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleUpdate = () => {
    navigate(`/edit/${currentItem.id}`);
  };

  const handleDelete = async () => {
    const confirmed = await showXeenapsDeleteConfirm(1);
    if (confirmed) {
      if (onDeleteOptimistic) {
        onDeleteOptimistic(currentItem.id);
      }
      onClose();
      // Redirect to /library instead of / (Dashboard)
      navigate('/library');
      showXeenapsToast('success', 'Processing Deletion...');

      try {
        // Fix: Call both GAS and Supabase delete services for consistency
        await deleteLibraryItem(currentItem.id);
        await deleteLibraryItemFromSupabase(currentItem.id);
        
        // ADDED: Dispatch event to notify App.tsx (Fixes Dashboard Stale Data)
        window.dispatchEvent(new CustomEvent('xeenaps-library-deleted', { detail: currentItem.id }));
      } catch (e) {
        showXeenapsToast('error', 'Critical Error: Deletion failed on server');
        if (onRefresh) onRefresh();
      }
    }
  };

  // SMART DETERMINISTIC BACK LOGIC
  const handleBack = () => {
    // 1. Overlay lokal (misal dari Matrix) -> Tutup tanpa history
    if (isLocalOverlay) {
      onClose();
      return;
    }

    // Menggunakan rujukan state yang dibekukan saat mount (Initial State)
    const frozenState = initialLocationStateRef.current as any;

    // 2. Modul-specific return logic (Prioritas 1)
    if (frozenState?.returnToTracerProject) {
      navigate(`/research/tracer/${frozenState.returnToTracerProject}`, { 
        state: { reopenReference: frozenState.returnToRef }, 
        replace: true 
      });
      return;
    } 
    
    if (frozenState?.returnToTeaching) {
      navigate(`/teaching/${frozenState.returnToTeaching}`, { 
        state: { 
           activeTab: frozenState.activeTab || 'substance',
           item: frozenState.teachingItem // Pass back full teaching object for hydration
        }, 
        replace: true 
      });
      return;
    } 
    
    if (frozenState?.returnToAttachedQuestion) {
      navigate(`/teaching/${frozenState.returnToAttachedQuestion}/questions`, { 
        state: { item: frozenState.teachingItem }, 
        replace: true 
      });
      return;
    } 
    
    if (frozenState?.returnToPPT) {
      navigate('/presentations', { state: { reopenPPT: frozenState.returnToPPT }, replace: true });
      return;
    } 
    
    if (frozenState?.returnToQuestion) {
      navigate('/questions', { state: { reopenQuestion: frozenState.returnToQuestion }, replace: true });
      return;
    }

    if (frozenState?.returnToAudit) {
      const audit = frozenState.returnToAudit;
      if (audit.roughIdea !== undefined) {
        navigate(`/research/brainstorming/${audit.id}`, { state: { item: audit }, replace: true });
      } else if (audit.gSlidesId !== undefined || audit.templateName !== undefined) {
        navigate('/presentations', { state: { reopenPPT: audit }, replace: true });
      } else if (audit.projectName !== undefined) {
        navigate(`/research/work/${audit.id}`, { replace: true });
      } else {
        onClose();
      }
      return;
    }

    // 3. Generic Referrer
    if (frozenState?.fromPath) {
      navigate(frozenState.fromPath, { replace: true, state: frozenState.fromState });
      return;
    }

    // 4. Base Logic: Jika URL tidak berubah (Overlay mode), cukup onClose() 
    // agar tidak melempar user keluar rute secara tidak sengaja (History stack trap).
    onClose();
  };

  const hasViewLink = !!(currentItem.fileId || currentItem.url);
  const hasContent = !!currentItem.extractedJsonId;
  const isAnyLoading = isGeneratingInsights || isFetchingStoredInsights;

  // New Subcomponent for Section Header with Translation and Highlighting Button
  const SectionHeader: React.FC<{ 
    label: string; 
    icon: React.ReactNode; 
    sectionName: string;
    hasContent: boolean;
  }> = ({ label, icon, sectionName, hasContent }) => (
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
        {icon} {label}
      </h3>
      {hasContent && !isAnyLoading && (
        <div className="flex items-center gap-1.5 relative z-[1002]">
          <div className="relative group">
            <button 
              onClick={() => setOpenTranslationMenu(openTranslationMenu === sectionName ? null : sectionName)}
              className="p-1.5 text-[#004A74] bg-white border border-gray-100 rounded-lg shadow-sm hover:scale-110 transition-all cursor-pointer"
            >
              <LanguageIcon className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <MiniTooltip text="Translate Section" />
            {openTranslationMenu === sectionName && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 z-[110] animate-in fade-in zoom-in-95 font-sans">
                <div className="p-2 border-b border-gray-50 mb-1">
                   <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Select Language</p>
                </div>
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                  {LANG_OPTIONS.map((lang) => (
                    <button 
                      key={lang.code}
                      onClick={() => handleTranslateSection(sectionName, lang.code)}
                      className="w-full text-left px-3 py-2 text-[10px] font-bold text-[#004A74] hover:bg-gray-50 rounded-lg transition-all flex items-center justify-between"
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div 
      className={`fixed top-0 right-0 bottom-0 z-[1000] bg-white flex flex-col will-change-transform overflow-hidden transition-all border-l border-gray-100 ${
        isMobileSidebarOpen ? 'blur-[15px] opacity-40 pointer-events-none scale-[0.98]' : ''
      } ${
        wasOpenedViaExternalRef.current 
          ? 'animate-in fade-in duration-200' 
          : 'animate-in fade-in zoom-in-95 slide-in-from-bottom-10 duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]'
      }`}
      style={{ 
        left: 'var(--sidebar-offset, 0px)',
        transformStyle: 'preserve-3d',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden'
      }}
    >
      {showCiteModal && <CitationModal item={currentItem} onClose={() => setShowCiteModal(false)} />}
      {showTips && <TipsModal tips={currentItem.quickTipsForYou || ""} onClose={() => setShowTips(false)} />}
      {isShareModalOpen && (
        <SharboxWorkflowModal 
          initialItem={currentItem} 
          onClose={() => setIsShareModalOpen(false)} 
        />
      )}
      {isTracerPickerOpen && (
        <TracerProjectPicker 
          item={currentItem} 
          onClose={() => setIsTracerPickerOpen(false)} 
        />
      )}
      {isTeachingPickerOpen && (
        <TeachingSessionPicker 
          item={currentItem} 
          onClose={() => setIsTeachingPickerOpen(false)} 
        />
      )}
      
      {/* INTEGRATION: Content Manager Modal */}
      {isContentManagerOpen && (
        <ContentManagerModal 
          item={currentItem} 
          onClose={() => setIsContentManagerOpen(false)} 
          onSuccess={(updatedItem) => {
            // Update local state to reflect changes instantly (e.g. enabling Insight button)
            setCurrentItem(updatedItem);
            // Notify parent if callback exists
            if (onUpdateOptimistic) onUpdateOptimistic(updatedItem);
          }} 
        />
      )}
      
      {/* 1. STICKY TOP AREA: MAINTAIN APP HEADER */}
      <div className="sticky top-0 z-[90] bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <div className="px-4 md:px-8">
           <Header 
            searchQuery={dummySearch} 
            setSearchQuery={setDummySearch} 
            onRefresh={onRefresh}
           />
        </div>

        {/* 2. DETAIL NAVIGATION BAR */}
        {(!showPresentations && !showQuestions && !showConsultations && !showNotebook) && (
          <nav className="px-4 md:px-8 py-3 flex items-center justify-between border-t border-gray-50/50">
            <button onClick={handleBack} className="flex items-center gap-2 text-[#004A74] font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 px-3 py-2 rounded-xl transition-all">
              <ArrowLeftIcon className="w-4 h-4 stroke-[3]" /> Back
            </button>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowCiteModal(true)}
                className="flex items-center gap-2 px-5 py-2 bg-[#FED400] text-[#004A74] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                Cite
              </button>
              
              {hasViewLink && (
                <div className="relative group">
                  <button 
                    onClick={handleViewCollection}
                    className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-xl transition-all outline-none"
                  >
                    <EyeIcon className="w-5 h-5 stroke-[2.5]" />
                  </button>
                  <MiniTooltip text="View Document" />
                </div>
              )}

              <div className="relative group">
                <button 
                  onClick={() => handleToggleAction('isBookmarked')}
                  className="p-2 text-[#004A74] hover:bg-[#004A74]/5 rounded-xl transition-all outline-none"
                >
                  {isBookmarked ? <BookmarkSolid className="w-5 h-5 text-[#004A74]" /> : <BookmarkIcon className="w-5 h-5 stroke-[2.5]" />}
                </button>
                <MiniTooltip text={isBookmarked ? "Unbookmark" : "Bookmark"} />
              </div>

              <div className="relative group">
                <button 
                  onClick={() => handleToggleAction('isFavorite')}
                  className="p-2 text-[#FED400] hover:bg-[#FED400]/10 rounded-xl transition-all outline-none"
                >
                  {isFavorite ? <StarSolid className="w-5 h-5 text-[#FED400]" /> : <StarIcon className="w-5 h-5 stroke-[2.5]" />}
                </button>
                <MiniTooltip text={isFavorite ? "Remove from Favorites" : "Add to Favorites"} />
              </div>
              
              <div className="relative" ref={menuRef}>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-[#004A74] hover:bg-gray-50 rounded-xl transition-all"><EllipsisVerticalIcon className="w-5 h-5 stroke-[2.5]" /></button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-2 z-[90] animate-in fade-in zoom-in-95">
                    <button onClick={handleUpdate} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-[#004A74] hover:text-white rounded-xl transition-all">
                      <PencilIcon className="w-4 h-4" /> Update
                    </button>
                    {/* NEW BUTTON: Manage Content Source Removed from Dropdown */}
                    
                    <button 
                      onClick={() => { if(hasContent) { setShowPresentations(true); setIsMenuOpen(false); } }} 
                      disabled={!hasContent}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 rounded-xl transition-all ${hasContent ? 'hover:bg-[#004A74] hover:text-white' : 'opacity-50 cursor-not-allowed bg-gray-50'}`}
                    >
                      <Presentation className="w-4 h-4" /> Presentation
                    </button>
                    <button 
                      onClick={() => { if(hasContent) { setShowQuestions(true); setIsMenuOpen(false); } }} 
                      disabled={!hasContent}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 rounded-xl transition-all ${hasContent ? 'hover:bg-[#004A74] hover:text-white' : 'opacity-50 cursor-not-allowed bg-gray-50'}`}
                    >
                      <ListTodo className="w-4 h-4" /> Question Bank
                    </button>
                    <button 
                      onClick={() => { if(hasContent) { setShowConsultations(true); setIsMenuOpen(false); } }} 
                      disabled={!hasContent}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 rounded-xl transition-all ${hasContent ? 'hover:bg-[#004A74] hover:text-white' : 'opacity-50 cursor-not-allowed bg-gray-50'}`}
                    >
                      <ChatBubbleLeftRightIcon className="w-4 h-4" /> Consultation
                    </button>
                    <button onClick={() => { setShowNotebook(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-[#004A74] hover:text-white rounded-xl transition-all">
                      <NotebookPen className="w-4 h-4" /> Note
                    </button>
                    <button 
                      onClick={() => { if(hasContent) { setIsTracerPickerOpen(true); setIsMenuOpen(false); } }} 
                      disabled={!hasContent}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 rounded-xl transition-all ${hasContent ? 'hover:bg-[#004A74] hover:text-white' : 'opacity-50 cursor-not-allowed bg-gray-50'}`}
                    >
                      <Target className="w-4 h-4" /> Tracer Attachment
                    </button>
                    <button onClick={() => { setIsTeachingPickerOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-[#004A74] hover:text-white rounded-xl transition-all"><Grip className="w-4 h-4" /> Teaching Attachment</button>
                    <button onClick={() => { setIsShareModalOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-[#004A74] hover:text-white rounded-xl transition-all"><ShareIcon className="w-4 h-4" /> Share</button>
                    <div className="h-px bg-gray-50 my-1 mx-2" />
                    <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-500 hover:bg-[#004A74] hover:text-white rounded-xl transition-all">
                      <TrashIcon className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>

      {/* 3. CONTENT AREA */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        {showPresentations ? (
          <RelatedPresentations 
            collection={currentItem} 
            onBack={() => setShowPresentations(false)} 
          />
        ) : showQuestions ? (
          <RelatedQuestion 
            collection={currentItem}
            onBack={() => setShowQuestions(false)}
          />
        ) : showConsultations ? (
          <ConsultationGallery 
            collection={currentItem}
            onBack={() => setShowConsultations(false)}
          />
        ) : showNotebook ? (
          <NotebookMain 
            collectionId={currentItem.id}
            onBackToLibrary={() => setShowNotebook(false)}
          />
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto px-5 md:px-10 py-6 space-y-4">
              
              <header className="bg-gray-50/50 p-6 md:p-10 rounded-[2.5rem] border border-gray-100 space-y-4 relative overflow-hidden">
                {isLoading && !isSyncing ? (
                  <div className="space-y-4">
                    <div className="flex gap-2"><div className="h-6 w-20 skeleton rounded-full"/><div className="h-6 w-20 skeleton rounded-full"/></div>
                    <div className="h-10 w-full skeleton rounded-2xl"/>
                    <div className="h-4 w-1/2 skeleton rounded-lg"/>
                    <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                       <div className="h-3 w-1/4 skeleton rounded-md"/>
                       <div className="h-3 w-1/3 skeleton rounded-md"/>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-3 py-1 bg-[#004A74] text-white text-[8px] font-black uppercase tracking-widest rounded-full">{currentItem.type}</span>
                      {currentItem.category && <span className="px-3 py-1 bg-[#004A74]/10 text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">{currentItem.category}</span>}
                      <span className="px-3 py-1 bg-[#FED400] text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">{currentItem.topic}</span>
                      {currentItem.subTopic && <span className="px-3 py-1 bg-[#004A74]/5 text-[#004A74] text-[8px] font-black uppercase tracking-widest rounded-full">{currentItem.subTopic}</span>}
                    </div>

                    <h1 className="text-xl md:text-2xl font-black text-[#004A74] leading-[1.2] break-words uppercase">{currentItem.title}</h1>
                    
                    <div className="flex flex-col gap-1">
                      {displayDate && <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{displayDate}</p>}
                      <p className="text-sm font-bold text-[#004A74]">{authorsText === 'N/A' ? 'Unknown' : authorsText}</p>
                    </div>

                    <div className="mt-4 md:mt-0 md:absolute md:bottom-4 md:right-8 transition-all flex flex-col md:flex-row items-start md:items-center gap-4">
                       {/* Source Button */}
                       <button 
                         onClick={() => setIsContentManagerOpen(true)}
                         className="flex items-center gap-2 px-5 py-2 bg-[#FED400] text-[#004A74] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
                       >
                         SOURCE
                       </button>

                       {/* Timestamps */}
                       <div className="flex flex-col items-start md:items-end gap-0.5 opacity-60">
                          <div className="flex items-center gap-1.5">
                             <ClockIcon className="w-2.5 h-2.5" />
                             <span className="text-[7px] font-black uppercase tracking-tighter">Created: {formatTimeMeta(currentItem.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                             <ArrowPathIcon className="w-2.5 h-2.5" />
                             <span className="text-[7px] font-black uppercase tracking-tighter">Updated: {formatTimeMeta(currentItem.updatedAt)}</span>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-gray-100">
                      {currentItem.publisher && (
                        <div className="flex items-start gap-4">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest w-20 shrink-0 mt-0.5">Publisher</span>
                          <p className="text-[11px] font-bold text-gray-600">{currentItem.publisher}</p>
                        </div>
                      )}
                      
                      {(pubInfo.journal || pubInfo.vol || pubInfo.issue || pubInfo.pages) && (
                        <div className="flex items-start gap-4">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest w-20 shrink-0 mt-0.5">Publication</span>
                          <p className="text-[11px] font-bold text-[#004A74]">
                            {[pubInfo.journal, pubInfo.vol ? `Vol. ${pubInfo.vol}` : '', pubInfo.issue ? `No. ${pubInfo.issue}` : '', pubInfo.pages ? `pp. ${pubInfo.pages}` : ''].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                      )}

                      {Object.values(identifiers).some(v => v) && (
                        <div className="flex items-start gap-4">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest w-20 shrink-0 mt-0.5">Identifiers</span>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            {identifiers.doi && <p className="text-[9px] font-mono font-bold text-gray-400 italic">DOI: {identifiers.doi}</p>}
                            {identifiers.issn && <p className="text-[9px] font-mono font-bold text-gray-400 italic">ISSN: {identifiers.issn}</p>}
                            {identifiers.isbn && <p className="text-[9px] font-mono font-bold text-gray-400 italic">ISBN: {identifiers.isbn}</p>}
                            {identifiers.pmid && <p className="text-[9px] font-mono font-bold text-gray-400 italic">PMID: {identifiers.pmid}</p>}
                            {identifiers.arxiv && <p className="text-[9px] font-mono font-bold text-gray-400 italic">arXiv: {identifiers.arxiv}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </header>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><HashtagIcon className="w-3 h-3" /> Keywords</h3>
                  {isLoading && !isSyncing ? <div className="h-10 w-full skeleton rounded-xl" /> : (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.keywords?.length > 0 ? tags.keywords.map((k: string) => <span key={k} className="px-2.5 py-1 bg-[#004A74]/5 border border-[#004A74]/10 rounded-lg text-[9px] font-bold text-[#004A74]">{k}</span>) : <p className="text-[9px] text-gray-300 italic">No keywords.</p>}
                    </div>
                  )}
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><TagIcon className="w-3 h-3" /> Labels</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.labels?.length > 0 ? tags.labels.map((l: string) => <span key={l} className="px-2.5 py-1 bg-[#FED400]/10 border border-[#FED400]/20 rounded-lg text-[9px] font-bold text-[#004A74]">{l}</span>) : <p className="text-[9px] text-gray-300 italic">No labels.</p>}
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><BookOpenIcon className="w-3.5 h-3.5" /> Abstract</h3>
                {isLoading && !isSyncing ? (
                   <div className="space-y-2"><div className="h-4 w-full skeleton rounded-md"/><div className="h-4 w-full skeleton rounded-md"/><div className="h-4 w-3/4 skeleton rounded-md"/></div>
                ) : (
                  <div className="text-sm leading-relaxed text-[#004A74] font-medium whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: currentItem.abstract || 'No abstract content found.' }} />
                )}
              </section>

              {currentItem.extractedJsonId && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-[#004A74] flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-[#004A74]" /> INSIGHTS
                  </h2>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleGenerateInsights}
                      disabled={isAnyLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-[#004A74] text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-[#004A74]/20 hover:scale-105 transition-all disabled:opacity-50"
                    >
                      {isGeneratingInsights ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <SparklesIcon className="w-3 h-3" />}
                      {isGeneratingInsights ? 'Analyzing...' : 'Generate'}
                    </button>
                    <button onClick={() => setShowTips(true)} className="p-2 bg-[#FED400] text-[#004A74] rounded-xl shadow-md hover:rotate-12 transition-all">
                      <LightBulbIcon className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3 md:col-span-2">
                    <SectionHeader 
                      label="Summary" 
                      icon={<ClipboardDocumentListIcon className="w-3.5 h-3.5" />} 
                      sectionName="summary"
                      hasContent={!!currentItem.summary}
                    />
                    {isAnyLoading || translatingSection === 'summary' ? (
                      <div className="space-y-3">
                        <div className="h-4 w-full skeleton rounded-md" />
                        <div className="h-4 w-full skeleton rounded-md" />
                        <div className="h-4 w-3/4 skeleton rounded-md" />
                      </div>
                    ) : (
                      <div 
                        id="section-container-summary"
                        className="text-sm leading-relaxed text-[#004A74] font-medium transition-all cursor-text select-text" 
                        onMouseUp={() => handleTextSelection('summary')}
                        onMouseOver={handleContainerMouseOver}
                        onMouseOut={handleContainerMouseOut}
                        onClick={handleContainerClick}
                        dangerouslySetInnerHTML={{ __html: currentItem.summary || 'Summary pending analysis.' }} 
                      />
                    )}
                  </div>

                  <div className="bg-green-50 p-6 rounded-[2.5rem] border border-green-100/50 shadow-sm space-y-4">
                    <SectionHeader 
                      label="Strengths" 
                      icon={<ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />} 
                      sectionName="strength"
                      hasContent={!!currentItem.strength}
                    />
                    {translatingSection === 'strength' ? (
                      <div className="h-20 w-full skeleton rounded-xl" />
                    ) : (
                      <div 
                        id="section-container-strength"
                        onMouseUp={() => handleTextSelection('strength')}
                        onMouseOver={handleContainerMouseOver}
                        onMouseOut={handleContainerMouseOut}
                        onClick={handleContainerClick}
                        className="transition-all cursor-text select-text"
                      >
                        <ElegantList text={currentItem.strength} isLoading={isAnyLoading} />
                      </div>
                    )}
                  </div>

                  <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100/50 shadow-sm space-y-4">
                    <SectionHeader 
                      label="Weaknesses" 
                      icon={<ExclamationTriangleIcon className="w-3.5 h-3.5" />} 
                      sectionName="weakness"
                      hasContent={!!currentItem.weakness}
                    />
                    {translatingSection === 'weakness' ? (
                      <div className="h-20 w-full skeleton rounded-xl" />
                    ) : (
                      <div 
                        id="section-container-weakness"
                        onMouseUp={() => handleTextSelection('weakness')}
                        onMouseOver={handleContainerMouseOver}
                        onMouseOut={handleContainerMouseOut}
                        onClick={handleContainerClick}
                        className="transition-all cursor-text select-text"
                      >
                        <ElegantList text={currentItem.weakness} isLoading={isAnyLoading} />
                      </div>
                    )}
                  </div>

                  <div className="bg-[#004A74]/5 p-6 rounded-[2.5rem] border border-[#004A74]/10 shadow-sm space-y-3 md:col-span-2">
                    <SectionHeader 
                      label="Unfamiliar Terminology" 
                      icon={<ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5" />} 
                      sectionName="unfamiliarTerminology"
                      hasContent={!!(currentItem.unfamiliarTerminology || currentItem.quickTipsForYou)}
                    />
                    {translatingSection === 'unfamiliarTerminology' ? (
                      <div className="h-20 w-full skeleton rounded-xl" />
                    ) : (
                      <ElegantList text={currentItem.unfamiliarTerminology || currentItem.quickTipsForYou} isLoading={isAnyLoading} />
                    )}
                  </div>
                </div>
              </section>
              )}

              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                <div className="space-y-4">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <LinkIcon className="w-3.5 h-3.5" /> Supporting References
                  </h3>
                  <div className="space-y-3">
                    {isLoading && !isSyncing ? [...Array(2)].map((_, i) => <div key={i} className="h-20 w-full skeleton rounded-3xl" />) : (
                      supportingData.references?.length > 0 ? supportingData.references.map((ref: string, idx: number) => {
                        const urlMatch = ref.match(/https?:\/\/[^\s<]+/);
                        let url = urlMatch ? urlMatch[0].replace(/[.,;)]+$/, '') : null;
                        if (url) {
                          url = url.replace(/['"]/g, ''); // Fix: Clean URL from trailing quotes
                        }
                        return (
                          <div key={idx} className="bg-white p-5 rounded-3xl border border-gray-100 flex flex-col gap-3 transition-all hover:bg-[#004A74]/5 group">
                            <div className="flex gap-3">
                              <span className="shrink-0 w-6 h-6 rounded-full bg-[#004A74] text-[#FED400] text-[10px] font-black flex items-center justify-center shadow-sm">{idx+1}</span>
                              <p className="text-[10px] font-bold text-[#004A74]/80 leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: ref }} />
                            </div>
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => handleCopy(e, ref.replace(/<[^>]*>/g, ''))} className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#004A74] rounded-lg border border-gray-100 text-[8px] font-black uppercase tracking-tight shadow-sm hover:bg-[#FED400] transition-all"><DocumentDuplicateIcon className="w-3 h-3" /> Copy</button>
                              {url && <button onClick={() => handleOpenLink(url)} className="flex items-center gap-2 px-3 py-1.5 bg-[#004A74] text-white rounded-lg text-[8px] font-black uppercase tracking-tight shadow-sm hover:scale-105 transition-all"><ArrowTopRightOnSquareIcon className="w-3 h-3" /> Visit</button>}
                            </div>
                          </div>
                        );
                      }) : <p className="text-[10px] font-bold text-gray-300 uppercase italic">No supporting references found.</p>
                    )}
                  </div>
                </div>

                <div className="bg-[#004A74] p-8 rounded-[3rem] text-white space-y-6 flex flex-col">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><MonitorPlay className="w-4 h-4" /> Video Recommendation</h3>
                    {(currentItem.youtubeId || supportingData.videoUrl) && (
                      <div className="flex items-center gap-2">
                        <button onClick={handleReplaceVideo} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Replace Video">
                          <ArrowPathIcon className="w-4 h-4 stroke-[2.5]" />
                        </button>
                        <button onClick={handleDeleteVideo} className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="Remove Video">
                          <TrashIcon className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    {currentItem.youtubeId || supportingData.videoUrl ? (
                      <div className="aspect-video rounded-[2rem] overflow-hidden bg-black shadow-2xl border-4 border-white/10">
                        <iframe className="w-full h-full" src={currentItem.youtubeId || supportingData.videoUrl} frameBorder="0" allowFullScreen></iframe>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-[2rem] bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center space-y-4">
                        <VideoCameraIcon className="w-12 h-12 text-white/10" />
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Video unavailable</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-[#FED400]/80 font-bold italic text-center px-4">"Please check the recommended video, as it might not be perfectly relevant"</p>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
      {hoveredNote && (
        <div 
          className="fixed pointer-events-none bg-[#004A74] text-[#FED400] text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl z-[9999] max-w-sm break-words -translate-x-1/2 -translate-y-full flex items-center gap-1.5 font-sans animate-in fade-in duration-100"
          style={{ left: hoveredNote.x, top: hoveredNote.y }}
        >
          <StickyNote className="w-3.5 h-3.5" />
          <span>{hoveredNote.text}</span>
        </div>
      )}
      {selectionState && (
        <SelectionPopover
          state={selectionState}
          onClose={() => {
            window.getSelection()?.removeAllRanges();
            setSelectionState(null);
          }}
          onApply={handleApplyHighlight}
        />
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 74, 116, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 74, 116, 0.2); }
      `}</style>
    </div>
  );
};

export default LibraryDetailView;
