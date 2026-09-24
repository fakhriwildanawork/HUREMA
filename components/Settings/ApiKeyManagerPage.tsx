import React, { useState, useEffect, useCallback } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { 
  Key, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { 
  fetchApiKeysFromSupabase, 
  upsertApiKeyToSupabase, 
  deleteApiKeyFromSupabase 
} from '../../services/ApiKeySupabaseService';
import { showXeenapsToast } from '../../utils/toastUtils';
import { showXeenapsDeleteConfirm } from '../../utils/confirmUtils';
import { StandardTableContainer, StandardTableWrapper, StandardTh, StandardTr, StandardTd } from '../Common/TableComponents';
import { FormPageContainer, FormStickyHeader, FormContentArea } from '../Common/FormComponents';

interface KeyItem {
  id: string;
  key: string;
  label?: string;
  status: string;
  addedAt?: string;
}

const ApiKeyManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'GEMINI' | 'GROQ' | 'GLM' | 'OPENROUTER'>('GEMINI');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Data States
  const [geminiKeys, setGeminiKeys] = useState<KeyItem[]>([]);
  const [groqKeys, setGroqKeys] = useState<KeyItem[]>([]);
  const [glmKeys, setGlmKeys] = useState<KeyItem[]>([]);
  const [openRouterKeys, setOpenRouterKeys] = useState<KeyItem[]>([]);

  // Form States
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const loadKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      // 100% Direct from Supabase
      const [supaGemini, supaGroq, supaGlm, supaOpenRouter] = await Promise.all([
        fetchApiKeysFromSupabase('gemini'),
        fetchApiKeysFromSupabase('groq'),
        fetchApiKeysFromSupabase('glm'),
        fetchApiKeysFromSupabase('openrouter')
      ]);

      setGeminiKeys(supaGemini.map(k => ({
        id: k.id,
        key: k.key_value,
        label: k.label || 'Gemini Key',
        status: k.is_active !== false ? 'Active' : 'Inactive',
        addedAt: k.created_at || new Date().toISOString()
      })));

      setGroqKeys(supaGroq.map(k => ({
        id: k.id,
        key: k.key_value,
        label: k.label || 'Groq Key',
        status: k.is_active !== false ? 'Active' : 'Inactive',
        addedAt: k.created_at || new Date().toISOString()
      })));

      setGlmKeys(supaGlm.map(k => ({
        id: k.id,
        key: k.key_value,
        label: k.label || 'GLM Key',
        status: k.is_active !== false ? 'Active' : 'Inactive',
        addedAt: k.created_at || new Date().toISOString()
      })));

      setOpenRouterKeys(supaOpenRouter.map(k => ({
        id: k.id,
        key: k.key_value,
        label: k.label || 'OpenRouter Key',
        status: k.is_active !== false ? 'Active' : 'Inactive',
        addedAt: k.created_at || new Date().toISOString()
      })));
    } catch (e) {
      console.error('Failed to load keys from Supabase:', e);
      showXeenapsToast('error', 'Failed to load keys from Supabase');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const toggleMask = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderMaskedKey = (key: string, id: string) => {
    if (showKeys[id]) return <span className="font-mono text-[#004A74]">{key}</span>;
    if (!key) return <span className="text-gray-300 italic">No Key</span>;
    const start = key.substring(0, 8);
    const end = key.substring(key.length - 4);
    return <span className="font-mono text-gray-400">{start}••••••••{end}</span>;
  };

  const handleAddKey = async (provider: 'gemini' | 'groq' | 'glm' | 'openrouter', defaultLabel: string) => {
    if (!newKey.trim()) return;
    setIsProcessing(true);
    const keyId = crypto.randomUUID();
    const supaSuccess = await upsertApiKeyToSupabase({ 
      id: keyId, 
      provider, 
      key_value: newKey.trim(), 
      label: newLabel.trim() || defaultLabel
    });

    if (supaSuccess) {
      showXeenapsToast('success', `${provider.toUpperCase()} Key Added`);
      setNewKey('');
      setNewLabel('');
      await loadKeys();
    } else {
      showXeenapsToast('error', 'Failed to save key in Supabase');
    }
    setIsProcessing(false);
  };

  const handleDeleteKey = async (id: string, provider: string) => {
    if (await showXeenapsDeleteConfirm(1)) {
      setIsProcessing(true);
      const supaSuccess = await deleteApiKeyFromSupabase(id, provider);

      if (supaSuccess) {
        showXeenapsToast('success', 'Key Deleted');
        await loadKeys();
      } else {
        showXeenapsToast('error', 'Delete Failed');
      }
      setIsProcessing(false);
    }
  };

  return (
    <FormPageContainer>
      <FormStickyHeader 
        title="API Key Management" 
        subtitle="Manage secure access credentials" 
        onBack={() => navigate('/settings')} 
      />

      <FormContentArea>
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
           
           {/* TABS */}
           <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1 shrink-0 w-full md:w-auto self-start overflow-x-auto">
              {[
                { key: 'GEMINI', label: 'Gemini' },
                { key: 'GROQ', label: 'Groq' },
                { key: 'GLM', label: 'GLM' },
                { key: 'OPENROUTER', label: 'OpenRouter' }
              ].map(tab => (
                <button 
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key as any); setNewKey(''); setNewLabel(''); }}
                  className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.key ? 'bg-[#004A74] text-white shadow-md' : 'text-gray-400 hover:text-[#004A74] hover:bg-white'}`}
                >
                  {tab.label}
                </button>
              ))}
           </div>

           {/* CONTENT AREA */}
           <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm min-h-[350px]">
              
              {/* GEMINI SECTION */}
              {activeTab === 'GEMINI' && (
                <div className="space-y-8">
                   <div className="bg-[#004A74]/5 p-6 rounded-3xl border border-[#004A74]/10 flex flex-col md:flex-row items-end gap-4">
                      <div className="flex-1 w-full space-y-4">
                         <h4 className="text-[10px] font-black text-[#004A74] uppercase tracking-widest flex items-center gap-2">
                           <Key size={14} /> Add New Gemini Key
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input 
                              placeholder="Label (e.g. Primary Key)" 
                              className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-[#004A74] outline-none focus:ring-2 focus:ring-[#004A74]/20"
                              value={newLabel}
                              onChange={e => setNewLabel(e.target.value)}
                            />
                            <input 
                              placeholder="Paste Gemini API Key (AIzaSy...)" 
                              className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-xs font-mono text-[#004A74] outline-none focus:ring-2 focus:ring-[#004A74]/20"
                              value={newKey}
                              onChange={e => setNewKey(e.target.value)}
                            />
                         </div>
                      </div>
                      <button 
                        onClick={() => handleAddKey('gemini', 'Gemini Key')}
                        disabled={isProcessing || !newKey}
                        className="w-full md:w-auto px-8 py-3 bg-[#004A74] text-[#FED400] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />} Register
                      </button>
                   </div>

                   <StandardTableContainer>
                      <StandardTableWrapper>
                         <thead className="bg-gray-50">
                            <tr>
                               <StandardTh>Label</StandardTh>
                               <StandardTh>Masked Key</StandardTh>
                               <StandardTh>Status</StandardTh>
                               <StandardTh className="text-center">Action</StandardTh>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                               <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#004A74]" /></td></tr>
                            ) : geminiKeys.length === 0 ? (
                               <tr><td colSpan={4} className="p-12 text-center opacity-30 text-xs font-bold uppercase tracking-widest">No Gemini keys registered in Supabase</td></tr>
                            ) : (
                               geminiKeys.map(k => (
                                 <StandardTr key={k.id}>
                                    <StandardTd className="font-bold text-[#004A74]">{k.label}</StandardTd>
                                    <StandardTd>
                                       <div className="flex items-center gap-3">
                                          {renderMaskedKey(k.key, k.id)}
                                          <button onClick={() => toggleMask(k.id)} className="text-gray-400 hover:text-[#004A74] transition-colors">
                                             {showKeys[k.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                          </button>
                                       </div>
                                    </StandardTd>
                                    <StandardTd>
                                       <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[8px] font-black uppercase tracking-widest">Active</span>
                                    </StandardTd>
                                    <StandardTd className="text-center">
                                       <button onClick={() => handleDeleteKey(k.id, 'gemini')} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                          <Trash2 size={14} />
                                       </button>
                                    </StandardTd>
                                 </StandardTr>
                               ))
                            )}
                         </tbody>
                      </StandardTableWrapper>
                   </StandardTableContainer>
                </div>
              )}

              {/* GROQ SECTION */}
              {activeTab === 'GROQ' && (
                <div className="space-y-8">
                   <div className="bg-[#FED400]/10 p-6 rounded-3xl border border-[#FED400]/20 flex flex-col md:flex-row items-end gap-4">
                      <div className="flex-1 w-full space-y-4">
                         <h4 className="text-[10px] font-black text-[#004A74] uppercase tracking-widest flex items-center gap-2">
                           <Key size={14} /> Add New Groq Key
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input 
                              placeholder="Label (e.g. Primary Groq)" 
                              className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-[#004A74] outline-none focus:ring-2 focus:ring-[#FED400]/40"
                              value={newLabel}
                              onChange={e => setNewLabel(e.target.value)}
                            />
                            <input 
                              placeholder="gsk_..." 
                              className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-xs font-mono text-[#004A74] outline-none focus:ring-2 focus:ring-[#FED400]/40"
                              value={newKey}
                              onChange={e => setNewKey(e.target.value)}
                            />
                         </div>
                      </div>
                      <button 
                        onClick={() => handleAddKey('groq', 'Groq Key')}
                        disabled={isProcessing || !newKey}
                        className="w-full md:w-auto px-8 py-3 bg-[#004A74] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />} Register
                      </button>
                   </div>

                   <StandardTableContainer>
                      <StandardTableWrapper>
                         <thead className="bg-gray-50">
                            <tr>
                               <StandardTh>Label</StandardTh>
                               <StandardTh>Masked API Key</StandardTh>
                               <StandardTh>Status</StandardTh>
                               <StandardTh className="text-center">Action</StandardTh>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                               <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#004A74]" /></td></tr>
                            ) : groqKeys.length === 0 ? (
                               <tr><td colSpan={4} className="p-12 text-center opacity-30 text-xs font-bold uppercase tracking-widest">No Groq keys registered in Supabase</td></tr>
                            ) : (
                               groqKeys.map(k => (
                                 <StandardTr key={k.id}>
                                    <StandardTd className="font-bold text-[#004A74]">{k.label}</StandardTd>
                                    <StandardTd>
                                       <div className="flex items-center gap-3">
                                          {renderMaskedKey(k.key, k.id)}
                                          <button onClick={() => toggleMask(k.id)} className="text-gray-400 hover:text-[#004A74] transition-colors">
                                             {showKeys[k.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                          </button>
                                       </div>
                                    </StandardTd>
                                    <StandardTd>
                                       <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[8px] font-black uppercase tracking-widest">Active</span>
                                    </StandardTd>
                                    <StandardTd className="text-center">
                                       <button onClick={() => handleDeleteKey(k.id, 'groq')} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                          <Trash2 size={14} />
                                       </button>
                                    </StandardTd>
                                 </StandardTr>
                               ))
                            )}
                         </tbody>
                      </StandardTableWrapper>
                   </StandardTableContainer>
                </div>
              )}

              {/* GLM SECTION */}
              {activeTab === 'GLM' && (
                <div className="space-y-8">
                   <div className="bg-[#004A74]/5 p-6 rounded-3xl border border-[#004A74]/10 flex flex-col md:flex-row items-end gap-4">
                      <div className="flex-1 w-full space-y-4">
                         <h4 className="text-[10px] font-black text-[#004A74] uppercase tracking-widest flex items-center gap-2">
                           <Key size={14} /> Add GLM (Zhipu AI) Key
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input 
                              placeholder="Label (e.g. Personal GLM)" 
                              className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-[#004A74] outline-none focus:ring-2 focus:ring-[#004A74]/20"
                              value={newLabel}
                              onChange={e => setNewLabel(e.target.value)}
                            />
                            <input 
                              placeholder="Paste GLM API Key..." 
                              className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-xs font-mono text-[#004A74] outline-none focus:ring-2 focus:ring-[#004A74]/20"
                              value={newKey}
                              onChange={e => setNewKey(e.target.value)}
                            />
                         </div>
                      </div>
                      <button 
                        onClick={() => handleAddKey('glm', 'GLM Key')}
                        disabled={isProcessing || !newKey}
                        className="w-full md:w-auto px-8 py-3 bg-[#004A74] text-[#FED400] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />} Register
                      </button>
                   </div>

                   <StandardTableContainer>
                      <StandardTableWrapper>
                         <thead className="bg-gray-50">
                            <tr>
                               <StandardTh>Label</StandardTh>
                               <StandardTh>Masked Key</StandardTh>
                               <StandardTh>Status</StandardTh>
                               <StandardTh className="text-center">Action</StandardTh>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                               <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#004A74]" /></td></tr>
                            ) : glmKeys.length === 0 ? (
                               <tr><td colSpan={4} className="p-12 text-center opacity-30 text-xs font-bold uppercase tracking-widest">No GLM keys registered in Supabase</td></tr>
                            ) : (
                               glmKeys.map(k => (
                                 <StandardTr key={k.id}>
                                    <StandardTd className="font-bold text-[#004A74]">{k.label}</StandardTd>
                                    <StandardTd>
                                       <div className="flex items-center gap-3">
                                          {renderMaskedKey(k.key, k.id)}
                                          <button onClick={() => toggleMask(k.id)} className="text-gray-400 hover:text-[#004A74] transition-colors">
                                             {showKeys[k.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                          </button>
                                       </div>
                                    </StandardTd>
                                    <StandardTd>
                                       <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[8px] font-black uppercase tracking-widest">Active</span>
                                    </StandardTd>
                                    <StandardTd className="text-center">
                                       <button onClick={() => handleDeleteKey(k.id, 'glm')} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                          <Trash2 size={14} />
                                       </button>
                                    </StandardTd>
                                 </StandardTr>
                               ))
                            )}
                         </tbody>
                      </StandardTableWrapper>
                   </StandardTableContainer>
                </div>
              )}

              {/* OPENROUTER SECTION */}
              {activeTab === 'OPENROUTER' && (
                <div className="space-y-8">
                   <div className="bg-[#004A74]/5 p-6 rounded-3xl border border-[#004A74]/10 flex flex-col md:flex-row items-end gap-4">
                      <div className="flex-1 w-full space-y-4">
                         <h4 className="text-[10px] font-black text-[#004A74] uppercase tracking-widest flex items-center gap-2">
                           <Key size={14} /> Add OpenRouter Key
                         </h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input 
                              placeholder="Label (e.g. Free Tier Key)" 
                              className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-[#004A74] outline-none focus:ring-2 focus:ring-[#004A74]/20"
                              value={newLabel}
                              onChange={e => setNewLabel(e.target.value)}
                            />
                            <input 
                              placeholder="sk-or-v1-..." 
                              className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-xs font-mono text-[#004A74] outline-none focus:ring-2 focus:ring-[#004A74]/20"
                              value={newKey}
                              onChange={e => setNewKey(e.target.value)}
                            />
                         </div>
                      </div>
                      <button 
                        onClick={() => handleAddKey('openrouter', 'OpenRouter Key')}
                        disabled={isProcessing || !newKey}
                        className="w-full md:w-auto px-8 py-3 bg-[#004A74] text-[#FED400] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />} Register
                      </button>
                   </div>

                   <StandardTableContainer>
                      <StandardTableWrapper>
                         <thead className="bg-gray-50">
                            <tr>
                               <StandardTh>Label</StandardTh>
                               <StandardTh>Masked Key</StandardTh>
                               <StandardTh>Status</StandardTh>
                               <StandardTh className="text-center">Action</StandardTh>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                               <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#004A74]" /></td></tr>
                            ) : openRouterKeys.length === 0 ? (
                               <tr><td colSpan={4} className="p-12 text-center opacity-30 text-xs font-bold uppercase tracking-widest">No OpenRouter keys registered in Supabase</td></tr>
                            ) : (
                               openRouterKeys.map(k => (
                                 <StandardTr key={k.id}>
                                    <StandardTd className="font-bold text-[#004A74]">{k.label}</StandardTd>
                                    <StandardTd>
                                       <div className="flex items-center gap-3">
                                          {renderMaskedKey(k.key, k.id)}
                                          <button onClick={() => toggleMask(k.id)} className="text-gray-400 hover:text-[#004A74] transition-colors">
                                             {showKeys[k.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                          </button>
                                       </div>
                                    </StandardTd>
                                    <StandardTd>
                                       <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[8px] font-black uppercase tracking-widest">Active</span>
                                    </StandardTd>
                                    <StandardTd className="text-center">
                                       <button onClick={() => handleDeleteKey(k.id, 'openrouter')} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                          <Trash2 size={14} />
                                       </button>
                                    </StandardTd>
                                 </StandardTr>
                               ))
                            )}
                         </tbody>
                      </StandardTableWrapper>
                   </StandardTableContainer>
                </div>
              )}

           </div>

           {/* Security Footer */}
           <div className="flex items-center justify-center gap-2 opacity-40">
              <AlertTriangle size={12} className="text-[#004A74]" />
              <p className="text-[9px] font-black text-[#004A74] uppercase tracking-[0.2em]">Keys are stored securely in Supabase</p>
           </div>

        </div>
      </FormContentArea>
    </FormPageContainer>
  );
};

export default ApiKeyManagerPage;
