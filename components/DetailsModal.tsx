
import React from 'react';
import { X, Package, Calendar, MapPin, Hash, Info, Box, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Container } from '../types';

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  container: Container | undefined;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "N/D";
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

const DetailsModal: React.FC<DetailsModalProps> = ({ isOpen, onClose, container }) => {
  if (!isOpen || !container) return null;

  const programmedItems = container.items?.filter(i => !i.isExtra) || [];
  const extraItems = container.items?.filter(i => i.isExtra) || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header Visual */}
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-6 border-b border-slate-800 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl border ${container.status === 'yard' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}>
              <Package className={`w-6 h-6 ${container.status === 'yard' ? 'text-emerald-400' : 'text-cyan-400'}`} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">{container.supplier}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded uppercase">{container.id}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  container.status === 'yard' ? 'bg-emerald-500/20 text-emerald-400' : 
                  container.status === 'transit' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {container.status === 'yard' ? 'Entregue' : container.status === 'transit' ? 'Em Trânsito' : 'Planejamento'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Nota Fiscal</p>
              <p className="text-sm font-mono font-bold text-slate-200">{container.nf || "PENDENTE"}</p>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Coleta</p>
              <p className="text-sm font-mono font-bold text-slate-200">{container.date_pickup ? formatDate(container.date_pickup) : "N/D"}</p>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {container.status === 'yard' ? 'Entrega' : 'Previsão'}</p>
              <p className="text-sm font-mono font-bold text-cyan-400">{container.date_arrival_forecast ? formatDate(container.date_arrival_forecast) : "N/D"}</p>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Info className="w-3 h-3" /> Prioridade</p>
              <p className={`text-sm font-bold ${container.priority === 'Alta' ? 'text-rose-400' : 'text-slate-400'}`}>{container.priority || "Normal"}</p>
            </div>
          </div>

          {/* Programmed Items */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Itens Programados
            </h3>
            <div className="grid gap-2">
              {programmedItems.map((item, idx) => (
                <div key={idx} className="bg-slate-800/30 border border-slate-700/50 p-4 rounded-2xl flex justify-between items-center group">
                  <div>
                    <p className="text-sm font-bold text-slate-100 mb-1">{item.desc}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Solicitado: <span className="text-slate-400 font-mono">{item.qtd}</span></p>
                  </div>
                  <div className="text-right bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                    <p className="text-[9px] font-bold text-cyan-500 uppercase mb-0.5">Embarcado</p>
                    <p className="text-lg font-mono font-black text-white leading-none">{item.real || "0"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extra Items */}
          {extraItems.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Materiais Extras (Fora do Pedido)
              </h3>
              <div className="grid gap-2">
                {extraItems.map((item, idx) => (
                  <div key={idx} className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-amber-100 mb-1">{item.desc}</p>
                      <p className="text-[10px] font-medium text-amber-500/60 italic">Adicionado manualmente no embarque</p>
                    </div>
                    <div className="text-right bg-amber-950/30 px-4 py-2 rounded-xl border border-amber-500/20">
                      <p className="text-[9px] font-bold text-amber-500 uppercase mb-0.5">Quantidade</p>
                      <p className="text-lg font-mono font-black text-amber-400 leading-none">{item.real}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-950/50 border-t border-slate-800 shrink-0">
          <button 
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-2xl transition-all uppercase text-xs tracking-widest"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailsModal;
