import React, { useState } from 'react';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { BRAND_ASSETS } from '../../assets';
import { verifyAccessPassword } from '../../services/AccessService';
import { showXeenapsToast } from '../../utils/toastUtils';

interface LoginViewProps {
  onLogin: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      showXeenapsToast('warning', 'Please enter a password.');
      return;
    }

    setIsVerifying(true);
    const isValid = await verifyAccessPassword(password);
    setIsVerifying(false);

    if (isValid) {
      localStorage.setItem('xeenaps_access_token', 'true');
      showXeenapsToast('success', 'Access granted.');
      onLogin();
    } else {
      showXeenapsToast('error', 'Incorrect password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-8 relative overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-[#FED400]" />

        <div className="flex flex-col items-center justify-center space-y-4 pt-4">
          <img src={BRAND_ASSETS.LOGO_ICON} alt="Xeenaps" className="w-20 h-20 animate-xeenaps-bounce drop-shadow" />
          <div className="text-center">
            <h1 className="text-2xl font-black text-[#004A74] tracking-tight">XEENAPS SECURE</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">Personal Knowledge Management</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#004A74]">Access Key</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 lg:py-4 border-2 border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-[#FED400] transition-all bg-gray-50 focus:bg-white"
                placeholder="Enter private password..."
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full flex items-center justify-center gap-2 py-3 lg:py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-black text-[#004A74] bg-[#FED400] hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FED400] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {isVerifying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Unlock Workspace
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;
