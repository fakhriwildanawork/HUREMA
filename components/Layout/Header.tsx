
import React from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onMenuClick }) => {
  const getPageTitle = () => {
    switch (activeTab) {
      case 'location': return 'Manajemen Lokasi';
      case 'account': return 'Manajemen Akun';
      case 'schedule': return 'Manajemen Jadwal';
      case 'document': return 'Repositori Dokumen Digital';
      case 'dashboard': return 'Beranda';
      case 'settings': return 'Pengaturan';
      default: return activeTab;
    }
  };

  return (
    <header className="h-16 border-b border-gray-100 flex items-center justify-between px-4 md:px-8 bg-white sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 hover:bg-gray-100 rounded" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <h2 className="text-lg font-semibold capitalize text-gray-700">
          {getPageTitle()}
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end hidden sm:flex">
          <span className="text-xs font-bold text-gray-800">Admin HUREMA</span>
          <span className="text-[10px] text-gray-400 font-medium">Administrator</span>
        </div>
        <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#006E62] font-bold">
          AD
        </div>
      </div>
    </header>
  );
};

export default Header;
