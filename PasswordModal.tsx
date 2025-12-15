import React, { useState } from 'react';
import { X, Lock, ChevronRight } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      onSuccess();
      setPassword('');
      setError(false);
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-500" />
            Área Restrita
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha de Administrador</label>
            <input
              type="password"
              autoFocus
              className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 transition-all ${error ? 'border-rose-500 focus:ring-rose-500/50' : 'border-slate-700 focus:ring-cyan-500/50'}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if(error) setError(false);
              }}
            />
            {error && <p className="text-rose-500 text-xs mt-1 font-bold">Senha incorreta.</p>}
          </div>
          
          <button 
            type="submit"
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-lg shadow-lg shadow-rose-900/20 transition-all flex items-center justify-center gap-2"
          >
            Acessar Admin <ChevronRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordModal;