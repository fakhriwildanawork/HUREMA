import React, { useState, useEffect } from 'react';
import { X, LayoutDashboard, Users, MapPin, CalendarClock, Files, Settings, Database, Fingerprint, Timer, ClipboardCheck } from 'lucide-react';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import LocationMain from './modules/location/LocationMain';
import AccountMain from './modules/account/AccountMain';
import ScheduleMain from './modules/schedule/ScheduleMain';
import DocumentMain from './modules/document/DocumentMain';
import PresenceMain from './modules/presence/PresenceMain';
import OvertimeMain from './modules/overtime/OvertimeMain';
import SubmissionMain from './modules/submission/SubmissionMain';
import MasterMain from './modules/settings/MasterMain';
import Login from './modules/auth/Login';
import { authService } from './services/authService';
import { AuthUser } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'location' | 'account' | 'schedule' | 'document' | 'settings' | 'presence' | 'overtime' | 'submission' | 'master_app'>('presence');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setIsAuthChecking(false);
  }, []);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-[#006E62] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  const NavItemMobile = ({ id, icon: Icon, label, indent = false }: { id: any, icon: any, label: string, indent?: boolean }) => (
    <button
      onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
      className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 w-full mb-1 ${
        activeTab === id 
          ? 'bg-[#006E62] text-white shadow-md' 
          : 'text-gray-600 hover:bg-gray-100'
      } ${indent ? 'ml-4 w-[calc(100%-1rem)]' : ''}`}
    >
      <Icon size={20} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex bg-white text-gray-800">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
      />

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      {/* Sidebar Mobile */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#006E62] rounded flex items-center justify-center text-white font-bold italic">H</div>
              <h1 className="text-xl font-bold text-[#006E62]">HUREMA</h1>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)}><X size={24} className="text-gray-400" /></button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-none">
            <NavItemMobile id="dashboard" icon={LayoutDashboard} label="Beranda" />
            
            <div className="flex items-center gap-3 px-4 py-3 text-gray-400 mt-2">
              <Database size={20} />
              <span className="font-bold text-[10px] uppercase tracking-widest">Master</span>
            </div>
            <NavItemMobile id="master_app" icon={Database} label="Master Aplikasi" indent />
            <NavItemMobile id="location" icon={MapPin} label="Data Lokasi" indent />
            <NavItemMobile id="schedule" icon={CalendarClock} label="Manajemen Jadwal" indent />
            <NavItemMobile id="account" icon={Users} label="Akun" indent />

            <div className="mt-4">
              <NavItemMobile id="presence" icon={Fingerprint} label="Presensi Reguler" />
              <NavItemMobile id="overtime" icon={Timer} label="Presensi Lembur" />
              <NavItemMobile id="submission" icon={ClipboardCheck} label="Pengajuan" />
              <NavItemMobile id="document" icon={Files} label="Dokumen Digital" />
              <NavItemMobile id="settings" icon={Settings} label="Pengaturan" />
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        <Header activeTab={activeTab} onMenuClick={() => setIsMobileMenuOpen(true)} user={user} />

        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
          {activeTab === 'location' ? (
            <LocationMain />
          ) : activeTab === 'account' ? (
            <AccountMain />
          ) : activeTab === 'schedule' ? (
            <ScheduleMain />
          ) : activeTab === 'document' ? (
            <DocumentMain />
          ) : activeTab === 'presence' ? (
            <PresenceMain />
          ) : activeTab === 'overtime' ? (
            <OvertimeMain />
          ) : activeTab === 'submission' ? (
            <SubmissionMain />
          ) : activeTab === 'master_app' ? (
            <MasterMain />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <p className="font-medium text-sm">Modul "{activeTab}" sedang dalam pengembangan.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;