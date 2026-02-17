
import React, { useState } from 'react';
import { 
  MapPin, LayoutDashboard, Settings, Users, 
  CalendarClock, Files, ChevronDown, ChevronRight, 
  Menu as MenuIcon, ChevronLeft, Database, Fingerprint, LogOut 
} from 'lucide-react';
import { authService } from '../../services/authService';
import Swal from 'sweetalert2';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed }) => {
  const [isMasterOpen, setIsMasterOpen] = useState(true);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Logout?',
      text: "Anda harus masuk kembali untuk mengakses data.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#006E62',
      confirmButtonText: 'Ya, Keluar'
    });

    if (result.isConfirmed) {
      authService.logout();
    }
  };

  const NavItem = ({ id, icon: Icon, label, indent = false }: { id: any, icon: any, label: string, indent?: boolean }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 w-full mb-1 ${
        activeTab === id 
          ? 'bg-[#006E62] text-white shadow-md' 
          : 'text-gray-600 hover:bg-gray-100'
      } ${indent && !isCollapsed ? 'ml-4 w-[calc(100%-1rem)]' : ''}`}
      title={isCollapsed ? label : ''}
    >
      <Icon size={20} className="shrink-0" />
      {!isCollapsed && <span className="font-medium text-sm truncate">{label}</span>}
    </button>
  );

  return (
    <aside 
      className={`hidden md:flex flex-col border-r border-gray-100 bg-white sticky top-0 h-screen transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 mb-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 bg-[#006E62] rounded flex items-center justify-center text-white font-bold italic shrink-0">H</div>
            <h1 className="text-xl font-bold tracking-tight text-[#006E62] truncate">HUREMA</h1>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-[#006E62] rounded flex items-center justify-center text-white font-bold italic mx-auto">H</div>
        )}
      </div>
      
      <nav className="flex-1 px-3 overflow-y-auto scrollbar-none">
        <NavItem id="dashboard" icon={LayoutDashboard} label="Beranda" />
        
        {/* Master Menu Group */}
        <div className="mt-4">
          <button 
            onClick={() => setIsMasterOpen(!isMasterOpen)}
            className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 w-full mb-1 text-gray-600 hover:bg-gray-100`}
            title={isCollapsed ? 'Master' : ''}
          >
            <Database size={20} className="shrink-0 text-gray-400" />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1 overflow-hidden">
                <span className="font-medium text-sm truncate">Master</span>
                {isMasterOpen ? <ChevronDown size={16} className="text-gray-300" /> : <ChevronRight size={16} className="text-gray-300" />}
              </div>
            )}
          </button>
          
          {(isMasterOpen || isCollapsed) && (
            <div className={`mt-1 overflow-hidden transition-all duration-300 ${isCollapsed ? '' : 'max-h-96'}`}>
              <NavItem id="location" icon={MapPin} label="Data Lokasi" indent />
              <NavItem id="schedule" icon={CalendarClock} label="Manajemen Jadwal" indent />
              <NavItem id="account" icon={Users} label="Akun" indent />
            </div>
          )}
        </div>

        <div className="mt-4">
          <NavItem id="presence" icon={Fingerprint} label="Presensi Reguler" />
          <NavItem id="document" icon={Files} label="Dokumen Digital" />
          <NavItem id="settings" icon={Settings} label="Pengaturan" />
        </div>
      </nav>

      <div className="p-4 border-t border-gray-50 space-y-2">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-md transition-all font-medium text-sm"
          title={isCollapsed ? 'Keluar' : ''}
        >
          <LogOut size={20} className="shrink-0" />
          {!isCollapsed && <span>Keluar</span>}
        </button>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 text-gray-400 hover:bg-gray-100 rounded-md transition-all"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
