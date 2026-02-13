
import React, { useState } from 'react';
import { MapPin, LayoutDashboard, Settings, Menu, X } from 'lucide-react';
import LocationMain from './modules/location/LocationMain';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'location' | 'settings'>('location');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavItem = ({ id, icon: Icon, label }: { id: any, icon: any, label: string }) => (
    <button
      onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
      className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 w-full ${
        activeTab === id 
          ? 'bg-[#006E62] text-white shadow-md' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex bg-white text-gray-800">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-100 p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 bg-[#006E62] rounded flex items-center justify-center text-white font-bold italic">H</div>
          <h1 className="text-xl font-bold tracking-tight text-[#006E62]">HUREMA</h1>
        </div>
        
        <nav className="flex-1 space-y-1">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Beranda" />
          <NavItem id="location" icon={MapPin} label="Data Lokasi" />
          <NavItem id="settings" icon={Settings} label="Pengaturan" />
        </nav>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      {/* Sidebar Mobile */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#006E62] rounded flex items-center justify-center text-white font-bold italic">H</div>
              <h1 className="text-xl font-bold text-[#006E62]">HUREMA</h1>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
          </div>
          <nav className="space-y-1">
            <NavItem id="dashboard" icon={LayoutDashboard} label="Beranda" />
            <NavItem id="location" icon={MapPin} label="Data Lokasi" />
            <NavItem id="settings" icon={Settings} label="Pengaturan" />
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <header className="h-16 border-b border-gray-100 flex items-center justify-between px-4 md:px-8 bg-white sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 hover:bg-gray-100 rounded" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-semibold capitalize text-gray-700">
              {activeTab === 'location' ? 'Manajemen Lokasi' : activeTab}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300"></div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          {activeTab === 'location' ? (
            <LocationMain />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>Modul "{activeTab}" sedang dalam pengembangan.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
