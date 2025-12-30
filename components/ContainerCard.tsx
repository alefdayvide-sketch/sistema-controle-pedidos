
import React from 'react';
import { 
  Calendar, 
  Trash2, 
  Edit,
  AlertTriangle,
  CheckCircle2,
  Flag,
  Clock,
  Box,
  Zap,
  ChevronRight,
  Ship
} from 'lucide-react';
import { Container } from '../types';

interface ContainerCardProps {
  container: Container;
  onDelete: (id: string) => void;
  onRegisterShipment: (id: string) => void;
  onReceive: (id: string) => void;
  onViewDetails: (id: string) => void; // Nova prop
  isAdmin?: boolean;
}

const getISOWeek = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const formatDateBR = (dateVal: any, showYear = false) => {
  if (!dateVal) return "N/D";
  const s = String(dateVal).split('T')[0].trim();
  if (s.includes('-')) {
    const [y, m, d] = s.split('-');
    return showYear ? `${d}/${m}/${y.slice(2)}` : `${d}/${m}`;
  }
  if (s.includes('/')) {
     const parts = s.split('/');
     if (parts.length === 3) return showYear ? `${parts[0]}/${parts[1]}/${parts[2].slice(2)}` : `${parts[0]}/${parts[1]}`;
  }
  return s; 
};

