import React, { useState, useMemo } from 'react';
import { Container, ContainerItem } from '../types';
import { 
  BarChart3, 
  ChevronLeft, 
  Calendar, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  User,
  TrendingUp,
  Scale,
  Info
} from 'lucide-react';

interface DashboardViewProps {
  containers: Container[];
  onBack: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ containers, onBack }) => {
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Função para tentar extrair volume da descrição (ex: 1050x90x40)
  const calculateVolumeFromDesc = (item: ContainerItem): number => {
    // Se o m3 já foi informado manualmente, usamos ele
    if (item.m3) {
      const manualM3 = parseFloat(item.m3.replace(',', '.'));
      if (!isNaN(manualM3)) return manualM3;
    }

    // Tenta encontrar 3 números (dimensões) na descrição
    // Suporta: 1000x200x20, 1000*200*20, 1000 x 200 x 20
    // Melhorado para aceitar vírgula ou ponto: (\d+(?:[.,]\d+)?)
    const regex = /(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+(?:[.,]\d+)?)/;
    const match = item.desc.match(regex);

    if (match) {
      const d1 = parseFloat(match[1].replace(',', '.')) / 1000; // mm -> m
      const d2 = parseFloat(match[2].replace(',', '.')) / 1000;
      const d3 = parseFloat(match[3].replace(',', '.')) / 1000;
      const qtd = parseFloat(item.qtd) || 0;
      return d1 * d2 * d3 * qtd;
    }

    return 0;
  };

  const suppliers = useMemo(() => {
    const list = Array.from(new Set(containers.map(c => c.supplier))).filter(Boolean);
    if (list.length > 0 && !selectedSupplier) setSelectedSupplier(list[0]);
    return list;
  }, [containers]);

  const supplierData = useMemo(() => {
    if (!selectedSupplier) return [];
    
    return containers.filter(c => {
      const dateStr = c.date_start || c.date_pickup || '';
      if (!dateStr) return false;
      const [y, m] = dateStr.split('-');
      return c.supplier === selectedSupplier && `${y}-${m}` === selectedMonth;
    });
  }, [containers, selectedSupplier, selectedMonth]);

  const stats = useMemo(() => {
    const summary: Record<string, { requested: number, shipped: number, name: string }> = {};
    const extraItems: (ContainerItem & { calculatedM3: number })[] = [];
    let totalExtraM3 = 0;

    supplierData.forEach(c => {
      c.items?.forEach(item => {
        if (item.isExtra) {
          const m3 = calculateVolumeFromDesc(item);
          extraItems.push({ ...item, calculatedM3: m3 });
          totalExtraM3 += m3;
        } else {
          const req = parseFloat(item.qtd) || 0;
          const real = parseFloat(item.real) || 0;
          if (!summary[item.desc]) {
            summary[item.desc] = { requested: 0, shipped: 0, name: item.desc };
          }
          summary[item.desc].requested += req;
          summary[item.desc].shipped += real;
        }
      });
    });

    return { 
      items: Object.values(summary),
      extras: extraItems,
      totalExtraM3,
      totalOrders: supplierData.length 
    };
  }, [supplierData]);

  const formatMonth = (m: string) => {
    const [y, mm] = m.split('-');
    const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    return `${months[parseInt(mm) - 1]} / ${y}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" /> Indicadores de Performance
            </h2>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Acuracidade e Desperdício Logístico</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <input 
            type="month" 
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white [color-scheme:dark]"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="w-full md:w-64 border-r border-slate-800 overflow-y-auto shrink-0 bg-slate-900/20 custom-scrollbar">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase">Lista de Fornecedores</h3>
          </div>
          <div className="p-2 space-y-1">
            {suppliers.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSupplier(s)}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${selectedSupplier === s ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:bg-slate-800'}`}
              >
                <User className="w-4 h-4" />
                <span className="truncate">{s}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar pb-32">
          {!selectedSupplier ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
              <Package className="w-16 h-16" />
              <p className="font-bold uppercase text-sm">Selecione um fornecedor para análise</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
                  <Package className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Pedidos no Mês</p>
                  <p className="text-3xl font-mono font-bold text-white">{stats.totalOrders}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Referência</p>
                  <p className="text-lg font-bold text-cyan-400">{formatMonth(selectedMonth)}</p>
                  <p className="text-[10px] text-slate-600 font-medium mt-1 uppercase">Mês de Competência</p>
                </div>
                <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-2xl relative overflow-hidden group">
                   <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-rose-500/5 group-hover:text-rose-500/10 transition-colors" />
                  <p className="text-[10px] font-bold text-rose-500/60 uppercase mb-2">Volume Fora do Pedido</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-mono font-bold text-rose-400">{stats.totalExtraM3.toFixed(3)}</p>
                    <span className="text-xs font-bold text-rose-600 uppercase">m³ extras</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-slate-800 bg-slate-950/30">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Acuracidade de Itens Programados
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-500 uppercase font-bold border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Material</th>
                        <th className="px-4 py-3 text-center">Solicitado</th>
                        <th className="px-4 py-3 text-center">Embarcado</th>
                        <th className="px-4 py-3 text-center">Diferença</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {stats.items.map((item, i) => {
                        const diff = item.shipped - item.requested;
                        const status = diff === 0 ? 'CORRETO' : diff > 0 ? 'EXCESSO' : 'FALTA';
                        const colorClass = diff === 0 ? 'text-emerald-400' : diff > 0 ? 'text-amber-400' : 'text-rose-400';
                        
                        return (
                          <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-4 font-bold text-slate-300">{item.name}</td>
                            <td className="px-4 py-4 text-center font-mono text-slate-500">{item.requested}</td>
                            <td className="px-4 py-4 text-center font-mono text-white">{item.shipped}</td>
                            <td className={`px-4 py-4 text-center font-mono font-bold ${colorClass}`}>
                              {diff > 0 ? `+${diff}` : diff}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${diff === 0 ? 'bg-emerald-500/10 text-emerald-500' : diff > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {stats.items.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-600 italic">Nenhum dado para o período selecionado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Detalhamento de Itens Extras
                  </h3>
                  <div className="flex items-center gap-2 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                    <Scale className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-rose-400 text-[10px] font-bold uppercase">Volume Total: {stats.totalExtraM3.toFixed(3)} m³</span>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  {stats.extras.map((ex, i) => (
                    <div key={i} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group hover:border-rose-500/30 transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">{ex.desc}</p>
                        <div className="flex items-center gap-3 mt-2">
                           <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">QTD: {ex.qtd} un</span>
                           <span className="text-slate-700">|</span>
                           <span className="text-[10px] text-slate-500 italic">Material não solicitado pelo sistema</span>
                        </div>
                      </div>
                      
                      <div className="shrink-0 flex items-center gap-4 bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <div className="text-right border-r border-slate-800 pr-4">
                           <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">M³ Unitário</p>
                           <p className="text-xs font-mono font-bold text-slate-400">{(ex.calculatedM3 / (parseFloat(ex.qtd) || 1)).toFixed(6)} m³</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-bold text-rose-500/70 uppercase mb-0.5">Subtotal Desperdício</p>
                           <p className="text-lg font-mono font-bold text-rose-400">{ex.calculatedM3.toFixed(4)} <span className="text-[10px] text-slate-600 font-bold">m³</span></p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {stats.extras.length === 0 && (
                    <div className="text-center py-10 flex flex-col items-center gap-2 opacity-30">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      <p className="text-xs font-bold text-slate-400 uppercase">Excelente! Nenhuma divergência extra detectada.</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-cyan-500/5 border border-cyan-500/10 p-4 rounded-xl flex items-start gap-3">
                 <Info className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                 <p className="text-[10px] text-cyan-400/80 font-medium italic leading-relaxed">
                   O cálculo automático de m³ utiliza o padrão BR (vírgula ou ponto decimal). O sistema busca na descrição 3 medidas numéricas (ex: 1000x200x20) e as converte para metros cúbicos multiplicando pela quantidade informada. Materiais sem dimensões no nome devem ter o m³ preenchido manualmente no ato do registro.
                 </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;