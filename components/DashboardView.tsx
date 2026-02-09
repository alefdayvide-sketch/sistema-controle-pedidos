
import React, { useState, useMemo } from 'react';
import { Container, ContainerItem } from '../types';
import { 
  BarChart3, 
  ChevronLeft, 
  ChevronRight,
  Package, 
  CheckCircle2, 
  TrendingUp,
  Scale,
  AlertTriangle,
  Layers,
  Calculator,
  Printer
} from 'lucide-react';

interface DashboardViewProps {
  containers: Container[];
  onBack: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ containers, onBack }) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonthNum, setSelectedMonthNum] = useState<number>(now.getMonth() + 1);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');

  const normalizeName = (name: string) => name.trim().toUpperCase();

  // Função auxiliar para formatar números no padrão brasileiro (1.234,567)
  const formatNumber = (val: number, decimals: number = 3) => {
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const calculateVolumeFromDesc = (item: ContainerItem): number => {
    if (item.m3) {
      const manualM3 = parseFloat(String(item.m3).replace(',', '.'));
      if (!isNaN(manualM3)) return manualM3;
    }
    const regex = /(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+(?:[.,]\d+)?)/;
    const match = item.desc.match(regex);
    if (match) {
      const d1 = parseFloat(match[1].replace(',', '.')) / 1000;
      const d2 = parseFloat(match[2].replace(',', '.')) / 1000;
      const d3 = parseFloat(match[3].replace(',', '.')) / 1000;
      const qtd = parseFloat(item.real || item.qtd) || 0;
      return d1 * d2 * d3 * qtd;
    }
    return 0;
  };

  const suppliers = useMemo(() => {
    const list = Array.from(new Set(containers.map(c => c.supplier))).filter(Boolean).sort();
    if (list.length > 0 && !selectedSupplier) setSelectedSupplier(list[0]);
    return list;
  }, [containers, selectedSupplier]);

  const supplierData = useMemo(() => {
    if (!selectedSupplier) return [];
    return containers.filter(c => {
      const dateStr = c.date_start || c.date_pickup || '';
      if (!dateStr) return false;
      
      let y, m;
      if (dateStr.includes('-')) {
        [y, m] = dateStr.split('-');
      } else if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        y = parts[2];
        m = parts[1];
      } else {
        return false;
      }
      
      return c.supplier === selectedSupplier && parseInt(y) === selectedYear && parseInt(m) === selectedMonthNum;
    });
  }, [containers, selectedSupplier, selectedYear, selectedMonthNum]);

  const stats = useMemo(() => {
    const plannedItemsMap: Record<string, { requested: number, shipped: number, name: string, unitM3: number }> = {};
    const outsideItems: (ContainerItem & { calculatedM3: number })[] = [];
    
    supplierData.forEach(c => {
      c.items?.filter(i => !i.isExtra).forEach(item => {
        const key = normalizeName(item.desc);
        if (!plannedItemsMap[key]) {
          const unitVol = calculateVolumeFromDesc({ ...item, qtd: '1', real: '1' });
          plannedItemsMap[key] = { requested: 0, shipped: 0, name: item.desc, unitM3: unitVol };
        }
        plannedItemsMap[key].requested += parseFloat(item.qtd) || 0;
      });
    });

    supplierData.forEach(c => {
      c.items?.forEach(item => {
        const key = normalizeName(item.desc);
        const shippedQty = parseFloat(item.real || '0');
        
        if (plannedItemsMap[key]) {
          plannedItemsMap[key].shipped += shippedQty;
        } else if (shippedQty > 0) {
          const m3 = calculateVolumeFromDesc(item);
          outsideItems.push({ ...item, calculatedM3: m3 });
        }
      });
    });

    let surplusM3 = 0;
    let outsideM3 = 0;

    const plannedResults = Object.values(plannedItemsMap).map(item => {
      const diff = item.shipped - item.requested;
      if (diff > 0) {
        surplusM3 += diff * item.unitM3;
      }
      return { ...item, diff };
    });

    outsideItems.forEach(item => {
      outsideM3 += item.calculatedM3;
    });

    return { 
      plannedList: plannedResults,
      outsideList: outsideItems,
      surplusM3,
      outsideM3,
      totalImpactM3: surplusM3 + outsideM3,
      totalOrders: supplierData.length 
    };
  }, [supplierData]);

  const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

  const handlePrint = () => {
    window.print();
  };

  const changeYear = (delta: number) => {
    setSelectedYear(prev => prev + delta);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden font-sans">
      <style>{`
        @media print {
          /* Força a fidelidade de cores para bordas e fontes */
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            color-adjust: exact !important;
          }

          .no-print { display: none !important; }
          
          /* RESET TOTAL DE FUNDOS PARA BRANCO */
          body, html, #root, .flex-1, .print-area, main, div, section, table, tr, td, th { 
            background: white !important; 
            background-color: white !important;
            color: black !important;
            box-shadow: none !important;
            height: auto !important;
            overflow: visible !important;
          }

          .print-area { 
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* CORES APENAS NOS TEXTOS E BORDAS */
          .text-emerald-500, .text-emerald-400 { color: #059669 !important; font-weight: 800 !important; } /* Verde */
          .text-amber-500, .text-amber-400 { color: #d97706 !important; font-weight: 800 !important; }   /* Amarelo/Âmbar */
          .text-rose-500, .text-rose-400 { color: #dc2626 !important; font-weight: 800 !important; }    /* Vermelho */
          .text-white, .text-slate-300, .text-slate-200 { color: #000 !important; }
          .text-slate-500, .text-slate-400, .text-slate-600 { color: #4b5563 !important; }

          /* BORDAS VISÍVEIS */
          .border, .border-slate-800, .border-slate-700, .border-slate-600 { border: 1px solid #e5e7eb !important; }
          .border-emerald-500, .border-emerald-500/20 { border: 1px solid #059669 !important; }
          .border-amber-500, .border-amber-500/20 { border: 1px solid #d97706 !important; }
          .border-rose-500, .border-rose-500/20 { border: 1px solid #dc2626 !important; }

          /* AJUSTE DE TABELA */
          table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #000 !important; margin-top: 10px; }
          th, td { border: 1px solid #000 !important; padding: 8px !important; }
          th { background-color: #f3f4f6 !important; font-weight: bold !important; color: #000 !important; }

          /* REMOVER ROUNDED E SOMBRAS */
          .rounded-3xl, .rounded-2xl, .rounded-xl, .rounded-lg { border-radius: 0 !important; }
          
          .grid { display: block !important; }
          .grid > div { margin-bottom: 15px; page-break-inside: avoid; border: 1px solid #ccc !important; padding: 10px !important; }
          
          /* Garantir que o impacto total não tenha fundo escuro */
          .bg-slate-900, .bg-slate-950, .bg-slate-950/30, .bg-slate-950/50, .bg-slate-900/50 { background: white !important; border: 1px solid #ccc !important; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header Compacto */}
      <div className="p-4 border-b border-slate-800/60 bg-[#020617] flex flex-col sm:flex-row items-center justify-between shrink-0 z-20 gap-4 sm:gap-0 no-print">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-all active:scale-90 group">
            <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-white" />
          </button>
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none">Indicadores</h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Acuracidade e Desperdício Logístico</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* SELETOR COMPACTO */}
          <div className="bg-[#0f172a]/40 p-2.5 rounded-3xl border border-slate-800/50 flex flex-col items-center min-w-[340px]">
            <div className="flex items-center justify-between w-full px-4 mb-1.5">
              <button onClick={() => changeYear(-1)} className="text-slate-600 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-black text-white tracking-[0.2em]">{selectedYear}</span>
              <button onClick={() => changeYear(1)} className="text-slate-600 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full">
              {months.map((m, idx) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonthNum(idx + 1)}
                  className={`text-[9px] font-black px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                    selectedMonthNum === idx + 1 
                    ? 'bg-[#0891b2] text-white shadow-lg' 
                    : 'bg-transparent text-slate-600 hover:text-slate-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handlePrint}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl transition-all border border-slate-700 shadow-lg active:scale-95"
            title="Imprimir Relatório"
          >
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden print-area">
        {/* Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 shrink-0 bg-slate-900/20 overflow-x-auto md:overflow-y-auto custom-scrollbar no-print">
          <div className="p-4 border-b border-slate-800 hidden md:block">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fornecedores Ativos</h3>
          </div>
          <div className="p-2 flex md:flex-col gap-1">
            {suppliers.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSupplier(s)}
                className={`whitespace-nowrap md:whitespace-normal px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 border ${selectedSupplier === s ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-inner' : 'text-slate-500 border-transparent hover:bg-slate-800'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${selectedSupplier === s ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700'}`} />
                <span className="truncate">{s}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Relatório Principal */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-32">
          {!selectedSupplier ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50 py-20 no-print">
              <Layers className="w-16 h-16 animate-pulse" />
              <p className="font-black uppercase text-xs tracking-widest">Selecione um fornecedor para visualizar o balanço</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-6xl mx-auto">
              
              <div className="hidden print:flex flex-col gap-1 mb-8 border-b-2 border-black pb-4">
                 <h1 className="text-2xl font-black uppercase">Relatório de Divergência Mensal</h1>
                 <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm font-bold uppercase">Fornecedor: <span className="font-black">{selectedSupplier}</span></p>
                      <p className="text-sm font-bold uppercase">Período: <span className="font-black">{months[selectedMonthNum-1]} / {selectedYear}</span></p>
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 italic">Relatório gerado em {new Date().toLocaleDateString('pt-BR')}</p>
                 </div>
              </div>

              {/* Métricas em Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-3xl relative overflow-hidden">
                  <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-amber-500/10 no-print" />
                  <p className="text-[10px] font-black text-amber-600 uppercase mb-3 flex items-center gap-2 tracking-widest">
                    <Scale className="w-3.5 h-3.5" /> Excedentes M³
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-mono font-black text-amber-400">{formatNumber(stats.surplusM3)}</p>
                    <span className="text-xs font-black text-amber-600 uppercase">m³</span>
                  </div>
                </div>

                <div className="bg-rose-500/5 border border-rose-500/20 p-5 rounded-3xl relative overflow-hidden">
                  <AlertTriangle className="absolute -right-4 -bottom-4 w-24 h-24 text-rose-500/10 no-print" />
                  <p className="text-[10px] font-black text-rose-600 uppercase mb-3 flex items-center gap-2 tracking-widest">
                    <Package className="w-3.5 h-3.5" /> Fora do Pedido M³
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-mono font-black text-rose-400">{formatNumber(stats.outsideM3)}</p>
                    <span className="text-xs font-black text-rose-600 uppercase">m³</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-700 p-5 rounded-3xl relative overflow-hidden">
                  <Calculator className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 no-print" />
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2 tracking-widest">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" /> Total Impacto M³
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-mono font-black text-white">{formatNumber(stats.totalImpactM3)}</p>
                    <span className="text-xs font-black text-slate-500 uppercase">m³</span>
                  </div>
                </div>
              </div>

              {/* Tabela de Balanço */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-slate-800 bg-slate-950/30">
                  <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Itens Planejados no Mês
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-500 uppercase font-black border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-5">Material Planejado</th>
                        <th className="px-6 py-5 text-center">Solicitado</th>
                        <th className="px-6 py-5 text-center">Embarcado</th>
                        <th className="px-6 py-5 text-center">Divergência</th>
                        <th className="px-6 py-5 text-right">Impacto M³</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {stats.plannedList.map((item, i) => {
                        const hasSurplus = item.diff > 1e-6; 
                        const hasDeficit = item.diff < -1e-6;
                        const impact = hasSurplus ? item.diff * item.unitM3 : 0;
                        
                        let diffColorClass = 'text-emerald-500'; 
                        if (hasSurplus) diffColorClass = 'text-amber-500'; 
                        if (hasDeficit) diffColorClass = 'text-rose-500'; 

                        return (
                          <tr key={i} className="hover:bg-slate-800/40 transition-colors group">
                            <td className="px-6 py-5">
                              <p className="font-black text-slate-300 uppercase tracking-tight group-hover:text-white transition-colors">{item.name}</p>
                              <p className="text-[9px] text-slate-600 mt-1 font-mono font-bold uppercase tracking-tighter">Unit: {formatNumber(item.unitM3, 4)} m³</p>
                            </td>
                            <td className="px-6 py-5 text-center font-mono text-slate-400 font-bold text-sm">{item.requested}</td>
                            <td className="px-6 py-5 text-center font-mono text-white font-black text-sm">{item.shipped}</td>
                            <td className={`px-6 py-5 text-center font-mono font-black text-sm ${diffColorClass}`}>
                              {item.diff > 0 ? `+${item.diff}` : item.diff}
                            </td>
                            <td className="px-6 py-5 text-right">
                              <p className={`font-mono font-black text-sm ${impact > 0 ? 'text-amber-500' : 'text-slate-800'}`}>
                                {impact > 0 ? formatNumber(impact) : "0,000"}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Itens Extras */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-slate-800 bg-slate-950/30">
                  <h3 className="text-sm font-black text-rose-500 flex items-center gap-2 uppercase tracking-tighter">
                    <AlertTriangle className="w-4 h-4" /> Itens Fora do Pedido (Extras)
                  </h3>
                </div>
                <div className="p-5 grid gap-3">
                  {stats.outsideList.map((ex, i) => (
                    <div key={i} className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-rose-500 uppercase tracking-tight">{ex.desc}</p>
                        <p className="text-[10px] bg-rose-500/10 text-rose-500 px-2.5 py-1 rounded-lg font-mono font-black uppercase inline-block mt-2">Qtde: {ex.real}</p>
                      </div>
                      <div className="w-full md:w-auto shrink-0 text-right">
                         <p className="text-[9px] font-black text-rose-500 uppercase mb-1">Impacto M³</p>
                         <p className="text-xl font-mono font-black text-rose-500 leading-none">{formatNumber(ex.calculatedM3, 4)}</p>
                      </div>
                    </div>
                  ))}
                  {stats.outsideList.length === 0 && <p className="text-center py-10 text-slate-600 font-bold uppercase text-[10px] italic">Nenhum item extra detectado no período</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