const parseDate = (dateStr: any) => {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (s.includes('-')) {
    const clean = s.split('T')[0];
    const parts = clean.split('-');
    if(parts.length >= 3) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
  }
  if (s.includes('/')) {
    const parts = s.split('/');
    if(parts.length >= 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
  }
  return null;
};

const ContainerCard: React.FC<ContainerCardProps> = ({ 
  container, 
  onDelete, 
  onRegisterShipment, 
  onReceive,
  onViewDetails,
  isAdmin 
}) => {
  const isTransit = container.status === 'transit';
  const isDelivered = container.status === 'yard';
  const isPlanning = container.status === 'planning';
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const start = parseDate(container.date_start || container['Data Inicio']);
  const end = parseDate(container.date_end || container['Data Fim']);
  const pickupDate = parseDate(container.date_pickup || container['Data Coleta']);
  const arrivalDate = container.date_arrival_forecast || container['Data Chegada'];

  let deviationType: 'none' | 'early' | 'late' = 'none';
  if ((isTransit || isDelivered) && pickupDate && start && end) {
      const pTime = new Date(pickupDate).setHours(0,0,0,0);
      const sTime = new Date(start).setHours(0,0,0,0);
      const eTime = new Date(end).setHours(0,0,0,0);
      if (pTime > eTime) deviationType = 'late';
      else if (pTime < sTime) deviationType = 'early';
  } else if (isPlanning && end && today.getTime() > end.getTime()) {
      deviationType = 'late';
  }

  const relevantDateForWeek = isPlanning ? end : pickupDate;
  const isCollectWeek = relevantDateForWeek && 
    getISOWeek(relevantDateForWeek) === getISOWeek(today) && 
    relevantDateForWeek.getFullYear() === today.getFullYear() &&
    !isDelivered;

  let wrapperGradient = '';
  let shadowClass = '';

  if (deviationType === 'late') {
    wrapperGradient = 'bg-gradient-to-r from-rose-950 via-rose-600 to-rose-950 animate-border-flow';
    shadowClass = 'shadow-[0_0_15px_rgba(225,29,72,0.15)]';
  } else if (deviationType === 'early') {
    wrapperGradient = 'bg-gradient-to-r from-indigo-950 via-indigo-500 to-indigo-950 animate-border-flow';
    shadowClass = 'shadow-[0_0_15px_rgba(99,102,241,0.15)]';
  } else if (isTransit) {
    wrapperGradient = 'bg-cyan-900/60';
    shadowClass = 'shadow-[0_0_10px_rgba(6,182,212,0.1)]';
  } else if (isDelivered) {
    wrapperGradient = 'bg-emerald-900/40';
    shadowClass = 'shadow-[0_0_10px_rgba(16,185,129,0.1)]';
  } else {
    wrapperGradient = 'bg-slate-800';
  }

  const supplierUpper = container.supplier?.toUpperCase() || '';
  let headerStyle = {
    bg: 'bg-transparent', text: 'text-slate-100', subText: 'text-slate-500', border: 'border-b border-transparent'
  };

  if (supplierUpper.includes('CAVACOS')) {
    headerStyle = { bg: 'bg-amber-500/10', text: 'text-amber-400', subText: 'text-amber-500/60', border: 'border-b border-amber-500/20' };
  } else if (supplierUpper.includes('VMAD')) {
    headerStyle = { bg: 'bg-emerald-500/10', text: 'text-emerald-400', subText: 'text-emerald-500/60', border: 'border-b border-emerald-500/20' };
  }

  const programmedItems = container.items?.filter(i => !i.isExtra && i.desc && i.desc.trim() !== '') || [];
  const extraItemsCount = container.items?.filter(i => i.isExtra).length || 0;

  return (
    <div 
      className={`relative rounded-xl transition-all duration-300 group ${shadowClass} p-[1.5px] overflow-visible cursor-pointer active:scale-[0.98]`}
      onClick={() => onViewDetails(container.id)}
    >
        <div className={`absolute inset-0 ${wrapperGradient} rounded-xl`} style={{ zIndex: 0 }} />
        <div className="relative z-10 flex flex-col w-full bg-slate-900 rounded-[10px] overflow-hidden">
            <div className={`px-3 py-2.5 flex justify-between items-start ${headerStyle.bg} ${headerStyle.border}`}>
                <div className="overflow-hidden">
                    <h3 className={`text-sm font-extrabold uppercase tracking-wide leading-tight truncate ${headerStyle.text}`} title={container.supplier}>{container.supplier}</h3>
                    <span className={`text-[10px] font-mono font-bold block mt-0.5 truncate ${headerStyle.subText}`} title={container.id}>{container.id}</span>
                </div>
                <div className="shrink-0 pl-2 flex flex-col items-end gap-1">
                    {deviationType === 'late' && <div className="flex items-center gap-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold animate-pulse"><AlertTriangle className="w-2.5 h-2.5" /> ATRASADO</div>}
                    {deviationType === 'early' && <div className="flex items-center gap-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold"><Zap className="w-2.5 h-2.5" /> ANTECIPADO</div>}
                    {isCollectWeek && deviationType === 'none' && <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold"><Clock className="w-2.5 h-2.5" /> NA SEMANA</div>}
                </div>
            </div>

            <div className="px-3 pt-1.5 pb-2 flex-1 flex flex-col gap-1.5">
                <div className="space-y-1">
                    {programmedItems.map((item, idx) => {
                        const hasReal = !!item.real;
                        return (
                            <div key={idx} className={`p-2 rounded border flex flex-col gap-1 transition-colors ${hasReal ? 'bg-amber-400/05 border-amber-500/20' : 'bg-slate-950/50 border-slate-800/40'}`}>
                                <div className="flex items-start gap-1.5">
                                    <Box className={`w-3 h-3 mt-0.5 shrink-0 ${hasReal ? 'text-amber-500/50' : 'text-slate-600'}`} />
                                    <span className={`text-[11px] font-semibold leading-tight ${hasReal ? 'text-amber-100' : 'text-slate-300'}`}>{item.desc}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
                                    <div className="flex items-center gap-1"><span className="text-[8px] uppercase font-bold text-slate-500">Solicitado:</span><span className="text-[10px] font-mono text-slate-400">{item.qtd}</span></div>
                                    {hasReal && <div className="flex items-center gap-1"><span className="text-[8px] uppercase font-bold text-amber-500/70">{isDelivered ? "Real:" : "Emb:"}</span><span className="text-[10px] font-mono font-bold text-amber-300">{item.real}</span></div>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Resumo de Itens Extras - Visual Simplificado */}
                {extraItemsCount > 0 && (
                    <div className="flex items-center justify-between px-2 py-1.5 bg-amber-500/5 border border-amber-500/20 rounded-lg group/extra transition-all hover:bg-amber-500/10">
                        <div className="flex items-center gap-2">
                           <AlertTriangle className="w-3 h-3 text-amber-500" />
                           <span className="text-[10px] font-bold text-amber-400 uppercase tracking-tight">+{extraItemsCount} Mat. Extras</span>
                        </div>
                        <span className="text-[9px] font-bold text-amber-600 uppercase flex items-center gap-0.5">Detalhes <ChevronRight className="w-2.5 h-2.5" /></span>
                    </div>
                )}
            </div>

            <div className="px-3 pb-2 mt-auto">
                <div className="pt-1.5 flex flex-col gap-1 border-t border-slate-800/50 bg-slate-900">
                    <div className="flex items-end justify-between">
                        <div className="flex-1 min-0 pr-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="flex items-center gap-1 text-[10px] whitespace-nowrap">
                                    <Calendar className={`w-3 h-3 ${deviationType === 'late' ? 'text-rose-500' : 'text-slate-500'}`} />
                                    <span className="font-bold text-slate-600 uppercase tracking-tight">{isTransit || isDelivered ? "Coleta:" : "Prazo:"}</span>
                                    <span className={`font-mono font-bold ${deviationType === 'late' ? 'text-rose-400' : 'text-slate-400'}`}>{isTransit || isDelivered ? formatDateBR(container.date_pickup || container['Data Coleta']) : formatDateBR(container.date_end || container['Data Fim'])}</span>
                                </div>
                                <span className="text-slate-800 text-[9px]">|</span>
                                <div className="flex items-center gap-1 text-[10px] whitespace-nowrap"><span className="font-bold text-slate-600 uppercase tracking-tight">NF:</span><span className="font-mono text-slate-400">{container.nf || "-"}</span></div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                            {isAdmin && (
                                <>
                                    {isPlanning && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); onRegisterShipment(container.id); }} 
                                        className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[9px] font-bold px-2.5 py-1.5 rounded shadow-lg shadow-cyan-900/20 transition-all active:translate-y-0.5"
                                      >
                                        <Ship className="w-3.5 h-3.5" /><span>EMBARCAR</span>
                                      </button>
                                    )}
                                    {isTransit && (
                                      <button onClick={(e) => { e.stopPropagation(); onRegisterShipment(container.id); }} className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors">
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {(isPlanning || isTransit) && (
                                      <button onClick={(e) => { e.stopPropagation(); onDelete(container.id); }} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                </>
                            )}
                            {isAdmin && isTransit && (
                                <button onClick={(e) => { e.stopPropagation(); onReceive(container.id); }} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold px-2.5 py-1.5 rounded shadow-lg shadow-emerald-900/20 transition-all active:translate-y-0.5 ml-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /><span>RECEBER</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ContainerCard;
