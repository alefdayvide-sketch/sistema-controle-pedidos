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
  Zap
} from 'lucide-react';
import { Container } from '../types';

interface ContainerCardProps {
  container: Container;
  onDelete: (id: string) => void;
  onRegisterShipment: (id: string) => void;
  onReceive: (id: string) => void;
  isAdmin?: boolean;
}

// Helper para formatar data BR (dd/mm)
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

// Helper para parse seguro de data
const parseDate = (dateStr: any) => {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (s.includes('-')) {
    const clean = s.split('T')[0];
    const parts = clean.split('-');
    if(parts.length >= 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    }
  }
  if (s.includes('/')) {
    const parts = s.split('/');
    if(parts.length >= 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
    }
  }
  return null;
};

const ContainerCard: React.FC<ContainerCardProps> = ({ 
  container, 
  onDelete, 
  onRegisterShipment, 
  onReceive,
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

  // Lógica de Status
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

  // Styles
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
    bg: 'bg-transparent',
    text: 'text-slate-100',
    subText: 'text-slate-500',
    border: 'border-b border-transparent'
  };

  if (supplierUpper.includes('CAVACOS')) {
    headerStyle = { bg: 'bg-amber-500/10', text: 'text-amber-400', subText: 'text-amber-500/60', border: 'border-b border-amber-500/20' };
  } else if (supplierUpper.includes('VMAD')) {
    headerStyle = { bg: 'bg-emerald-500/10', text: 'text-emerald-400', subText: 'text-emerald-500/60', border: 'border-b border-emerald-500/20' };
  }

  const validItems = container.items?.filter(i => i.desc && i.desc.trim() !== '') || [];
  const displayItems = validItems.slice(0, 3);
  
  // Handlers Seguros
  const handleEditClick = (e: React.MouseEvent) => {
      if (!isAdmin) return;
      onRegisterShipment(container.id);
  };

  const handleBtnReceive = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onReceive(container.id);
  };

  const handleBtnDelete = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete(container.id);
  };

  const handleBtnEdit = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onRegisterShipment(container.id);
  };

  return (
    <div className={`relative rounded-xl transition-all duration-300 group ${shadowClass} p-[1.5px] overflow-visible`}>
        {/* Background Layer */}
        <div className={`absolute inset-0 ${wrapperGradient} rounded-xl`} style={{ zIndex: 0 }} />

        {/* Content Layer */}
        <div className="relative z-10 flex flex-col w-full bg-slate-900 rounded-[10px] overflow-hidden">
            
            {/* ZONA 1: Cabeçalho */}
            <div 
                onClick={handleEditClick}
                className={`px-3 py-2.5 flex justify-between items-start ${headerStyle.bg} ${headerStyle.border} ${isAdmin ? 'cursor-pointer' : ''}`}
            >
                <div className="overflow-hidden">
                    <h3 className={`text-sm font-extrabold uppercase tracking-wide leading-tight truncate ${headerStyle.text}`} title={container.supplier}>
                        {container.supplier}
                    </h3>
                    <span className={`text-[10px] font-mono font-bold block mt-0.5 truncate ${headerStyle.subText}`} title={container.id}>
                        {container.id}
                    </span>
                </div>
                
                <div className="shrink-0 pl-2 flex flex-col items-end gap-1">
                    {deviationType === 'late' && (
                        <div className="flex items-center gap-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5" /> ATRASADO
                        </div>
                    )}
                    {deviationType === 'early' && (
                        <div className="flex items-center gap-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold">
                            <Zap className="w-2.5 h-2.5" /> ANTECIPADO
                        </div>
                    )}
                </div>
            </div>

            {/* ZONA 2: Corpo / Lista de Itens */}
            <div 
                onClick={handleEditClick}
                className={`px-3 pt-1.5 pb-2 flex-1 flex flex-col gap-2 ${isAdmin ? 'cursor-pointer' : ''}`}
            >
                <div className="space-y-1.5">
                    {displayItems.length > 0 ? displayItems.map((item, idx) => {
                        const hasReal = !!item.real;
                        return (
                            <div key={idx} className={`
                                p-2 rounded border flex flex-col gap-1.5 transition-colors
                                ${hasReal ? 'bg-amber-400/05 border-amber-500/30' : 'bg-slate-950/50 border-slate-800/50'}
                            `}>
                                <div className="flex items-start gap-1.5">
                                    <Box className={`w-3 h-3 mt-0.5 shrink-0 ${hasReal ? 'text-amber-500/50' : 'text-slate-600'}`} />
                                    <span className={`text-xs font-semibold leading-tight ${hasReal ? 'text-amber-100' : 'text-slate-200'}`}>
                                        {item.desc}
                                    </span>
                                </div>
                                <div className={`flex items-center justify-between pt-1.5 border-t ${hasReal ? 'border-amber-500/10' : 'border-slate-800/50'}`}>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] uppercase font-bold text-slate-500">Solicitado:</span>
                                        <span className="text-[10px] font-mono font-medium text-slate-300 bg-slate-800 px-1 py-0.5 rounded">{item.qtd || '-'}</span>
                                    </div>
                                    {hasReal && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] uppercase font-bold text-amber-500/80">{isDelivered ? "Real:" : "Embarcado:"}</span>
                                            <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-900/20 border border-amber-500/20 px-1 py-0.5 rounded">{item.real}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-1.5 text-slate-600 text-[10px] italic border border-dashed border-slate-800 rounded bg-slate-950/30">
                            Sem itens
                        </div>
                    )}
                </div>
            </div>

            {/* ZONA 3: Rodapé */}
            <div className="px-3 pb-2 mt-auto">
                <div className="pt-1.5 flex flex-col gap-1 border-t border-slate-800/50 bg-slate-900">
                    
                    <div className="flex items-end justify-between">
                        <div 
                            onClick={handleEditClick} 
                            className={`flex-1 min-w-0 pr-1 ${isAdmin ? 'cursor-pointer' : ''}`}
                        >
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="flex items-center gap-1 text-[10px] whitespace-nowrap">
                                    <Calendar className={`w-3 h-3 ${deviationType === 'late' ? 'text-rose-500' : 'text-slate-500'}`} />
                                    <span className="font-bold text-slate-600 uppercase tracking-tight">
                                        {isTransit || isDelivered ? "Coleta:" : "Prazo:"}
                                    </span>
                                    <span className={`font-mono font-bold ${deviationType === 'late' ? 'text-rose-400' : 'text-slate-400'}`}>
                                        {isTransit || isDelivered 
                                        ? formatDateBR(container.date_pickup || container['Data Coleta'])
                                        : formatDateBR(container.date_end || container['Data Fim'])
                                        }
                                    </span>
                                </div>
                                <span className="text-slate-800 text-[9px]">|</span>
                                <div className="flex items-center gap-1 text-[10px] whitespace-nowrap">
                                    <span className="font-bold text-slate-600 uppercase tracking-tight">NF:</span>
                                    <span className="font-mono text-slate-400">{container.nf || "-"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Botões de Ação */}
                        {isAdmin && (
                            <div 
                                className="flex items-center gap-1.5 shrink-0 relative" 
                                style={{ zIndex: 100 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center gap-0.5">
                                    {isTransit && (
                                        <button 
                                        type="button"
                                        onClick={handleBtnEdit}
                                        className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                                        title="Editar"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {(isPlanning || isTransit) && (
                                        <button 
                                            type="button"
                                            onClick={handleBtnDelete}
                                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                
                                {isTransit && (
                                    <button 
                                    type="button"
                                    onClick={handleBtnReceive}
                                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold px-3 py-1.5 rounded shadow-lg shadow-emerald-900/20 transition-all active:translate-y-0.5 ml-0.5 cursor-pointer relative"
                                    title="Receber"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>RECEBER</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Linha adicional para datas especiais (Recebimento/Previsão) */}
                    <div className="flex items-center gap-2">
                        {isTransit && arrivalDate && (
                            <div className="flex items-center gap-1 text-[10px] text-cyan-400 whitespace-nowrap">
                                <Flag className="w-3 h-3" />
                                <span className="font-bold text-cyan-600/70 uppercase tracking-tight">Prev:</span>
                                <span className="font-mono font-bold">{formatDateBR(arrivalDate)}</span>
                            </div>
                        )}
                        {isDelivered && arrivalDate && (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-400 whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span className="font-bold text-emerald-600/70 uppercase tracking-tight">Recebido:</span>
                                <span className="font-mono font-bold">{formatDateBR(arrivalDate)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ContainerCard;